#!/usr/bin/env bash
# =============================================================================
# VeraFit AI — AWS deployment script
#
# Deploys the VeraFit single-container app (React SPA + FastAPI) to AWS.
#
# Two deployment targets (DEPLOY_TARGET):
#   1. fargate  (default) - Amazon ECS Fargate behind an ALB (fully managed)
#   2. ec2      - a Docker-ready EC2 instance running docker compose
#
# Usage:
#   ./scripts/deploy.sh                    # fargate deploy to AWS
#   DEPLOY_TARGET=ec2 ./scripts/deploy.sh
#   AWS_REGION=us-east-1 APP_NAME=verafit ./scripts/deploy.sh
#
# Prereqs:
#   - AWS CLI v2  (aws configure / SSO), docker, and an ECR-accessible account
#   - IAM perms: ecr, ecs, ec2, elbv2, logs, iam (for role creation)
# =============================================================================
set -euo pipefail

# ------------------------------------------------------------------ Config ---
APP_NAME="${APP_NAME:-verafit}"
AWS_REGION="${AWS_REGION:-us-east-1}"
DEPLOY_TARGET="${DEPLOY_TARGET:-fargate}"
ECR_REPO_NAME="${ECR_REPO_NAME:-${APP_NAME}}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ECS_CLUSTER="${ECS_CLUSTER:-${APP_NAME}-cluster}"
ECS_SERVICE="${ECS_SERVICE:-${APP_NAME}-service}"
TASK_FAMILY="${TASK_FAMILY:-${APP_NAME}-task}"
ALB_NAME="${ALB_NAME:-${APP_NAME}-alb}"
TG_NAME="${TG_NAME:-${APP_NAME}-tg}"
SG_NAME="${SG_NAME:-${APP_NAME}-sg}"
EC2_INSTANCE_TYPE="${EC2_INSTANCE_TYPE:-t3.medium}"
EC2_KEY_NAME="${EC2_KEY_NAME:-}"
DOCKER_IMAGE="${APP_NAME}:${IMAGE_TAG}"
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_IMAGE="${ECR_URI}/${ECR_REPO_NAME}:${IMAGE_TAG}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

log()  { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[deploy][error]\033[0m %s\n' "$*" >&2; exit 1; }
has()  { command -v "$1" >/dev/null 2>&1; }

# ---------------------------------------------------------------- Preflight --
has aws || die "AWS CLI v2 is required (https://aws.amazon.com/cli/)"
has docker || die "docker is required"
aws sts get-caller-identity >/dev/null 2>&1 || die "aws is not authenticated — run 'aws configure' or 'aws sso login'"

# ------------------------------------------------------- ECR: build & push --
build_and_push() {
  log "Building image ${DOCKER_IMAGE}"
  docker build \
    --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-/api/v1}" \
    -t "${DOCKER_IMAGE}" .

  log "Creating ECR repo ${ECR_REPO_NAME} (if missing)"
  aws ecr describe-repositories --repository-names "${ECR_REPO_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1 || \
    aws ecr create-repository --repository-name "${ECR_REPO_NAME}" --region "${AWS_REGION}" >/dev/null

  log "Authenticating docker to ECR"
  aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_URI}" >/dev/null

  log "Pushing ${ECR_IMAGE}"
  docker tag "${DOCKER_IMAGE}" "${ECR_IMAGE}"
  docker push "${ECR_IMAGE}"
}

# ------------------------------------------------------------- Fargate mode --
env_vars_task() {
  # Converts a .env line into an ECS "environment" entry.
  while IFS='=' read -r key value; do
    case "$key" in
      ''|\#*|DATABASE_URL|BACKEND_PORT|FRONTEND_PORT) continue ;;
    esac
    printf '{"name":"%s","value":"%s"},' "$key" "${value//\"/\\\"}"
  done < "${ENV_FILE}"
}

fargate_deploy() {
  build_and_push

  # Security group
  SG_ID="$(aws ec2 describe-security-groups --filters Name=group-name,Values="${SG_NAME}" --query 'SecurityGroups[0].GroupId' --output text --region "${AWS_REGION}" 2>/dev/null || true)"
  if [[ "$SG_ID" == "None" || -z "$SG_ID" ]]; then
    log "Creating security group ${SG_NAME}"
    VPC_ID="$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text --region "${AWS_REGION}")"
    SG_ID="$(aws ec2 create-security-group --group-name "${SG_NAME}" --description "VeraFit ALB + Fargate" --vpc-id "${VPC_ID}" --query 'GroupId' --output text --region "${AWS_REGION}")"
    aws ec2 authorize-security-group-ingress --group-id "${SG_ID}" --ip-permissions \
      "IpProtocol=tcp FromPort=80 ToPort=80 IpRanges=[{CidrIp=0.0.0.0/0}]" \
      --region "${AWS_REGION}" >/dev/null
  fi

  # IAM execution role
  EXEC_ROLE_ARN="$(aws iam get-role --role-name ecsTaskExecutionRole --query 'Role.Arn' --output text 2>/dev/null || true)"
  if [[ -z "$EXEC_ROLE_ARN" || "$EXEC_ROLE_ARN" == "None" ]]; then
    log "Creating ecsTaskExecutionRole"
    aws iam create-role --role-name ecsTaskExecutionRole \
      --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
    aws iam attach-role-policy --role-name ecsTaskExecutionRole \
      --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy >/dev/null
    EXEC_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole"
  fi

  # CloudWatch log group
  aws logs create-log-group --log-group-name "/ecs/${APP_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1 || true

  # ALB + target group
  VPC_ID="$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text --region "${AWS_REGION}")"
  SUBNETS="$(aws ec2 describe-subnets --filters Name=vpc-id,Values="${VPC_ID}" --query 'Subnets[?DefaultForAz==`true`].SubnetId' --output text --region "${AWS_REGION}" | tr '\t' ' ')"
  ALB_ARN="$(aws elbv2 describe-load-balancers --names "${ALB_NAME}" --query 'LoadBalancers[0].LoadBalancerArn' --output text --region "${AWS_REGION}" 2>/dev/null || true)"
  if [[ -z "$ALB_ARN" || "$ALB_ARN" == "None" ]]; then
    log "Creating ALB ${ALB_NAME}"
    ALB_ARN="$(aws elbv2 create-load-balancer --name "${ALB_NAME}" --subnets ${SUBNETS} --security-groups "${SG_ID}" --scheme internet-facing --type application --query 'LoadBalancers[0].LoadBalancerArn' --output text --region "${AWS_REGION}")"
  fi
  TG_ARN="$(aws elbv2 describe-target-groups --names "${TG_NAME}" --query 'TargetGroups[0].TargetGroupArn' --output text --region "${AWS_REGION}" 2>/dev/null || true)"
  if [[ -z "$TG_ARN" || "$TG_ARN" == "None" ]]; then
    log "Creating target group ${TG_NAME}"
    TG_ARN="$(aws elbv2 create-target-group --name "${TG_NAME}" --protocol HTTP --port 5194 --vpc-id "${VPC_ID}" --target-type ip --health-check-path /health --health-check-interval-seconds 30 --query 'TargetGroups[0].TargetGroupArn' --output text --region "${AWS_REGION}")"
  fi
  # Listener (reuse existing listener on port 80 if present)
  LISTENER_ARN="$(aws elbv2 describe-listeners --load-balancer-arn "${ALB_ARN}" --query 'Listeners[?Port==`80`].ListenerArn' --output text --region "${AWS_REGION}" | awk '{print $1}')"
  if [[ -z "$LISTENER_ARN" || "$LISTENER_ARN" == "None" ]]; then
    LISTENER_ARN="$(aws elbv2 create-listener --load-balancer-arn "${ALB_ARN}" --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn="${TG_ARN}" --query 'Listeners[0].ListenerArn' --output text --region "${AWS_REGION}")"
  fi

  # Task definition
  ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"
  [[ -f "$ENV_FILE" ]] || ENV_FILE="${ROOT_DIR}/.env.example"
  ENV_JSON="$(env_vars_task)"
  ENV_JSON="${ENV_JSON%,}"
  TASK_DEF="$(cat <<JSON
{
  "family": "${TASK_FAMILY}",
  "taskRoleArn": "${EXEC_ROLE_ARN}",
  "executionRoleArn": "${EXEC_ROLE_ARN}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "3072",
  "containerDefinitions": [{
    "name": "${APP_NAME}",
    "image": "${ECR_IMAGE}",
    "essential": true,
    "portMappings": [{"containerPort": 5194, "protocol": "tcp"}],
    "environment": [${ENV_JSON}],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/${APP_NAME}",
        "awslogs-region": "${AWS_REGION}",
        "awslogs-stream-prefix": "${APP_NAME}"
      }
    }
  }]
}
JSON
)"
  log "Registering task definition ${TASK_FAMILY}"
  aws ecs register-task-definition --cli-input-json "$TASK_DEF" >/dev/null
  LATEST_REV="$(aws ecs describe-task-definition --task-definition "${TASK_FAMILY}" --query 'taskDefinition.revision' --output text --region "${AWS_REGION}")"

  # Cluster + service
  aws ecs create-cluster --cluster-name "${ECS_CLUSTER}" --region "${AWS_REGION}" >/dev/null 2>&1 || true
  if ! aws ecs describe-services --cluster "${ECS_CLUSTER}" --services "${ECS_SERVICE}" --query 'services[0].status' --output text --region "${AWS_REGION}" 2>/dev/null | grep -q ACTIVE; then
    log "Creating ECS service ${ECS_SERVICE}"
    aws ecs create-service \
      --cluster "${ECS_CLUSTER}" --service-name "${ECS_SERVICE}" \
      --task-definition "${TASK_FAMILY}:${LATEST_REV}" --desired-count 1 \
      --launch-type FARGATE \
      --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS// /,}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}" \
      --load-balancers "targetGroupArn=${TG_ARN},containerName=${APP_NAME},containerPort=5194" \
      --region "${AWS_REGION}" >/dev/null
  else
    log "Updating ECS service ${ECS_SERVICE} -> task ${TASK_FAMILY}:${LATEST_REV}"
    aws ecs update-service --cluster "${ECS_CLUSTER}" --service "${ECS_SERVICE}" \
      --task-definition "${TASK_FAMILY}:${LATEST_REV}" --force-new-deployment \
      --region "${AWS_REGION}" >/dev/null
  fi

  log "Waiting for ALB to be active..."
  aws elbv2 wait load-balancer-available --load-balancer-arns "${ALB_ARN}" --region "${AWS_REGION}"
  ALB_DNS="$(aws elbv2 describe-load-balancers --load-balancer-arns "${ALB_ARN}" --query 'LoadBalancers[0].DNSName' --output text --region "${AWS_REGION}")"
  log "Deployment complete! App URL: http://${ALB_DNS}"
}

# ---------------------------------------------------------------- EC2 mode --
ec2_userdata() {
  cat <<'UDATA'
#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y docker.io docker-compose-v2 awscli || true
systemctl enable --now docker
usermod -aG docker ubuntu
UDATA
}

ec2_deploy() {
  build_and_push

  log "Ensuring ECR credentials file for the instance"
  ECR_CREDS_FILE="${ROOT_DIR}/.ecr-config.json"
  aws ecr get-login-password --region "${AWS_REGION}" >/dev/null

  # Security group with 5194 open to the world (demo).
  SG_ID="$(aws ec2 describe-security-groups --filters Name=group-name,Values="${SG_NAME}-ec2" --query 'SecurityGroups[0].GroupId' --output text --region "${AWS_REGION}" 2>/dev/null || true)"
  if [[ -z "$SG_ID" || "$SG_ID" == "None" ]]; then
    VPC_ID="$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text --region "${AWS_REGION}")"
    SG_ID="$(aws ec2 create-security-group --group-name "${SG_NAME}-ec2" --description "VeraFit EC2" --vpc-id "${VPC_ID}" --query 'GroupId' --output text --region "${AWS_REGION}")"
    aws ec2 authorize-security-group-ingress --group-id "${SG_ID}" --ip-permissions \
      "IpProtocol=tcp FromPort=5194 ToPort=5194 IpRanges=[{CidrIp=0.0.0.0/0}]" \
      "IpProtocol=tcp FromPort=22 ToPort=22 IpRanges=[{CidrIp=0.0.0.0/0}]" \
      --region "${AWS_REGION}" >/dev/null
  fi

  IMAGE_ID="$(aws ec2 describe-images --owners 099720109477 --filters Name=name,Values='ubuntu/images/hvm-ssd/ubuntu-24.04-amd64-server-*' Name=state,Values=available --query 'sort_by(Images,&CreationDate)[-1].ImageId' --output text --region "${AWS_REGION}")"
  KEY_OPT=()
  [[ -n "${EC2_KEY_NAME}" ]] && KEY_OPT=(--key-name "${EC2_KEY_NAME}")

  log "Launching EC2 instance (${EC2_INSTANCE_TYPE})"
  INSTANCE_ID="$(aws ec2 run-instances \
    --image-id "${IMAGE_ID}" --instance-type "${EC2_INSTANCE_TYPE}" \
    --security-group-ids "${SG_ID}" --associate-public-ip-address \
    --user-data "$(ec2_userdata)" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${APP_NAME}-ec2}]" \
    ${KEY_OPT[@]+"${KEY_OPT[@]}"} \
    --query 'Instances[0].InstanceId' --output text --region "${AWS_REGION}")"
  log "Instance ${INSTANCE_ID} — waiting to run & pass status checks (this can take a few minutes)"
  aws ec2 wait instance-status-ok --instance-ids "${INSTANCE_ID}" --region "${AWS_REGION}"
  PUBLIC_IP="$(aws ec2 describe-instances --instance-ids "${INSTANCE_ID}" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text --region "${AWS_REGION}")"

  log "Deploying container to ${PUBLIC_IP} via docker compose"
  scp -o StrictHostKeyChecking=no -o ConnectTimeout=60 \
    docker-compose.yml .env "${PUBLIC_IP}:/home/ubuntu/" || \
  scp -o StrictHostKeyChecking=no -o ConnectTimeout=60 \
    docker-compose.yml .env.example "${PUBLIC_IP}:/home/ubuntu/.env"

  ssh -o StrictHostKeyChecking=no "ubuntu@${PUBLIC_IP}" \
    "export AWS_ECR_REGISTRY=${ECR_URI} AWS_REGION=${AWS_REGION} APP_NAME=${APP_NAME}; \
     aws ecr get-login-password --region \${AWS_REGION} | sudo docker login --username AWS --password-stdin \${AWS_ECR_REGISTRY}; \
     cd /home/ubuntu && sudo docker compose up -d --pull always" || true

  log "Deployment complete! App URL: http://${PUBLIC_IP}:5194"
  log "Note: pull the image on the instance with: sudo docker pull ${ECR_IMAGE}"
}

# ------------------------------------------------------------- Entry point --
case "${DEPLOY_TARGET}" in
  fargate) fargate_deploy ;;
  ec2)     ec2_deploy ;;
  *) die "Unknown DEPLOY_TARGET '${DEPLOY_TARGET}' (use fargate or ec2)" ;;
esac

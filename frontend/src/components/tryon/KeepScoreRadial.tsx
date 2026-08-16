"use client";

import React from "react";
import { formatPercent } from "@/lib/utils";
import { ShieldCheck, AlertTriangle, AlertOctagon, Sparkles } from "lucide-react";

interface KeepScoreRadialProps {
  score: number;
  verdict: string;
  isLoading?: boolean;
}

export const KeepScoreRadial: React.FC<KeepScoreRadialProps> = ({
  score,
  verdict,
  isLoading = false,
}) => {
  // Radius and circumference
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine color theme based on score thresholds
  let colorClass = "text-emerald-500 stroke-emerald-500";
  let bgGlow = "glow-green";
  let badgeBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  let VerdictIcon = ShieldCheck;
  let verdictText = "Strong Buy";

  if (score < 50) {
    colorClass = "text-rose-500 stroke-rose-500";
    bgGlow = "glow-red";
    badgeBg = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    VerdictIcon = AlertOctagon;
    verdictText = "High Return Risk";
  } else if (score < 80) {
    colorClass = "text-amber-500 stroke-amber-500";
    bgGlow = "glow-yellow";
    badgeBg = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    VerdictIcon = AlertTriangle;
    verdictText = "Consider Caution";
  }

  return (
    <div className={`relative flex flex-col items-center justify-center p-6 rounded-3xl bg-card border border-border/80 shadow-lg ${bgGlow} transition-all duration-500`}>
      <div className="relative w-44 h-44 flex items-center justify-center">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-muted/40"
          />
          {/* Progress circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={isLoading ? circumference : strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className={`${colorClass} transition-all duration-1000 ease-out`}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Sparkles className="w-8 h-8 text-primary animate-spin-slow mb-1" />
              <span className="text-[11px] font-medium text-muted-foreground animate-pulse">
                Evaluating...
              </span>
            </div>
          ) : (
            <>
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {score.toFixed(1)}%
              </span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">
                Keep Probability
              </span>
            </>
          )}
        </div>
      </div>

      {/* Verdict Badge */}
      {!isLoading && (
        <div className={`mt-3 px-3 py-1 rounded-full border text-xs font-bold flex items-center space-x-1.5 ${badgeBg}`}>
          <VerdictIcon className="w-4 h-4 shrink-0" />
          <span>{verdictText}</span>
        </div>
      )}
    </div>
  );
};

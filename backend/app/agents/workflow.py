from langgraph.graph import StateGraph, START, END
from backend.app.agents.state import GraphState
from backend.app.agents.vto_agent import vto_fit_agent_node
from backend.app.agents.color_agent import color_harmony_agent_node
from backend.app.agents.fabric_agent import fabric_safety_agent_node
from backend.app.agents.personalization_agent import personalization_agent_node
from backend.app.agents.history_agent import purchase_history_analyzer_node
from backend.app.agents.synthesis_agent import synthesis_agent_node
from typing import Dict, Any

def create_verafit_graph():
    """
    Constructs the LangGraph multi-agent workflow:
    START -> [vto_agent, color_agent, fabric_agent, personalization_agent, purchase_history_analyzer] -> synthesis_agent -> END
    """
    builder = StateGraph(GraphState)

    # Register Nodes
    builder.add_node("vto_fit_agent", vto_fit_agent_node)
    builder.add_node("color_harmony_agent", color_harmony_agent_node)
    builder.add_node("fabric_safety_agent", fabric_safety_agent_node)
    builder.add_node("personalization_agent", personalization_agent_node)
    builder.add_node("purchase_history_analyzer", purchase_history_analyzer_node)
    builder.add_node("synthesis_agent", synthesis_agent_node)

    # Connect START to concurrent agents
    builder.add_edge(START, "vto_fit_agent")
    builder.add_edge(START, "color_harmony_agent")
    builder.add_edge(START, "fabric_safety_agent")
    builder.add_edge(START, "personalization_agent")
    builder.add_edge(START, "purchase_history_analyzer")

    # Connect all agents to synthesis agent
    builder.add_edge("vto_fit_agent", "synthesis_agent")
    builder.add_edge("color_harmony_agent", "synthesis_agent")
    builder.add_edge("fabric_safety_agent", "synthesis_agent")
    builder.add_edge("personalization_agent", "synthesis_agent")
    builder.add_edge("purchase_history_analyzer", "synthesis_agent")

    # Connect synthesis agent to END
    builder.add_edge("synthesis_agent", END)

    return builder.compile()

# Singleton compiled workflow instance
verafit_workflow = create_verafit_graph()

async def run_verafit_workflow(initial_state: GraphState) -> Dict[str, Any]:
    """Executes the compiled LangGraph workflow asynchronously."""
    final_state = await verafit_workflow.ainvoke(initial_state)
    return final_state

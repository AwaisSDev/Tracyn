"""A support agent whose refunds wait for a human yes.

    pip install 'tracyn[openai-agents]'
    export OPENAI_API_KEY=... TRACYN_API_KEY=al_live_...
    python examples/openai_agents.py
"""

import os

from agents import Agent, Runner, add_trace_processor, function_tool

from tracyn import Tracyn
from tracyn.integrations.openai_agents import TracynTracingProcessor

audit = Tracyn(
    api_key=os.environ["TRACYN_API_KEY"],
    agent_name="support-bot",
    # Refunds need approval; everything else is just logged.
    policy_yaml="""
rules:
  - match:
      action_name: refund
    require_approval: true
""",
)
add_trace_processor(TracynTracingProcessor(audit))


@function_tool
def lookup_order(order_id: str) -> str:
    """Look up an order's status."""
    return f"Order {order_id}: delivered, $42.00"


@function_tool
@audit.track(action_type="external", action_name="refund")
def refund(order_id: str, amount: float) -> str:
    """Refund an order."""
    return f"Refunded ${amount:.2f} on {order_id}"


agent = Agent(
    name="Support",
    instructions="Help customers with orders. Refund when asked.",
    tools=[lookup_order, refund],
)

if __name__ == "__main__":
    # A rejected refund raises inside the tool; the Agents SDK hands that
    # error to the model, which tells the customer the refund didn't go through.
    result = Runner.run_sync(agent, "Order A1 never arrived, please refund it.")
    print(result.final_output)

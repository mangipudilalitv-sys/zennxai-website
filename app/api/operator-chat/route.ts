import { NextResponse } from "next/server";

import {
  getSystemSnapshot,
  makeOperatorDecision,
  runAutonomousScan,
} from "@/app/lib/operator-system";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = body.message || "";

    const snapshot = await getSystemSnapshot();

    const decision = await makeOperatorDecision(message);

    let autonomousResult = null;

    if (
      decision.intent === "autonomous_loop" ||
      decision.priority === "high"
    ) {
      autonomousResult = await runAutonomousScan();
    }

    const response = {
      success: true,

      operator: {
        intent: decision.intent,
        priority: decision.priority,
        summary: decision.summary,
        recommendedAction: decision.recommendedAction,
        nextRoute: decision.nextRoute,
      },

      system: {
        operationalScore: snapshot.metrics.operationalScore,
        totalLeads: snapshot.metrics.totalLeads,
        totalTasks: snapshot.metrics.totalTasks,
        pendingTasks: snapshot.metrics.pendingTasks,
        activeTasks: snapshot.metrics.activeTasks,
        highRiskLeads: snapshot.metrics.highRiskLeads,
        memoryNodes: snapshot.metrics.memoryNodes,
      },

      autonomous: autonomousResult,

      response:
        generateOperatorResponse(
          message,
          decision,
          snapshot,
          autonomousResult
        ),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Operator system failure:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Operator system failure",
      },
      {
        status: 500,
      }
    );
  }
}

function generateOperatorResponse(
  message: string,
  decision: any,
  snapshot: any,
  autonomousResult: any
) {
  const metrics = snapshot.metrics;

  let response = `
ZennX Operator Analysis Complete.

Intent Classified:
${decision.intent}

Operational Priority:
${decision.priority.toUpperCase()}

System Snapshot:
• Operational Score: ${metrics.operationalScore}%
• Total Leads: ${metrics.totalLeads}
• Active Tasks: ${metrics.activeTasks}
• Pending Tasks: ${metrics.pendingTasks}
• High Risk Leads: ${metrics.highRiskLeads}
• Memory Nodes: ${metrics.memoryNodes}

Recommended Action:
${decision.recommendedAction}
`;

  if (autonomousResult) {
    response += `

Autonomous Execution Results:
• Actions Created: ${autonomousResult.actionsCreated}
• High Risk Leads Scanned: ${autonomousResult.highRiskLeads}
• Pending Tasks Detected: ${autonomousResult.pendingTasks}
`;
  }

  response += `

Next Recommended Route:
${decision.nextRoute}
`;

  return response;
}
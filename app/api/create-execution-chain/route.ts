import OpenAI from "openai";
import { NextResponse } from "next/server";
import { isAuthorizedInternalRequest } from "@/app/lib/internal-api-auth";
import { supabaseServer as supabase } from "@/app/lib/supabase-server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!isAuthorizedInternalRequest(req)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }
    const body = await req.json();

    const leadId = body.leadId;
    const taskId = body.taskId;

    let sourceType: "lead" | "task" = "lead";
    let source: any = null;

    if (leadId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", Number(leadId))
        .maybeSingle();

      if (!lead) {
        return NextResponse.json(
          { success: false, error: "Lead not found" },
          { status: 404 }
        );
      }

      sourceType = "lead";
      source = lead;
    } else if (taskId) {
      const { data: task } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", Number(taskId))
        .maybeSingle();

      if (!task) {
        return NextResponse.json(
          { success: false, error: "Task not found" },
          { status: 404 }
        );
      }

      sourceType = "task";
      source = task;
    } else {
      return NextResponse.json(
        { success: false, error: "leadId or taskId required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are ZennX AI's Multi-Agent Workforce Orchestration system. Build a 3-step execution chain using specialized AI operators. Return strict JSON only.",
        },
        {
          role: "user",
          content: `
SOURCE TYPE:
${sourceType}

SOURCE OBJECT:
${JSON.stringify(source)}

Available operators:
- Revenue Intelligence Operator
- Workflow Coordination Operator
- Autonomous Follow-Up Infrastructure
- Escalation Intelligence Layer
- Operational Memory Engine
- Decision Routing System

Return only JSON:
{
  "chain_name": "",
  "steps": [
    {
      "operator": "",
      "task_title": "",
      "task_description": "",
      "priority": "high | medium | low",
      "due_time": ""
    }
  ]
}
          `,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();

    let chain: any;

    try {
      chain = JSON.parse(clean);
    } catch {
      chain = {
        chain_name: "Fallback Execution Chain",
        steps: [
          {
            operator: "Workflow Coordination Operator",
            task_title: "Review operational object",
            task_description:
              "AI returned malformed JSON. Human review recommended.",
            priority: "medium",
            due_time: "active",
          },
        ],
      };
    }

    const steps = Array.isArray(chain.steps) ? chain.steps : [];

    const tasks = steps.map((step: any, index: number) => ({
      lead_id: sourceType === "lead" ? Number(leadId) : source.lead_id || null,
      company_name:
        source.business_name ||
        source.company_name ||
        body.companyName ||
        "Autonomous System",
      task_title: `${index + 1}. ${step.task_title}`,
      task_description: step.task_description,
      priority: step.priority || "medium",
      assigned_agent: step.operator || "ZennX Operator",
      due_time: step.due_time || "active",
      status: index === 0 ? "in_progress" : "queued",
    }));

    let insertedTasks: any[] = [];

    if (tasks.length > 0) {
      const { data } = await supabase
        .from("tasks")
        .insert(tasks)
        .select();

      insertedTasks = data || [];
    }

    if (sourceType === "lead") {
      await supabase
        .from("leads")
        .update({
          status: "execution_chain_created",
        })
        .eq("id", Number(leadId));
    }

    return NextResponse.json({
      success: true,
      sourceType,
      sourceId: leadId || taskId,
      chain,
      insertedTasks,
      insertedCount: insertedTasks.length,
    });
  } catch (error) {
    console.error("CREATE EXECUTION CHAIN ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Execution chain failed" },
      { status: 500 }
    );
  }
}
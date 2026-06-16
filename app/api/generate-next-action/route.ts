import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { AVAILABLE_OPERATORS } from "@/app/lib/operator-system";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanJson(raw: string) {
  return raw.replace(/```json|```/g, "").trim();
}

function safePriority(value: unknown) {
  const priority = String(value || "").toLowerCase();

  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }

  return "medium";
}

function safeOperator(value: unknown) {
  const operator = String(value || "").trim();

  if (AVAILABLE_OPERATORS.includes(operator)) {
    return operator;
  }

  return "Workflow Coordination Operator";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leadId = Number(body.leadId);

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: "leadId is required" },
        { status: 400 }
      );
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are ZennX AI, an operational strategist. Create one specific next action task for this lead. Use only canonical ZennX operators. Return strict JSON only.",
        },
        {
          role: "user",
          content: `
Lead:
${JSON.stringify(lead)}

Available operators:
${JSON.stringify(AVAILABLE_OPERATORS)}

Return only JSON:
{
  "task_title": "",
  "task_description": "",
  "priority": "high | medium | low",
  "assigned_agent": "",
  "due_time": ""
}
          `,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";

    let task: any;

    try {
      task = JSON.parse(cleanJson(raw));
    } catch {
      task = {
        task_title: "Lead Follow-Up",
        task_description:
          "Follow up with the lead, clarify business needs, and record the outcome.",
        priority: "medium",
        assigned_agent: "Workflow Coordination Operator",
        due_time: "ASAP",
      };
    }

    const assignedAgent = safeOperator(task.assigned_agent);
    const priority = safePriority(task.priority);

    const { data: createdTask, error } = await supabase
      .from("tasks")
      .insert({
        lead_id: leadId,
        company_name: lead.business_name || lead.company_name || "Unknown Business",
        task_title: task.task_title || "Lead Follow-Up",
        task_description:
          task.task_description ||
          "Follow up with the lead and record the outcome.",
        priority,
        assigned_agent: assignedAgent,
        due_time: task.due_time || "ASAP",
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("TASK CREATE ERROR:", error);

      return NextResponse.json(
        { success: false, error: "Task create failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      task: createdTask,
    });
  } catch (error) {
    console.error("GENERATE NEXT ACTION ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Generate next action failed" },
      { status: 500 }
    );
  }
}
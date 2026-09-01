import OpenAI from "openai";
import { NextResponse } from "next/server";
import { isAuthorizedInternalRequest } from "@/app/lib/internal-api-auth";
import { supabaseServer as supabase } from "@/app/lib/supabase-server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  if (!isAuthorizedInternalRequest(req)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }
  try {
    const { data: leads } = await supabase
      .from("leads")
      .select("*")
      .order("id", { ascending: false })
      .limit(10);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .order("id", { ascending: false })
      .limit(15);

    const { data: memory } = await supabase
      .from("company_memory")
      .select("*")
      .order("id", { ascending: false })
      .limit(10);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are ZennX AI's Business Health Monitoring Engine. Analyze live business operations, leads, tasks, and memory. Detect revenue leaks, workflow bottlenecks, overdue work, operational risk, and intervention opportunities.",
        },
        {
          role: "user",
          content: `
LIVE LEADS:
${JSON.stringify(leads)}

LIVE TASKS:
${JSON.stringify(tasks)}

COMPANY MEMORY:
${JSON.stringify(memory)}

Return only JSON:
{
  "health_score": 0,
  "risk_level": "low | medium | high",
  "main_risk": "",
  "revenue_leak": "",
  "workflow_bottleneck": "",
  "recommended_intervention": "",
  "intervention_task_title": "",
  "intervention_task_description": "",
  "priority": "low | medium | high"
}
          `,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const report = JSON.parse(clean);

    await supabase.from("tasks").insert([
      {
        company_name: "System-wide",
        task_title: report.intervention_task_title,
        task_description: report.intervention_task_description,
        priority: report.priority || "medium",
        assigned_agent: "Business Health Monitoring Engine",
        due_time: "active",
        status: "pending",
      },
    ]);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("BUSINESS HEALTH MONITOR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Business health monitor failed",
      },
      { status: 500 }
    );
  }
}
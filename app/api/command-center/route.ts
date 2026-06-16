import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { getOperatorPerformance, getSystemSnapshot } from "@/app/lib/operator-system";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-4.1-mini";

function trimText(value: unknown, max = 2000) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function compactLead(lead: any) {
  return {
    id: lead.id,
    name: lead.full_name,
    company: lead.business_name || lead.company_name,
    service_requested: lead.service_requested,
    status: lead.status,
    urgency: lead.urgency,
    summary: trimText(lead.ai_summary, 700),
  };
}

function compactTask(task: any) {
  return {
    id: task.id,
    company: task.company_name,
    title: task.task_title || task.task,
    status: task.status,
    priority: task.priority,
    assigned_agent: task.assigned_agent,
    result: task.result,
    due_time: task.due_time,
  };
}

function compactMemory(memory: any) {
  return {
    id: memory.id,
    type: memory.memory_type,
    category: memory.memory_category,
    title: memory.title,
    company: memory.company_name,
    operator: memory.assigned_operator,
    outcome: memory.outcome,
    outcome_score: memory.outcome_score,
    priority: memory.priority,
    content: trimText(memory.content, 600),
    created_at: memory.created_at,
  };
}

function compactEvent(event: any) {
  return {
    id: event.id,
    type: event.event_type,
    title: event.title,
    priority: event.priority,
    source: event.source,
    description: trimText(event.description, 500),
    created_at: event.created_at,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Command Center request timed out")), ms)
    ),
  ]);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = String(body.question || "").trim();

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error: "question is required",
        },
        { status: 400 }
      );
    }

    const [
      snapshot,
      operatorPerformance,
      { data: leads },
      { data: tasks },
      { data: memories },
      { data: events },
    ] = await Promise.all([
      getSystemSnapshot(),
      getOperatorPerformance(),
      supabase.from("leads").select("*").order("id", { ascending: false }).limit(20),
      supabase.from("tasks").select("*").order("id", { ascending: false }).limit(40),
      supabase
        .from("operator_memory")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("operational_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const activeTasks = (tasks || []).filter((task) =>
      ["pending", "queued", "in_progress", "active"].includes(
        String(task.status || "").toLowerCase()
      )
    );

    const intelligencePack = {
      question,
      systemMetrics: snapshot.metrics,
      operatorPerformance,
      bestOperator: operatorPerformance[0] || null,
      recentLeads: (leads || []).map(compactLead),
      activeTasks: activeTasks.map(compactTask),
      recentTasks: (tasks || []).slice(0, 15).map(compactTask),
      recentMemories: (memories || []).map(compactMemory),
      recentEvents: (events || []).map(compactEvent),
    };

    const completion = await withTimeout(
      openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are ZennX Command Center, the operational intelligence brain for a business. Use only the provided live company data. Be direct, practical, and action-oriented. Identify what matters, what is risky, what changed, and what the owner should do next. Do not invent data. If data is missing, say what is missing.",
          },
          {
            role: "user",
            content: `
USER QUESTION:
${question}

LIVE ZENNX INTELLIGENCE PACK:
${JSON.stringify(intelligencePack)}

Answer with:
1. Direct answer
2. What matters most
3. Recommended next action
4. Any risks or missing data
            `,
          },
        ],
        temperature: 0.2,
      }),
      20000
    );

    const answer =
      completion.choices[0].message.content ||
      "ZennX could not generate a command center response.";

    return NextResponse.json({
      success: true,
      answer,
      intelligencePack,
    });
  } catch (error) {
    console.error("COMMAND CENTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Command Center failed",
      },
      { status: 500 }
    );
  }
}
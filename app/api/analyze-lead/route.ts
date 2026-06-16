import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { AVAILABLE_OPERATORS } from "@/app/lib/operator-system";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { lead_id, full_name, business_name, service_requested } = body;

    if (!lead_id) {
      return NextResponse.json(
        { success: false, error: "lead_id is required" },
        { status: 400 }
      );
    }

    const { data: existingMemory, error: memoryError } = await supabase
      .from("company_memory")
      .select("*")
      .eq("company_name", business_name)
      .order("id", { ascending: false })
      .limit(5);

    if (memoryError) {
      console.error("MEMORY FETCH ERROR:", memoryError);
    }

    const memoryContext =
      existingMemory && existingMemory.length > 0
        ? existingMemory
            .map(
              (memory) => `
Company Context: ${memory.company_context || "N/A"}
Services: ${memory.services || "N/A"}
Workflow Notes: ${memory.workflow_notes || "N/A"}
Communication Style: ${memory.communication_style || "N/A"}
Learned Insights: ${memory.learned_insights || "N/A"}
`
            )
            .join("\n---\n")
        : "No previous company memory found.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are ZennX AI, a universal AI operational intelligence system. Analyze leads, identify bottlenecks, and recommend the next highest-leverage operational action. Use only canonical ZennX operators.",
        },
        {
          role: "user",
          content: `
Existing Company Memory:
${memoryContext}

Available operators:
${JSON.stringify(AVAILABLE_OPERATORS)}

New Lead:
Name: ${full_name}
Business: ${business_name}
Request: ${service_requested}

Return in this exact format:
- urgency:
- lead_score:
- company_type:
- recommended_action:
- memory_based_insight:
- next_operational_task:
- possible_revenue_leak:
- suggested_ai_operator:
          `,
        },
      ],
    });

    const analysis = completion.choices[0].message.content || "";

    const { error: leadUpdateError } = await supabase
      .from("leads")
      .update({
        ai_summary: analysis,
        urgency: "analyzed",
      })
      .eq("id", lead_id);

    if (leadUpdateError) {
      console.error("LEAD UPDATE ERROR:", leadUpdateError);
    }

    const { error: memoryInsertError } = await supabase
      .from("company_memory")
      .insert({
        company_name: business_name,
        company_context: service_requested,
        services: "Learned from lead request",
        workflow_notes: analysis,
        communication_style: "Professional and direct",
        learned_insights: `New memory from ${full_name}: ${analysis}`,
      });

    if (memoryInsertError) {
      console.error("MEMORY INSERT ERROR:", memoryInsertError);
    }

    const { error: taskInsertError } = await supabase.from("tasks").insert([
      {
        lead_id,
        company_name: business_name,
        task_title: "Immediate Lead Follow-Up",
        task_description:
          "Contact this lead quickly, clarify business needs, and begin operational discovery.",
        assigned_agent: "Workflow Coordination Operator",
        priority: "high",
        status: "pending",
        due_time: "within 15 minutes",
      },
      {
        lead_id,
        company_name: business_name,
        task_title: "Revenue Risk Review",
        task_description:
          "Assess possible revenue leakage, qualification gaps, and conversion opportunity.",
        assigned_agent: "Revenue Intelligence Operator",
        priority: "medium",
        status: "pending",
        due_time: "today",
      },
      {
        lead_id,
        company_name: business_name,
        task_title: "Memory and Workflow Context Review",
        task_description:
          "Review company memory, workflow notes, and determine the next reusable operational insight.",
        assigned_agent: "Operational Memory Engine",
        priority: "medium",
        status: "pending",
        due_time: "this week",
      },
    ]);

    if (taskInsertError) {
      console.error("TASK INSERT ERROR:", taskInsertError);
    }

    return NextResponse.json({
      success: true,
      analysis,
      memory_used: existingMemory?.length || 0,
    });
  } catch (error) {
    console.error("AI MEMORY ANALYSIS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "AI memory analysis failed",
      },
      { status: 500 }
    );
  }
}
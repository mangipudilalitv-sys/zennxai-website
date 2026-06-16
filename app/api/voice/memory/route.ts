import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function clean(value: unknown) {
  return String(value || "").trim();
}

function safeUrgency(value: unknown) {
  const urgency = clean(value).toLowerCase();

  if (urgency === "high" || urgency === "medium" || urgency === "low") {
    return urgency;
  }

  return "medium";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const callSid = clean(body.callSid);
    const fromNumber = clean(body.fromNumber);
    const toNumber = clean(body.toNumber);
    const transcript = clean(body.transcript);
    const direction = clean(body.direction) || "inbound";

    if (!transcript) {
      return NextResponse.json(
        { success: false, error: "transcript is required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are ZennX Voice Intelligence. Summarize business calls, detect intent, urgency, company name, caller name, and next action. Return strict JSON only.",
        },
        {
          role: "user",
          content: `
CALL TRANSCRIPT:
${transcript}

Return JSON:
{
  "caller_name": "",
  "company_name": "",
  "summary": "",
  "intent": "",
  "urgency": "high | medium | low",
  "next_task_title": "",
  "next_task_description": ""
}
          `,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

    const companyName = parsed.company_name || "Voice Caller";
    const callerName = parsed.caller_name || "Unknown Caller";
    const urgency = safeUrgency(parsed.urgency);

    const { data: lead } = await supabase
      .from("leads")
      .insert({
        full_name: callerName,
        phone: fromNumber,
        business_name: companyName,
        service_requested: parsed.intent || transcript,
        status: "voice_captured",
        urgency,
        ai_summary: parsed.summary || transcript,
      })
      .select()
      .single();

    const { data: task } = await supabase
      .from("tasks")
      .insert({
        lead_id: lead?.id || null,
        company_name: companyName,
        task_title: parsed.next_task_title || "Follow up from voice call",
        task_description:
          parsed.next_task_description ||
          "Review voice call, follow up with caller, and record outcome.",
        assigned_agent: "Workflow Coordination Operator",
        priority: urgency,
        status: "pending",
        due_time: urgency === "high" ? "immediate" : "today",
      })
      .select()
      .single();

    const { data: memory } = await supabase
      .from("operator_memory")
      .insert({
        memory_type: "voice_conversation",
        memory_category: "conversation",
        title: `Voice call from ${companyName}`,
        content: `
Voice call captured by ZennX.

Caller:
${callerName}

Company:
${companyName}

Transcript:
${transcript}

Summary:
${parsed.summary || "No summary."}

Intent:
${parsed.intent || "unknown"}
        `,
        source: "voice_memory",
        company_name: companyName,
        lead_id: lead?.id || null,
        task_id: task?.id || null,
        assigned_operator: "Workflow Coordination Operator",
        priority: urgency,
        outcome: "voice_call_captured",
        outcome_score: 0,
        tags: ["voice", "conversation", "memory", urgency],
        confidence: 1,
        embedding_status: "pending",
        metadata: {
          callSid,
          fromNumber,
          toNumber,
          direction,
          parsed,
        },
      })
      .select()
      .single();

    const { data: conversation } = await supabase
      .from("voice_conversations")
      .insert({
        call_sid: callSid,
        direction,
        from_number: fromNumber,
        to_number: toNumber,
        caller_name: callerName,
        company_name: companyName,
        transcript,
        summary: parsed.summary || "",
        intent: parsed.intent || "",
        urgency,
        lead_id: lead?.id || null,
        task_id: task?.id || null,
        memory_id: memory?.id || null,
        status: "captured",
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      conversation,
      lead,
      task,
      memory,
    });
  } catch (error) {
    console.error("VOICE MEMORY ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Voice memory failed" },
      { status: 500 }
    );
  }
}
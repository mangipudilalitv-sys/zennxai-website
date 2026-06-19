````ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";

function safeUrgency(value: unknown): "low" | "medium" | "high" {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

async function insertOrThrow<T>(
  label: string,
  query: PromiseLike<{ data: T | null; error: any }>
): Promise<T | null> {
  const { data, error } = await query;

  if (error) {
    console.error(`${label} INSERT ERROR:`, error);
    throw new Error(`${label} insert failed: ${error.message || JSON.stringify(error)}`);
  }

  return data;
}

export async function POST(req: Request) {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      console.error("VOICE MEMORY ERROR: Missing OPENAI_API_KEY");
      return NextResponse.json(
        { success: false, error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    const body = await req.json();

    const callSid = body.callSid || body.CallSid || `call_${Date.now()}`;
    const fromNumber = body.fromNumber || body.From || body.Caller || "";
    const toNumber = body.toNumber || body.To || "";
    const direction = body.direction || "inbound";
    const transcript =
      body.transcript ||
      body.TranscriptionText ||
      body.SpeechResult ||
      body.message ||
      "";

    if (!transcript) {
      return NextResponse.json(
        { success: false, error: "Missing transcript" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You extract structured lead intelligence from voice call transcripts. Return valid JSON only.",
        },
        {
          role: "user",
          content: `
Extract this call into JSON.

Transcript:
${transcript}

Return exactly:
{
  "caller_name": "",
  "company_name": "",
  "intent": "",
  "summary": "",
  "urgency": "low | medium | high",
  "next_task_title": "",
  "next_task_description": ""
}
          `,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";

    let parsed: any = {};
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch (parseError) {
      console.error("OPENAI JSON PARSE ERROR:", raw);
      parsed = {};
    }

    const companyName = parsed.company_name || "Voice Caller";
    const callerName = parsed.caller_name || "Unknown Caller";
    const urgency = safeUrgency(parsed.urgency);

    const lead = await insertOrThrow(
      "LEAD",
      supabase
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
        .single()
    );

    const task = await insertOrThrow(
      "TASK",
      supabase
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
        .single()
    );

    const memory = await insertOrThrow(
      "MEMORY",
      supabase
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
        .single()
    );

    const conversation = await insertOrThrow(
      "CONVERSATION",
      supabase
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
        .single()
    );

    return NextResponse.json({
      success: true,
      conversation,
      lead,
      task,
      memory,
    });
  } catch (error: any) {
    console.error("VOICE MEMORY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Voice memory failed",
      },
      { status: 500 }
    );
  }
}
````

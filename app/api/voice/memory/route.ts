import { NextResponse } from "next/server";
import { isAuthorizedInternalRequest } from "@/app/lib/internal-api-auth";
import OpenAI from "openai";
import { supabaseServer as supabase } from "@/app/lib/supabase-server";

export const dynamic = "force-dynamic";

function safeUrgency(value: string | undefined): "low" | "medium" | "high" {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

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

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY");
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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
            "Extract structured lead intelligence from voice call transcripts. Return valid JSON only.",
        },
        {
          role: "user",
          content: `
Transcript:
${transcript}

Return exactly this JSON shape:
{
  "caller_name": "",
  "company_name": "",
  "intent": "",
  "summary": "",
  "urgency": "low",
  "next_task_title": "",
  "next_task_description": ""
}
          `,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";

    let parsed: {
      caller_name?: string;
      company_name?: string;
      intent?: string;
      summary?: string;
      urgency?: string;
      next_task_title?: string;
      next_task_description?: string;
    } = {};

    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      parsed = {};
    }

    const companyName = parsed.company_name || "Voice Caller";
    const callerName = parsed.caller_name || "Unknown Caller";
    const urgency = safeUrgency(parsed.urgency);

    const { data: lead, error: leadError } = await supabase
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

    if (leadError) {
      console.error("LEAD INSERT ERROR:", leadError);
      throw new Error(`Lead insert failed: ${leadError.message}`);
    }

    const { data: task, error: taskError } = await supabase
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

    if (taskError) {
      console.error("TASK INSERT ERROR:", taskError);
      throw new Error(`Task insert failed: ${taskError.message}`);
    }

    const { data: memory, error: memoryError } = await supabase
      .from("operator_memory")
      .insert({
        memory_type: "voice_conversation",
        memory_category: "conversation",
        title: `Voice call from ${companyName}`,
        content: `Voice call captured by ZennX.

Caller:
${callerName}

Company:
${companyName}

Transcript:
${transcript}

Summary:
${parsed.summary || "No summary."}

Intent:
${parsed.intent || "unknown"}`,
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

    if (memoryError) {
      console.error("MEMORY INSERT ERROR:", memoryError);
      throw new Error(`Memory insert failed: ${memoryError.message}`);
    }

    const { data: conversation, error: conversationError } = await supabase
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

    if (conversationError) {
      console.error("CONVERSATION INSERT ERROR:", conversationError);
      throw new Error(`Conversation insert failed: ${conversationError.message}`);
    }

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
      {
        success: false,
        error: error instanceof Error ? error.message : "Voice memory failed",
      },
      { status: 500 }
    );
  }
}
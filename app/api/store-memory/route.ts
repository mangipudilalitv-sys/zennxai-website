import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("operator_memory")
      .insert({
        memory_type: body.memory_type || "decision",
        title: body.title,
        content: body.content,
        source: body.source || "system",
        outcome: body.outcome || "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      memory: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to store memory",
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { isAuthorizedInternalRequest } from "@/app/lib/internal-api-auth";
import { supabaseServer as supabase } from "@/app/lib/supabase-server";

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
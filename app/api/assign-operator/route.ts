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
    const { leadId, operator } = await req.json();

    if (!leadId || !operator) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing data",
        },
        { status: 400 }
      );
    }

    await supabase
      .from("leads")
      .update({
        assigned_operator: operator,
      })
      .eq("id", Number(leadId));

    await supabase.from("tasks").insert([
      {
        lead_id: Number(leadId),
        task_title: `Operator Assigned: ${operator}`,
        task_description: `${operator} has been assigned to manage this operational workflow.`,
        assigned_agent: operator,
        priority: "medium",
        due_time: "active",
        status: "in_progress",
      },
    ]);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("ASSIGN OPERATOR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Operator assignment failed",
      },
      { status: 500 }
    );
  }
}
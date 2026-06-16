import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST(req: Request) {
  try {
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
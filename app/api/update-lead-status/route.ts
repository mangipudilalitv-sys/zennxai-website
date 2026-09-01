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

    const { leadId, status } = body;

    const { error } = await supabase
      .from("leads")
      .update({
        status,
      })
      .eq("id", leadId);

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update lead",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
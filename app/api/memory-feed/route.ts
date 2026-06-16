import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("operator_memory")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return NextResponse.json(
      {
        success: false,
        memories: [],
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    memories: data || [],
  });
}
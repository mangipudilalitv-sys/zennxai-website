import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("operational_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json(
      { success: false, events: [], error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    events: data || [],
  });
}
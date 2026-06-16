import { NextResponse } from "next/server";
import { getOperatorPerformance } from "@/app/lib/operator-system";

export async function GET() {
  try {
    const operators = await getOperatorPerformance();

    return NextResponse.json({
      success: true,
      operators,
      bestOperator: operators[0] || null,
      operatorCount: operators.length,
    });
  } catch (error) {
    console.error("OPERATOR PERFORMANCE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate operator performance",
        operators: [],
      },
      { status: 500 }
    );
  }
}
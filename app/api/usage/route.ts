import { NextResponse } from "next/server";
import { getTotalTokenUsage } from "@/lib/tokenUsage";

export async function GET() {
  return NextResponse.json({ totalTokens: getTotalTokenUsage() });
}

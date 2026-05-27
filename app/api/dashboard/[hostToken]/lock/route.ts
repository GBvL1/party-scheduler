import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hostToken: string }> }
) {
  const { hostToken } = await params;
  const { dateId } = await req.json();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("host_token", hostToken)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (dateId) {
    const { data: date } = await supabase
      .from("candidate_dates")
      .select("id")
      .eq("id", dateId)
      .eq("event_id", event.id)
      .single();

    if (!date) {
      return NextResponse.json({ error: "Date not found." }, { status: 400 });
    }
  }

  const { error: updateError } = await supabase
    .from("events")
    .update({ locked_date_id: dateId ?? null })
    .eq("id", event.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to lock date." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

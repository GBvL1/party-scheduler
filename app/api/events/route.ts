import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const { name, dates } = await req.json();

  if (!name || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json(
      { error: "Event name and at least one date are required." },
      { status: 400 }
    );
  }

  const hostToken = uuidv4();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({ name: name.trim(), host_token: hostToken })
    .select()
    .single();

  if (eventError || !event) {
    console.error(eventError);
    return NextResponse.json({ error: "Failed to create event." }, { status: 500 });
  }

  const candidateDateRows = dates.map((date: string) => ({
    event_id: event.id,
    date,
  }));

  const { error: datesError } = await supabase
    .from("candidate_dates")
    .insert(candidateDateRows);

  if (datesError) {
    console.error(datesError);
    return NextResponse.json({ error: "Failed to save candidate dates." }, { status: 500 });
  }

  return NextResponse.json({ hostToken, eventId: event.id });
}

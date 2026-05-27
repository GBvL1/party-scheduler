import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ friendToken: string }> }
) {
  const { friendToken } = await params;

  const { data: friend, error: friendError } = await supabase
    .from("friends")
    .select("id, name, event_id")
    .eq("token", friendToken)
    .single();

  if (friendError || !friend) {
    return NextResponse.json({ error: "Invalid link." }, { status: 404 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("name")
    .eq("id", friend.event_id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { data: candidateDates, error: datesError } = await supabase
    .from("candidate_dates")
    .select("id, date")
    .eq("event_id", friend.event_id)
    .order("date", { ascending: true });

  if (datesError) {
    return NextResponse.json({ error: "Failed to load dates." }, { status: 500 });
  }

  const { data: availabilities } = await supabase
    .from("availabilities")
    .select("candidate_date_id")
    .eq("friend_id", friend.id);

  const selectedDateIds = new Set(
    (availabilities ?? []).map((a) => a.candidate_date_id)
  );

  return NextResponse.json({
    friendName: friend.name,
    eventName: event.name,
    candidateDates: (candidateDates ?? []).map((cd) => ({
      id: cd.id,
      date: cd.date,
      selected: selectedDateIds.has(cd.id),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ friendToken: string }> }
) {
  const { friendToken } = await params;
  const { selectedDateIds } = await req.json();

  if (!Array.isArray(selectedDateIds)) {
    return NextResponse.json({ error: "selectedDateIds must be an array." }, { status: 400 });
  }

  const { data: friend, error: friendError } = await supabase
    .from("friends")
    .select("id, event_id")
    .eq("token", friendToken)
    .single();

  if (friendError || !friend) {
    return NextResponse.json({ error: "Invalid link." }, { status: 404 });
  }

  // Verify all dateIds belong to this event
  if (selectedDateIds.length > 0) {
    const { data: validDates } = await supabase
      .from("candidate_dates")
      .select("id")
      .eq("event_id", friend.event_id)
      .in("id", selectedDateIds);

    const validIds = new Set((validDates ?? []).map((d) => d.id));
    const allValid = selectedDateIds.every((id: string) => validIds.has(id));

    if (!allValid) {
      return NextResponse.json({ error: "Invalid date selection." }, { status: 400 });
    }
  }

  // Delete all existing availabilities for this friend and replace
  const { error: deleteError } = await supabase
    .from("availabilities")
    .delete()
    .eq("friend_id", friend.id);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to update availability." }, { status: 500 });
  }

  if (selectedDateIds.length > 0) {
    const rows = selectedDateIds.map((dateId: string) => ({
      friend_id: friend.id,
      candidate_date_id: dateId,
    }));

    const { error: insertError } = await supabase.from("availabilities").insert(rows);

    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ error: "Failed to save availability." }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

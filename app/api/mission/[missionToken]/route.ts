import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ missionToken: string }> }
) {
  const { missionToken } = await params;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, locked_date_id, mission_token, bring_items")
    .eq("mission_token", missionToken)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "UPPDRAG EJ FUNNET." }, { status: 404 });
  }

  if (!event.locked_date_id) {
    return NextResponse.json({ error: "UPPDRAG EJ AKTIVERAT." }, { status: 404 });
  }

  const { data: lockedDate, error: dateError } = await supabase
    .from("candidate_dates")
    .select("id, date")
    .eq("id", event.locked_date_id)
    .single();

  if (dateError || !lockedDate) {
    return NextResponse.json({ error: "UPPDRAGSDATUM EJ FUNNET." }, { status: 500 });
  }

  return NextResponse.json({
    eventName: event.name,
    lockedDate: lockedDate.date,
    missionRef: missionToken.slice(0, 8).toUpperCase(),
    bringItems: event.bring_items ?? [],
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ missionToken: string }> }
) {
  const { missionToken } = await params;
  const { name } = await req.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Namn krävs." }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, locked_date_id")
    .eq("mission_token", missionToken)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "UPPDRAG EJ FUNNET." }, { status: 404 });
  }

  if (!event.locked_date_id) {
    return NextResponse.json({ error: "UPPDRAG EJ AKTIVERAT." }, { status: 400 });
  }

  const trimmedName = name.trim();

  // Dedup by name (case-insensitive), same as /api/friends
  const { data: existing } = await supabase
    .from("friends")
    .select("id, token, name")
    .eq("event_id", event.id)
    .ilike("name", trimmedName)
    .maybeSingle();

  let friendId: string;
  let friendName: string;
  let returning = false;

  if (existing) {
    friendId = existing.id;
    friendName = existing.name;
    returning = true;
  } else {
    const friendToken = uuidv4();
    const { data: friend, error: friendError } = await supabase
      .from("friends")
      .insert({ event_id: event.id, name: trimmedName, token: friendToken })
      .select()
      .single();

    if (friendError || !friend) {
      console.error(friendError);
      return NextResponse.json({ error: "Registrering misslyckades." }, { status: 500 });
    }

    friendId = friend.id;
    friendName = friend.name;
  }

  // Upsert availability for the locked date
  const { error: availError } = await supabase
    .from("availabilities")
    .upsert(
      { friend_id: friendId, candidate_date_id: event.locked_date_id },
      { onConflict: "friend_id,candidate_date_id" }
    );

  if (availError) {
    console.error(availError);
    return NextResponse.json({ error: "Kunde inte spara svar." }, { status: 500 });
  }

  return NextResponse.json({ accepted: true, name: friendName, returning });
}

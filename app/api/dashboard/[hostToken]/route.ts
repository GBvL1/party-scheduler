import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hostToken: string }> }
) {
  const { hostToken } = await params;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, created_at, locked_date_id, mission_token, bring_items")
    .eq("host_token", hostToken)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (eventError) {
    console.error("Event fetch error:", eventError);
    return NextResponse.json({ error: "Failed to load event." }, { status: 500 });
  }

  const { data: candidateDates, error: datesError } = await supabase
    .from("candidate_dates")
    .select("id, date")
    .eq("event_id", event.id)
    .order("date", { ascending: true });

  if (datesError) {
    return NextResponse.json({ error: "Failed to load dates." }, { status: 500 });
  }

  const { data: friends, error: friendsError } = await supabase
    .from("friends")
    .select("id, name, token, created_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: true });

  if (friendsError) {
    return NextResponse.json({ error: "Failed to load friends." }, { status: 500 });
  }

  const { data: availabilities } = await supabase
    .from("availabilities")
    .select("friend_id, candidate_date_id")
    .in(
      "friend_id",
      (friends ?? []).map((f) => f.id)
    );

  // Build a map: dateId -> [friend names]
  const friendMap = new Map((friends ?? []).map((f) => [f.id, f.name]));
  const dateAvailability = new Map<string, string[]>();
  const respondedFriendIds = new Set((availabilities ?? []).map((a) => a.friend_id));

  for (const cd of candidateDates ?? []) {
    dateAvailability.set(cd.id, []);
  }

  for (const av of availabilities ?? []) {
    const name = friendMap.get(av.friend_id);
    if (name) {
      dateAvailability.get(av.candidate_date_id)?.push(name);
    }
  }

  const datesWithCounts = (candidateDates ?? [])
    .map((cd) => ({
      id: cd.id,
      date: cd.date,
      availableFriends: dateAvailability.get(cd.id) ?? [],
    }))
    .sort((a, b) => b.availableFriends.length - a.availableFriends.length);

  return NextResponse.json({
    eventName: event.name,
    createdAt: event.created_at,
    lockedDateId: event.locked_date_id ?? null,
    missionToken: event.mission_token ?? null,
    bringItems: event.bring_items ?? [],
    friends: (friends ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      token: f.token,
      hasResponded: respondedFriendIds.has(f.id),
    })),
    dates: datesWithCounts,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ hostToken: string }> }
) {
  const { hostToken } = await params;
  const { bringItems } = await req.json();

  if (!Array.isArray(bringItems)) {
    return NextResponse.json({ error: "bringItems must be an array." }, { status: 400 });
  }

  const cleaned = bringItems
    .filter((i): i is string => typeof i === "string" && !!i.trim())
    .map((i) => i.trim());

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("host_token", hostToken)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("events")
    .update({ bring_items: cleaned })
    .eq("host_token", hostToken);

  if (error) {
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }

  return NextResponse.json({ success: true, bringItems: cleaned });
}

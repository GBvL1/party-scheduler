import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hostToken: string }> }
) {
  const { hostToken } = await params;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, created_at")
    .eq("host_token", hostToken)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
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
    friends: (friends ?? []).map((f) => ({ id: f.id, name: f.name, token: f.token })),
    dates: datesWithCounts,
  });
}

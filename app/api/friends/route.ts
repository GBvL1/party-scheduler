import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const { hostToken, name } = await req.json();

  if (!hostToken || !name) {
    return NextResponse.json({ error: "hostToken and name are required." }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("host_token", hostToken)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const friendToken = uuidv4();

  const { data: friend, error: friendError } = await supabase
    .from("friends")
    .insert({ event_id: event.id, name: name.trim(), token: friendToken })
    .select()
    .single();

  if (friendError || !friend) {
    console.error(friendError);
    return NextResponse.json({ error: "Failed to add friend." }, { status: 500 });
  }

  return NextResponse.json({ friendToken, friendId: friend.id, name: friend.name });
}

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Kind = "post" | "reel" | "tweet" | "event" | "ticket" | "news";

export const CONTENT_SELECT = `*,
  author:profiles(*),
  ticket_types(*),
  likes(user_id),
  comment_count:comments(count),
  comments(id, body, created_at, author:profiles(username, display_name, avatar_url))`;

export type ContentRow = Tables<"contents"> & {
  author: Tables<"profiles"> | null;
  ticket_types: Tables<"ticket_types">[];
  likes: { user_id: string }[];
  comment_count: { count: number }[];
  comments: {
    id: string;
    body: string;
    created_at: string;
    author: { username: string; display_name: string; avatar_url: string | null } | null;
  }[];
};

export const KIND_LABEL: Record<Kind, string> = {
  post: "Post",
  reel: "Reel",
  tweet: "Tweet",
  event: "Event",
  ticket: "Tickets",
  news: "News",
};

export const BUSINESS_KINDS: Kind[] = ["event", "ticket", "news"];

export async function fetchContents(opts: { kind?: Kind; kinds?: Kind[]; authorId?: string; search?: string; limit?: number } = {}) {
  let q = supabase
    .from("contents")
    .select(CONTENT_SELECT)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "comments", ascending: false })
    .limit(5, { referencedTable: "comments" })
    .limit(opts.limit ?? 40);
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.kinds) q = q.in("kind", opts.kinds);
  if (opts.authorId) q = q.eq("author_id", opts.authorId);
  if (opts.search) {
    const s = opts.search.replace(/[%,()]/g, " ");
    q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as ContentRow[];
}

export async function fetchContent(id: string) {
  const { data, error } = await supabase
    .from("contents")
    .select(CONTENT_SELECT)
    .eq("id", id)
    .order("created_at", { referencedTable: "comments", ascending: false })
    .limit(5, { referencedTable: "comments" })
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ContentRow | null;
}

/** Unread / read state for messages: returns or creates the 1:1 conversation. */
export async function openConversation(me: string, other: string) {
  const [a, b] = me < other ? [me, other] : [other, me];
  const existing = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
  if (existing.data) return existing.data.id;
  const { data, error } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
  if (error) throw error;
  return data.id;
}

export type ConnectionState = "none" | "sent" | "received" | "connected" | "self";

export function connectionState(me: string | null, other: string, row?: Tables<"connections"> | null): ConnectionState {
  if (!me) return "none";
  if (me === other) return "self";
  if (!row) return "none";
  if (row.status === "accepted") return "connected";
  return row.requester_id === me ? "sent" : "received";
}

export function formatPrice(n: number) {
  return n === 0 ? "Free" : `$${n.toFixed(2)}`;
}

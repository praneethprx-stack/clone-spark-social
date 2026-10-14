import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { connectionState } from "@/lib/social";
import { Button } from "@/components/ui/button";

export function useConnection(otherId: string) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["connection", userId, otherId],
    enabled: !!userId && userId !== otherId,
    queryFn: async () => {
      const { data } = await supabase
        .from("connections")
        .select("*")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`,
        )
        .maybeSingle();
      return data;
    },
  });
}

export function ConnectButton({ otherId, size = "sm" }: { otherId: string; size?: "sm" | "default" }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { data: row } = useConnection(otherId);
  const state = connectionState(userId, otherId, row);

  const m = useMutation({
    mutationFn: async (action: "connect" | "accept" | "remove") => {
      if (action === "connect") {
        const { error } = await supabase.from("connections").insert({ requester_id: userId!, addressee_id: otherId });
        if (error) throw error;
      } else if (action === "accept") {
        const { error } = await supabase.from("connections").update({ status: "accepted" }).eq("id", row!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("connections").delete().eq("id", row!.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connection"] });
      qc.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (state === "self" || !userId) return null;
  if (state === "none")
    return (
      <Button size={size} onClick={() => m.mutate("connect")} disabled={m.isPending}>
        Connect
      </Button>
    );
  if (state === "sent")
    return (
      <Button size={size} variant="secondary" onClick={() => m.mutate("remove")} disabled={m.isPending} title="Cancel request">
        Pending
      </Button>
    );
  if (state === "received")
    return (
      <div className="flex gap-2">
        <Button size={size} onClick={() => m.mutate("accept")} disabled={m.isPending}>
          Accept
        </Button>
        <Button size={size} variant="ghost" onClick={() => m.mutate("remove")} disabled={m.isPending}>
          Decline
        </Button>
      </div>
    );
  return (
    <Button
      size={size}
      variant="secondary"
      onClick={() => confirm("Disconnect?") && m.mutate("remove")}
      disabled={m.isPending}
    >
      Connected
    </Button>
  );
}

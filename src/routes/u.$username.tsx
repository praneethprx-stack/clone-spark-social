import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/u/$username")({
  head: () => ({ meta: [{ title: "Profile — SAC Community" }, { name: "description", content: "Member profile on SAC Community." }] }),
  component: () => <div className="p-10 text-center">Profile coming soon.</div>,
});

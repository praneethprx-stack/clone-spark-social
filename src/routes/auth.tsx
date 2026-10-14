import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — SAC Community" }, { name: "description", content: "Sign in to SAC Community." }] }),
  component: () => <div className="p-10 text-center">Sign in coming soon.</div>,
});

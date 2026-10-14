import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/create/$kind")({
  head: () => ({ meta: [{ title: "Create — SAC Community" }, { name: "description", content: "Create content on SAC Community." }] }),
  component: () => <div className="p-10 text-center">Create form coming soon.</div>,
});

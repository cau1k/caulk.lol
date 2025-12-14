import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight">About</h1>
        <p className="mt-4 text-muted-foreground">Hello "/about"!</p>
      </main>
    </HomeLayout>
  );
}

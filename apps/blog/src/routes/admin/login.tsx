import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { HomeLayout } from "@/components/layout/home";
import { buttonVariants } from "@/components/ui/button";
import { getAdminSession } from "@/lib/auth.functions";
import { cn } from "@/lib/cn";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/admin/login")({
  beforeLoad: async () => {
    const session = await getAdminSession();
    if (session) throw redirect({ to: "/admin/links" });
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError("Sign in failed.");
      return;
    }

    await router.navigate({ to: "/admin/links" });
  }

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-sm px-4 py-16">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        </header>

        <form className="flex flex-col gap-4" onSubmit={submit}>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted-foreground">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              className="h-10 bg-transparent border-b border-border outline-none focus:border-primary"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted-foreground">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-10 bg-transparent border-b border-border outline-none focus:border-primary"
              required
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            className={cn(buttonVariants({ color: "secondary" }), "mt-2")}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    </HomeLayout>
  );
}

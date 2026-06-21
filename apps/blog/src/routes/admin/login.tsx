import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { HomeLayout } from "@/components/layout/home";
import { buttonVariants } from "@/components/ui/button";
import { getAdminSession } from "@/lib/auth.functions";
import { cn } from "@/lib/cn";
import { baseOptions } from "@/lib/layout.shared";

const otpSentMessage =
  "In the event you have an account, you should receive an email with a OTP code.";

export const Route = createFileRoute("/admin/login")({
  beforeLoad: async () => {
    const session = await getAdminSession();
    if (session) throw redirect({ to: "/admin/links" });
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/email-otp/send-verification-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        type: "sign-in",
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError("Could not send a code.");
      return;
    }

    setSent(true);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/sign-in/email-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: "Admin", otp }),
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
          {sent && <p className="mt-3 text-sm text-muted-foreground">{otpSentMessage}</p>}
        </header>

        <form className="flex flex-col gap-4" onSubmit={sent ? verifyCode : sendCode}>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted-foreground">Email</span>
            <input
              type="email"
              autoComplete="email"
              className="h-10 bg-transparent border-b border-border outline-none focus:border-primary"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setOtp("");
                setSent(false);
              }}
              required
            />
          </label>
          {sent && (
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-muted-foreground">Code</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                className="h-10 bg-transparent border-b border-border outline-none focus:border-primary"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                required
              />
            </label>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            className={cn(buttonVariants({ color: "secondary" }), "mt-2")}
            disabled={isSubmitting || email.length === 0 || (sent && otp.length < 6)}
          >
            {isSubmitting ? "Working..." : sent ? "Verify code" : "Email code"}
          </button>
          {sent && (
            <button
              type="button"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              disabled={isSubmitting}
              onClick={() => {
                setSent(false);
                setOtp("");
              }}
            >
              Change email
            </button>
          )}
        </form>
      </main>
    </HomeLayout>
  );
}

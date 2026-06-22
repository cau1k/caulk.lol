import { Button } from "@caulk.lol/ui/components/button";
import { Input } from "@caulk.lol/ui/components/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@caulk.lol/ui/components/input-otp";
import { Label } from "@caulk.lol/ui/components/label";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, KeyRound, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

const otpSentMessage =
  "In the event you have an account, you should receive an email with a OTP code.";

export default function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const navigate = useNavigate({ from: "/" });
  const { isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isPending) {
    return <Loader />;
  }

  async function handleSendOTP() {
    setSubmitting(true);
    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error.message || result.error.statusText);
      return;
    }

    setSent(true);
    toast.success(otpSentMessage);
  }

  async function handleVerifyOTP() {
    setSubmitting(true);
    const result = await authClient.signIn.emailOtp({
      email,
      name: "Admin",
      otp,
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error.message || result.error.statusText);
      return;
    }

    goAfterSignIn({ navigate, redirectTo });
    toast.success("Signed in");
  }

  async function handlePasskeySignIn() {
    setSubmitting(true);
    const result = await authClient.signIn.passkey();
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error.message || result.error.statusText);
      return;
    }

    goAfterSignIn({ navigate, redirectTo });
    toast.success("Signed in");
  }

  if (sent) {
    return (
      <AuthPanel title="Enter Code" description={otpSentMessage}>
        <form
          className="flex w-full max-w-md flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            handleVerifyOTP();
          }}
        >
          <div className="flex flex-col gap-3">
            <Label htmlFor="otp">Code</Label>
            <InputOTP
              autoComplete="off"
              containerClassName="w-full justify-between"
              id="otp"
              maxLength={6}
              value={otp}
              onChange={setOtp}
            >
              <InputOTPGroup className="flex-1">
                <InputOTPSlot className="h-12 flex-1 text-[21px]" index={0} />
                <InputOTPSlot className="h-12 flex-1 text-[21px]" index={1} />
                <InputOTPSlot className="h-12 flex-1 text-[21px]" index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup className="flex-1">
                <InputOTPSlot className="h-12 flex-1 text-[21px]" index={3} />
                <InputOTPSlot className="h-12 flex-1 text-[21px]" index={4} />
                <InputOTPSlot className="h-12 flex-1 text-[21px]" index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            type="submit"
            className="w-full"
            aria-busy={submitting}
            disabled={submitting || otp.length < 6}
          >
            <Check data-icon="inline-start" />
            Verify Code
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={submitting}
            onClick={() => {
              setSent(false);
              setOtp("");
            }}
          >
            <ArrowLeft data-icon="inline-start" />
            Change Email
          </Button>
        </form>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel title="Admin Sign In" description="caulk.lol admin">
      <form
        className="flex w-full max-w-md flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          handleSendOTP();
        }}
      >
        <div className="flex flex-col gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setSent(false);
              setOtp("");
            }}
          />
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={submitting || email.length === 0}
          >
            <Mail data-icon="inline-start" />
            Email Code
          </Button>
        </div>
      </form>

      <div className="flex w-full max-w-md items-center justify-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        className="w-full max-w-md"
        disabled={submitting}
        onClick={handlePasskeySignIn}
      >
        <KeyRound data-icon="inline-start" />
        Use Passkey
      </Button>
    </AuthPanel>
  );
}

function goAfterSignIn({
  navigate,
  redirectTo,
}: {
  navigate: ReturnType<typeof useNavigate>;
  redirectTo?: string;
}) {
  if (isSafeLocalRedirect(redirectTo)) {
    window.location.assign(redirectTo);
    return;
  }

  navigate({ to: "/dashboard" });
}

function isSafeLocalRedirect(value: string | undefined): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

function AuthPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted px-4 py-12">
      <div className="flex w-full max-w-xl flex-col items-center gap-8 border bg-background p-6 sm:p-8">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-[32px] font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

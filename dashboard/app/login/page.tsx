"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ForceLightTheme } from "@/components/force-light-theme";

// Called before every Supabase signUp()/resend() -- those are what actually
// send the email, and they're called directly from the browser with the
// anon key, so this is the only thing standing between a bored user and an
// unlimited number of emails to one address. Supabase's own send limit is
// per-project, not per-email, so it doesn't cover this case.
async function checkVerificationRateLimit(email: string) {
  try {
    await api.post("/v1/auth/verification-send", { email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.startsWith("429")) {
      throw new Error("Too many verification emails sent to this address today. Please try again tomorrow.");
    }
    // Any other failure (e.g. the backend being briefly unreachable)
    // shouldn't block a real signup/resend -- fail open.
  }
}

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  // "verify" only ever follows a fresh signup -- confirming the code Supabase
  // just emailed is what actually creates the session (verifyOtp returns one
  // directly), so there's no separate "log in after verifying" step.
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        // Deliberately not going through our own backend -- Supabase's own
        // signUp() is what triggers its "Confirm signup" email (a numeric
        // code -- 8 digits by default, confirmed live -- per the template
        // configured in the Supabase dashboard).
        // The admin API (used here previously) creates the user just fine
        // but never sends that email at all -- confirmed live before
        // switching this over.
        await checkVerificationRateLimit(email);
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setStep("verify");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Supabase rejects the password check itself with this message
          // when the account exists but was never confirmed -- previously
          // that just left the user stuck on this form with a red error and
          // no way forward, so send them back into the code flow instead
          // (with a fresh code waiting, since any earlier one may have
          // expired by now).
          if (error.message.toLowerCase().includes("not confirmed")) {
            setStep("verify");
            await checkVerificationRateLimit(email);
            await supabase.auth.resend({ type: "signup", email });
            return;
          }
          throw error;
        }
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work. Check it and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    try {
      await checkVerificationRateLimit(email);
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend the code. Please try again.");
    }
  }

  if (step === "verify") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
        <ForceLightTheme />
        <div className="w-full max-w-[360px]">
          <div className="mb-6 flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
            <img src="/logo.png" alt="" width={36} height={36} className="mb-3 rounded-md" />
            <h1 className="text-lg font-semibold tracking-tight">Check your email</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a verification code to <span className="font-medium text-foreground">{email}</span>.
            </p>
          </div>

          <Card className="p-6 shadow-subtle">
            <form onSubmit={handleVerify} className="space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                required
                autoFocus
                // Supabase's own OTP length isn't a fixed 6 -- confirmed
                // live it sends 8 digits by default. Not hardcoding a
                // specific length here beyond "clearly not empty", so
                // this doesn't silently truncate/block a valid code
                // again if that length ever changes.
                maxLength={10}
                placeholder="• • • • • • • •"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-14 rounded-lg border-[#c5e0c2] bg-[#f2f8f1] text-center font-mono text-2xl font-semibold tracking-[0.4em] text-[#2f5d3a] placeholder:text-[#9dbb98] focus-visible:border-[#2f5d3a] focus-visible:ring-[#2f5d3a]/20"
              />
              {error &&
                (error.toLowerCase().includes("security purposes") ? (
                  <p className="text-center text-[13px] text-muted-foreground">{error}</p>
                ) : (
                  <p className="text-center text-[13px] text-error">{error}</p>
                ))}
              <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
                {loading ? "Verifying..." : "Verify and continue"}
              </Button>
            </form>
          </Card>

          <button
            type="button"
            onClick={handleResend}
            className="mt-4 w-full text-center text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {resent ? "Code resent — check your email" : "Didn't get it? Resend code"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <ForceLightTheme />
      <div className="w-full max-w-[360px]">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
          <img src="/logo.png" alt="" width={36} height={36} className="mb-3 rounded-md" />
          <h1 className="text-lg font-semibold tracking-tight">
            {mode === "signin" ? "Log in to Tracyn" : "Create your Tracyn account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Welcome back." : "We'll email you a code to confirm it's really you."}
          </p>
        </div>

        <Card className="p-5 shadow-subtle">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <Input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            {error && <p className="text-[13px] text-error">{error}</p>}
            <Button type="submit" className="w-full !mt-4" disabled={loading}>
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </Card>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="mt-4 w-full text-center text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

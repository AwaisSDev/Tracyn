"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { api } from "@/lib/api";
import { AuthShell, authButtonClass, authInputClass, authLinkClass } from "@/components/home/auth-shell";
import { safeNext } from "@/lib/safe-next";

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

  // `?next=` (from the middleware, or a pricing page plan button) is where
  // to land after signing in; `?mode=signup` opens the sign-up form first.
  // Read from window rather than useSearchParams so this page doesn't need
  // a Suspense boundary.
  const [next, setNext] = useState<string>(safeNext(null));
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(safeNext(params.get("next")));
    if (params.get("mode") === "signup") setMode("signup");
  }, []);

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
        router.push(next);
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
      router.push(next);
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
      <AuthShell
        title="Check your email"
        subtitle={
          <>
            We sent a verification code to <span className="font-medium text-[var(--cv-ink)]">{email}</span>.
          </>
        }
        below={
          <button type="button" onClick={handleResend} className={authLinkClass}>
            {resent ? "Code resent. Check your email" : "Didn't get it? Resend code"}
          </button>
        }
      >
        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            // Supabase's own OTP length isn't a fixed 6 -- confirmed
            // live it sends 8 digits by default. Not hardcoding a
            // specific length here beyond "clearly not empty", so
            // this doesn't silently truncate/block a valid code
            // again if that length ever changes.
            maxLength={10}
            placeholder="• • • • • • • •"
            aria-label="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="h-14 w-full rounded-[12px] border border-[#c9d6f7] bg-[#eef3ff] text-center font-mono text-2xl font-semibold tracking-[0.4em] text-[var(--cv-blue-bright)] outline-none transition-[border-color,box-shadow] placeholder:text-[#9fb2ea] focus:border-[var(--cv-blue-bright)] focus:shadow-[0_0_0_4px_rgba(53,83,212,0.12)]"
          />
          {error &&
            (error.toLowerCase().includes("security purposes") ? (
              <p className="text-center text-[13px] text-[var(--cv-fg-2)]">{error}</p>
            ) : (
              <p className="text-center text-[13px] text-error">{error}</p>
            ))}
          <button type="submit" className={authButtonClass} disabled={loading || code.length < 6}>
            {loading ? "Verifying..." : "Verify and continue"}
          </button>
        </form>
      </AuthShell>
    );
  }

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  };

  return (
    <AuthShell
      title={mode === "signin" ? "Welcome back" : "Create your account"}
      subtitle={mode === "signin" ? "Log in to your Tracyn workspace." : "Start free. We'll email you a code to confirm it's really you."}
      topRight={
        <p className="text-[14px] text-[var(--cv-fg-2)]">
          <span className="hidden sm:inline">{mode === "signin" ? "New to Tracyn? " : "Have an account? "}</span>
          <button type="button" onClick={switchMode} className={authLinkClass}>
            {mode === "signin" ? "Sign up" : "Log in"}
          </button>
        </p>
      }
      below={
        <p className="text-[14px] text-[var(--cv-fg-2)]">
          {mode === "signin" ? "Need an account? " : "Already have an account? "}
          <button type="button" onClick={switchMode} className={authLinkClass}>
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-[13.5px] font-medium text-[var(--cv-ink)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={authInputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-[13.5px] font-medium text-[var(--cv-ink)]">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            placeholder={mode === "signin" ? "Your password" : "At least 6 characters"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className={authInputClass}
          />
        </div>
        {error && <p className="text-[13px] text-error">{error}</p>}
        <button type="submit" className={`${authButtonClass} !mt-6`} disabled={loading}>
          {loading ? "Please wait..." : mode === "signin" ? "Log in" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}

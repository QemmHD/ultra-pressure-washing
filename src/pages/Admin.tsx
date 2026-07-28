import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";
import {
  AdminApiError,
  type AdminQuote,
  type AdminReview,
  type AdminSession,
  type QuoteStatus,
  type ReviewStatus,
  listAdminQuotes,
  listAdminReviews,
  updateAdminQuoteStatus,
  updateAdminReviewStatus,
  verifyAdminSession,
} from "../lib/admin-api";
import {
  ADMIN_PASSWORD_RECOVERY_URL,
  getAdminSupabaseClient,
  isAdminAuthConfigured,
  isAdminPasswordRecoveryAvailable,
} from "../lib/supabase-client";
import {
  getBrowserBackendRuntimeMode,
  type BackendRuntimeMode,
} from "../lib/backend-runtime";
import { createRouteMeta, ADMIN_ROUTE } from "../data/routes";

export const meta = () => createRouteMeta(ADMIN_ROUTE);

type AuthPhase =
  | "checking"
  | "unavailable"
  | "signed-out"
  | "recovery-request"
  | "password-recovery"
  | "mfa-enrollment"
  | "mfa-challenge"
  | "dashboard"
  | "denied";

type DashboardTab =
  | "overview"
  | "quotes"
  | "reviews"
  | "settings"
  | "security";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

const QUOTE_STATUSES: readonly QuoteStatus[] = [
  "new",
  "contacted",
  "scheduled",
  "completed",
  "archived",
  "spam",
];

const REVIEW_STATUSES: readonly ReviewStatus[] = [
  "pending",
  "approved",
  "rejected",
  "archived",
];

function readableError(error: unknown): string {
  if (error instanceof AdminApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "The secure request could not be completed.";
}

function titleCase(value: string): string {
  return value
    .split(/[-_]/)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function Admin() {
  const [configured, setConfigured] = useState(false);
  const [configurationChecked, setConfigurationChecked] = useState(false);
  const [backendMode, setBackendMode] =
    useState<BackendRuntimeMode>("preview");
  const [passwordRecoveryAvailable, setPasswordRecoveryAvailable] =
    useState(false);
  const [phase, setPhase] = useState<AuthPhase>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [quotes, setQuotes] = useState<AdminQuote[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const evaluationId = useRef(0);

  useEffect(() => {
    setBackendMode(getBrowserBackendRuntimeMode());
    setPasswordRecoveryAvailable(isAdminPasswordRecoveryAvailable());
    const nextConfigured = isAdminAuthConfigured();
    setConfigured(nextConfigured);
    setConfigurationChecked(true);
    if (!nextConfigured) setPhase("unavailable");
  }, []);

  useEffect(() => {
    if (!configurationChecked || phase === "checking") return;

    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>("[data-admin-phase-heading]")
        ?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [configurationChecked, phase]);

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    setError("");

    try {
      const [nextQuotes, nextReviews] = await Promise.all([
        listAdminQuotes(),
        listAdminReviews(),
      ]);
      setQuotes(nextQuotes);
      setReviews(nextReviews);
    } catch (nextError) {
      setError(readableError(nextError));
    } finally {
      setLoadingData(false);
    }
  }, []);

  const evaluateSession = useCallback(
    async (session: Session) => {
      const client = getAdminSupabaseClient();
      if (!client) {
        setPhase("unavailable");
        return;
      }

      const currentEvaluation = ++evaluationId.current;
      setBusy(true);
      setError("");

      try {
        const { data: userData, error: userError } =
          await client.auth.getUser(session.access_token);

        if (userError || !userData.user) {
          throw new Error("Your session could not be verified. Sign in again.");
        }

        const [{ data: factorData, error: factorError }, aalResult] =
          await Promise.all([
            client.auth.mfa.listFactors(),
            client.auth.mfa.getAuthenticatorAssuranceLevel(
              session.access_token,
            ),
          ]);

        if (factorError) throw factorError;
        if (aalResult.error) throw aalResult.error;
        if (currentEvaluation !== evaluationId.current) return;

        const verifiedFactors = factorData.all.filter(
          (factor) => factor.status === "verified",
        );
        const currentLevel = aalResult.data.currentLevel;

        if (verifiedFactors.length > 0 && currentLevel !== "aal2") {
          setMfaFactorId(verifiedFactors[0].id);
          setPhase("mfa-challenge");
          return;
        }

        const verifiedAdmin = await verifyAdminSession();
        if (currentEvaluation !== evaluationId.current) return;

        setAdminSession(verifiedAdmin);

        if (verifiedFactors.length === 0) {
          setPhase("mfa-enrollment");
          return;
        }

        if (currentLevel !== "aal2") {
          throw new Error(
            "Multi-factor verification is required before opening the dashboard.",
          );
        }

        setPhase("dashboard");
        await loadDashboard();
      } catch (nextError) {
        if (currentEvaluation !== evaluationId.current) return;

        const apiError =
          nextError instanceof AdminApiError ? nextError : null;
        if (
          apiError?.code === "admin_unavailable" ||
          apiError?.status === 404 ||
          apiError?.status === 503
        ) {
          setPhase("unavailable");
        } else {
          setPhase("denied");
        }
        setError(readableError(nextError));
      } finally {
        if (currentEvaluation === evaluationId.current) setBusy(false);
      }
    },
    [loadDashboard],
  );

  useEffect(() => {
    if (!configurationChecked || !configured) return;

    const client = getAdminSupabaseClient();
    if (!client) {
      setPhase("unavailable");
      return;
    }

    let active = true;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        if (!active) return;

        if (event === "PASSWORD_RECOVERY") {
          if (!passwordRecoveryAvailable) {
            setPhase("signed-out");
            setError("");
            setNotice(
              "Password recovery email is disabled in this staging rehearsal.",
            );
            return;
          }
          setPhase("password-recovery");
          setError("");
          return;
        }

        if (event === "SIGNED_OUT" || !session) {
          evaluationId.current += 1;
          setAdminSession(null);
          setQuotes([]);
          setReviews([]);
          setPhase("signed-out");
          return;
        }

        if (
          event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "MFA_CHALLENGE_VERIFIED"
        ) {
          void evaluateSession(session);
        }
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [
    configurationChecked,
    configured,
    evaluateSession,
    passwordRecoveryAvailable,
  ]);

  const dashboardCounts = useMemo(
    () => ({
      newQuotes: quotes.filter((quote) => quote.status === "new").length,
      scheduled: quotes.filter((quote) => quote.status === "scheduled").length,
      pendingReviews: reviews.filter((review) => review.status === "pending")
        .length,
    }),
    [quotes, reviews],
  );
  const canWrite =
    adminSession?.role === "owner" || adminSession?.role === "admin";

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = getAdminSupabaseClient();
    if (!client) {
      setPhase("unavailable");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    const { data, error: signInError } =
      await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    setPassword("");

    if (signInError || !data.session) {
      setError("The email or password could not be verified.");
      setBusy(false);
      return;
    }

    await evaluateSession(data.session);
  };

  const handleRecoveryRequest = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!passwordRecoveryAvailable) {
      setPhase("signed-out");
      setNotice("");
      setError(
        "Password recovery email is disabled in this staging rehearsal.",
      );
      return;
    }

    const client = getAdminSupabaseClient();
    if (!client) {
      setPhase("unavailable");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    const { error: recoveryError } =
      await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: ADMIN_PASSWORD_RECOVERY_URL,
      });

    if (recoveryError) {
      setError("A recovery email could not be requested. Try again later.");
    } else {
      setNotice(
        "If that email belongs to an approved admin, password recovery instructions were sent.",
      );
    }
    setBusy(false);
  };

  const handlePasswordUpdate = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const client = getAdminSupabaseClient();
    if (!client) {
      setPhase("unavailable");
      return;
    }

    setError("");
    setNotice("");

    if (newPassword.length < 14) {
      setError("Use a password with at least 14 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await client.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError("The password could not be updated. Request a new recovery link.");
    } else {
      setNewPassword("");
      setConfirmPassword("");
      await client.auth.signOut({ scope: "global" });
      setNotice("Password updated. Sign in again with the new password.");
      setPhase("signed-out");
    }
    setBusy(false);
  };

  const beginMfaEnrollment = async () => {
    const client = getAdminSupabaseClient();
    if (!client) {
      setPhase("unavailable");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    const { data, error: enrollmentError } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Ultra Admin ${new Date().toISOString()}`,
    });

    if (enrollmentError) {
      setError(
        "Authenticator setup could not begin. Sign out and try again.",
      );
    } else {
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setMfaFactorId(data.id);
    }
    setBusy(false);
  };

  const handleMfaVerification = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const client = getAdminSupabaseClient();
    const factorId = enrollment?.factorId ?? mfaFactorId;
    if (!client || !factorId) {
      setError("The authenticator challenge expired. Sign in again.");
      return;
    }

    const code = mfaCode.replace(/\D/g, "");
    if (code.length !== 6) {
      setError("Enter the six-digit code from your authenticator app.");
      return;
    }

    setBusy(true);
    setError("");

    const { data, error: verifyError } =
      await client.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

    setMfaCode("");

    if (verifyError || !data) {
      setError("That authenticator code could not be verified.");
      setBusy(false);
      return;
    }

    setEnrollment(null);
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      setError("The upgraded session could not be loaded. Sign in again.");
      setBusy(false);
      return;
    }

    await evaluateSession(sessionData.session);
  };

  const handleSignOut = async () => {
    const client = getAdminSupabaseClient();
    evaluationId.current += 1;
    setBusy(true);
    setError("");
    setNotice("");

    if (client) await client.auth.signOut({ scope: "local" });

    setAdminSession(null);
    setQuotes([]);
    setReviews([]);
    setMfaFactorId(null);
    setEnrollment(null);
    setPhase(configured ? "signed-out" : "unavailable");
    setBusy(false);
  };

  const handleQuoteStatus = async (
    quote: AdminQuote,
    status: QuoteStatus,
  ) => {
    if (status === quote.status) return;

    setUpdatingId(quote.id);
    setError("");
    setNotice("");

    try {
      const updated = await updateAdminQuoteStatus(quote.id, status);
      setQuotes((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(`Quote marked ${titleCase(status)}.`);
    } catch (nextError) {
      setError(readableError(nextError));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReviewStatus = async (
    review: AdminReview,
    status: ReviewStatus,
  ) => {
    if (status === review.status) return;
    if (status === "approved" && !review.consentToPublish) {
      setError("This review cannot be approved without publication consent.");
      return;
    }

    setUpdatingId(review.id);
    setError("");
    setNotice("");

    try {
      const updated = await updateAdminReviewStatus(review.id, status);
      setReviews((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(`Review marked ${titleCase(status)}.`);
    } catch (nextError) {
      setError(readableError(nextError));
    } finally {
      setUpdatingId(null);
    }
  };

  if (phase === "unavailable") {
    return (
      <AdminShell>
        <StatusCard
          icon={ShieldOff}
          eyebrow="Fail-Closed Admin"
          title="Secure Admin Is Unavailable"
          description="This build does not have an approved authentication configuration. No Supabase data, admin login, settings, review, or quote request was attempted."
        >
          <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            Local builds and ordinary deploy previews keep administration
            disabled. The integrated staging rehearsal activates only on its
            exact approved origin and isolated staging project. Production
            requires its separate approved configuration.
          </p>
        </StatusCard>
      </AdminShell>
    );
  }

  if (phase === "checking") {
    return (
      <AdminShell>
        <StatusCard
          icon={LoaderCircle}
          iconClassName="animate-spin"
          eyebrow="Secure Admin"
          title="Verifying Your Session"
          description="The dashboard will open only after the session, admin membership, and required authentication level are verified."
        />
      </AdminShell>
    );
  }

  if (phase === "denied") {
    return (
      <AdminShell>
        <StatusCard
          icon={ShieldOff}
          eyebrow="Access Denied"
          title="Admin Access Could Not Be Verified"
          description={
            error ||
            "This account is not an active administrator or does not meet the current security requirements."
          }
        >
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-white dark:text-slate-900"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sign Out
          </button>
        </StatusCard>
      </AdminShell>
    );
  }

  if (phase === "password-recovery") {
    return (
      <AdminShell>
        <AuthCard
          icon={KeyRound}
          title="Choose a New Password"
          description="Use a unique password with at least 14 characters. You will sign in again after it is changed."
          error={error}
          notice={notice}
        >
          <form onSubmit={handlePasswordUpdate} className="mt-7 space-y-5">
            <Field
              id="admin-new-password"
              label="New password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              minLength={14}
              required
            />
            <Field
              id="admin-confirm-password"
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              minLength={14}
              required
            />
            <PrimaryButton busy={busy}>Update Password</PrimaryButton>
          </form>
        </AuthCard>
      </AdminShell>
    );
  }

  if (phase === "mfa-enrollment") {
    return (
      <AdminShell>
        <AuthCard
          icon={Smartphone}
          title="Protect This Account"
          description="Set up an authenticator app before opening customer and quote information."
          error={error}
          notice={notice}
        >
          {!enrollment ? (
            <div className="mt-7">
              <ol className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li>1. Install or open your preferred authenticator app.</li>
                <li>2. Start setup to create a private QR code.</li>
                <li>3. Scan it and enter the six-digit verification code.</li>
              </ol>
              <button
                type="button"
                onClick={() => void beginMfaEnrollment()}
                disabled={busy}
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {busy ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                )}
                Begin Authenticator Setup
              </button>
            </div>
          ) : (
            <form onSubmit={handleMfaVerification} className="mt-7 space-y-5">
              <div className="rounded-2xl bg-white p-4 dark:bg-slate-950">
                <img
                  src={enrollment.qrCode}
                  width="240"
                  height="240"
                  className="mx-auto h-auto w-full max-w-60"
                  alt="Authenticator app enrollment QR code"
                />
              </div>
              <details className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
                <summary className="cursor-pointer font-bold text-slate-900 dark:text-white">
                  Cannot scan the QR code?
                </summary>
                <p className="mt-3 text-slate-600 dark:text-slate-300">
                  Enter this one-time setup secret manually and do not share it:
                </p>
                <code className="mt-2 block break-all rounded-lg bg-slate-100 p-3 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                  {enrollment.secret}
                </code>
              </details>
              <MfaCodeField value={mfaCode} onChange={setMfaCode} />
              <PrimaryButton busy={busy}>Verify and Continue</PrimaryButton>
            </form>
          )}
        </AuthCard>
      </AdminShell>
    );
  }

  if (phase === "mfa-challenge") {
    return (
      <AdminShell>
        <AuthCard
          icon={ShieldCheck}
          title="Authenticator Verification"
          description="Enter the current six-digit code from the authenticator app linked to this account."
          error={error}
          notice={notice}
        >
          <form onSubmit={handleMfaVerification} className="mt-7 space-y-5">
            <MfaCodeField value={mfaCode} onChange={setMfaCode} autoFocus />
            <PrimaryButton busy={busy}>Verify Secure Session</PrimaryButton>
          </form>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-5 w-full rounded-lg py-2 text-sm font-bold text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-slate-300 dark:hover:text-white"
          >
            Sign out and use another account
          </button>
        </AuthCard>
      </AdminShell>
    );
  }

  if (phase === "recovery-request") {
    return (
      <AdminShell>
        <AuthCard
          icon={Mail}
          title="Password Recovery"
          description="Enter the approved admin email. The response will not reveal whether an account exists."
          error={error}
          notice={notice}
        >
          <form onSubmit={handleRecoveryRequest} className="mt-7 space-y-5">
            <Field
              id="admin-recovery-email"
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <PrimaryButton busy={busy}>Send Recovery Instructions</PrimaryButton>
          </form>
          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
              setPhase("signed-out");
            }}
            className="mt-5 w-full rounded-lg py-2 text-sm font-bold text-blue-700 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-blue-300 dark:hover:text-blue-100"
          >
            Return to sign in
          </button>
        </AuthCard>
      </AdminShell>
    );
  }

  if (phase === "signed-out") {
    return (
      <AdminShell>
        <AuthCard
          icon={LockKeyhole}
          title="Secure Admin Access"
          description={
            backendMode === "staging"
              ? "Sign in with an approved staging test account. Production accounts and customer data are not connected."
              : "Sign in with an approved owner account. Password and authenticator verification replace the former browser-only password."
          }
          error={error}
          notice={notice}
        >
          {backendMode === "staging" && (
            <div
              role="note"
              className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
            >
              Integrated staging rehearsal — use the staging test account only.
              Password-recovery email and all production systems are disabled.
            </div>
          )}
          <form onSubmit={handleLogin} className="mt-7 space-y-5">
            <Field
              id="admin-email"
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="username"
              required
            />
            <Field
              id="admin-password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
            />
            <PrimaryButton busy={busy}>Sign In Securely</PrimaryButton>
          </form>
          {passwordRecoveryAvailable && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setNotice("");
                setPhase("recovery-request");
              }}
              className="mt-5 w-full rounded-lg py-2 text-sm font-bold text-blue-700 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-blue-300 dark:hover:text-blue-100"
            >
              Forgot your password?
            </button>
          )}
        </AuthCard>
      </AdminShell>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-32 pb-28 dark:bg-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 dark:border-slate-700 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-black tracking-[0.18em] text-blue-700 uppercase dark:text-blue-300">
              Verified Secure Session
            </p>
            <h1
              data-admin-phase-heading
              tabIndex={-1}
              className="mt-2 text-4xl font-black text-slate-950 outline-none dark:text-white"
            >
              Admin Dashboard
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Customer data is available only through authenticated,
              authorization-checked requests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={busy}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 transition hover:border-blue-400 hover:text-blue-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sign Out
          </button>
        </header>

        {backendMode === "staging" && (
          <div
            role="note"
            className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          >
            Staging rehearsal — all records shown here belong to the isolated
            staging project. Production data is not connected.
          </div>
        )}

        <div
          className="mt-6 min-h-6"
          aria-live="polite"
          aria-atomic="true"
        >
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          {!error && notice && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          )}
        </div>

        <nav
          aria-label="Admin dashboard sections"
          className="mt-5 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-700"
        >
          {(
            [
              ["overview", "Overview"],
              ["quotes", `Quotes (${quotes.length})`],
              ["reviews", `Reviews (${reviews.length})`],
              ["settings", "Site Settings"],
              ["security", "Security"],
            ] as const
          ).map(([tab, label]) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
              className={`min-h-12 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-black tracking-wider uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                activeTab === tab
                  ? "border-blue-600 text-blue-700 dark:text-blue-300"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {loadingData ? (
          <div className="flex min-h-80 items-center justify-center">
            <LoaderCircle
              className="h-10 w-10 animate-spin text-blue-600"
              aria-label="Loading secure admin data"
            />
          </div>
        ) : (
          <div className="mt-8">
            {activeTab === "overview" && (
              <OverviewPanel
                quotes={quotes}
                reviews={reviews}
                counts={dashboardCounts}
                onOpen={setActiveTab}
              />
            )}
            {activeTab === "quotes" && (
              <QuotesPanel
                quotes={quotes}
                updatingId={updatingId}
                onStatusChange={handleQuoteStatus}
                canWrite={canWrite}
              />
            )}
            {activeTab === "reviews" && (
              <ReviewsPanel
                reviews={reviews}
                updatingId={updatingId}
                onStatusChange={handleReviewStatus}
                canWrite={canWrite}
              />
            )}
            {activeTab === "settings" && <SettingsMigrationPanel />}
            {activeTab === "security" && (
              <SecurityPanel
                session={adminSession}
                onRefresh={() => void loadDashboard()}
                refreshing={loadingData}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-slate-50 px-4 pt-32 pb-24 dark:bg-slate-900">
      <div className="w-full max-w-2xl">
        <h1 className="sr-only">Admin Dashboard</h1>
        {children}
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  iconClassName = "",
  eyebrow,
  title,
  description,
  children,
}: {
  icon: typeof ShieldOff;
  iconClassName?: string;
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-12 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        <Icon className={`h-8 w-8 ${iconClassName}`} aria-hidden="true" />
      </div>
      <p className="mt-7 font-black tracking-widest text-blue-700 uppercase dark:text-blue-300">
        {eyebrow}
      </p>
      <h2
        data-admin-phase-heading
        tabIndex={-1}
        className="mt-3 text-4xl font-black text-slate-950 outline-none dark:text-white"
      >
        {title}
      </h2>
      <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
        {description}
      </p>
      {children && <div className="mt-8">{children}</div>}
    </section>
  );
}

function AuthCard({
  icon: Icon,
  title,
  description,
  error,
  notice,
  children,
}: {
  icon: typeof LockKeyhole;
  title: string;
  description: string;
  error: string;
  notice: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <h2
        data-admin-phase-heading
        tabIndex={-1}
        className="mt-7 text-3xl font-black text-slate-950 outline-none dark:text-white"
      >
        {title}
      </h2>
      <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
        {description}
      </p>
      <div aria-live="polite" aria-atomic="true">
        {error && (
          <p
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        {!error && notice && (
          <p
            role="status"
            className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            {notice}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  minLength,
  required,
}: {
  id: string;
  label: string;
  type: "email" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-black tracking-wider text-slate-700 uppercase dark:text-slate-200"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        spellCheck={false}
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
      />
    </div>
  );
}

function MfaCodeField({
  value,
  onChange,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor="admin-mfa-code"
        className="mb-2 block text-sm font-black tracking-wider text-slate-700 uppercase dark:text-slate-200"
      >
        Six-digit authenticator code
      </label>
      <input
        id="admin-mfa-code"
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        value={value}
        onChange={(event) =>
          onChange(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))
        }
        required
        className="min-h-14 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center text-2xl font-black tracking-[0.35em] text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
      />
    </div>
  );
}

function PrimaryButton({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      {busy && (
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

function OverviewPanel({
  quotes,
  reviews,
  counts,
  onOpen,
}: {
  quotes: AdminQuote[];
  reviews: AdminReview[];
  counts: {
    newQuotes: number;
    scheduled: number;
    pendingReviews: number;
  };
  onOpen: (tab: DashboardTab) => void;
}) {
  const cards = [
    {
      label: "Quote Requests",
      value: quotes.length,
      detail: `${counts.newQuotes} new`,
      icon: ClipboardList,
    },
    {
      label: "Scheduled",
      value: counts.scheduled,
      detail: "active appointments",
      icon: CheckCircle2,
    },
    {
      label: "Pending Reviews",
      value: counts.pendingReviews,
      detail: `${reviews.length} total`,
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <Icon className="h-7 w-7 text-blue-600 dark:text-blue-300" aria-hidden="true" />
            <p className="mt-5 text-sm font-black tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {label}
            </p>
            <p className="mt-1 text-4xl font-black text-slate-950 dark:text-white">
              {value}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {detail}
            </p>
          </article>
        ))}
      </div>

      <section
        aria-labelledby="admin-quick-actions"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <h2
          id="admin-quick-actions"
          className="text-2xl font-black text-slate-950 dark:text-white"
        >
          Secure Actions
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onOpen("quotes")}
            className="min-h-20 rounded-xl border border-slate-200 p-5 text-left font-bold text-slate-900 transition hover:border-blue-500 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:text-white dark:hover:bg-blue-950/30"
          >
            Review quote requests
          </button>
          <button
            type="button"
            onClick={() => onOpen("reviews")}
            className="min-h-20 rounded-xl border border-slate-200 p-5 text-left font-bold text-slate-900 transition hover:border-blue-500 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:text-white dark:hover:bg-blue-950/30"
          >
            Moderate customer reviews
          </button>
        </div>
      </section>
    </div>
  );
}

function QuotesPanel({
  quotes,
  updatingId,
  onStatusChange,
  canWrite,
}: {
  quotes: AdminQuote[];
  updatingId: string | null;
  onStatusChange: (quote: AdminQuote, status: QuoteStatus) => Promise<void>;
  canWrite: boolean;
}) {
  if (quotes.length === 0) {
    return <EmptyState icon={ClipboardList} title="No quote requests" />;
  }

  return (
    <section aria-labelledby="admin-quotes-heading">
      <h2
        id="admin-quotes-heading"
        className="text-2xl font-black text-slate-950 dark:text-white"
      >
        Quote Requests
      </h2>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Contact details are private customer information. Use them only to
        respond to the associated request.
      </p>
      {!canWrite && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Your editor role can review quote requests but cannot change their
          status.
        </p>
      )}
      <div className="mt-6 space-y-5">
        {quotes.map((quote) => {
          const fullName = `${quote.firstName} ${quote.lastName}`.trim();
          const isUpdating = updatingId === quote.id;

          return (
            <article
              key={quote.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-black text-slate-950 dark:text-white">
                      {fullName || "Customer"}
                    </h3>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black tracking-wider text-blue-800 uppercase dark:bg-blue-950 dark:text-blue-200">
                      {titleCase(quote.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Received {formatDate(quote.createdAt)}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor={`quote-status-${quote.id}`}
                    className="mb-2 block text-xs font-black tracking-wider text-slate-500 uppercase dark:text-slate-400"
                  >
                    Quote status
                  </label>
                  <select
                    id={`quote-status-${quote.id}`}
                    value={quote.status}
                    disabled={isUpdating || !canWrite}
                    onChange={(event) =>
                      void onStatusChange(
                        quote,
                        event.currentTarget.value as QuoteStatus,
                      )
                    }
                    className="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 font-bold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  >
                    {QUOTE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <dl className="mt-6 grid gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-700">
                <Detail label="Phone">
                  <a
                    href={`tel:${quote.phone}`}
                    className="font-bold text-blue-700 hover:underline dark:text-blue-300"
                  >
                    {quote.phone}
                  </a>
                </Detail>
                <Detail label="Contact preference">
                  {titleCase(quote.contactPreference)}
                </Detail>
                <Detail label="Email">
                  {quote.email ? (
                    <a
                      href={`mailto:${quote.email}`}
                      className="break-all font-bold text-blue-700 hover:underline dark:text-blue-300"
                    >
                      {quote.email}
                    </a>
                  ) : (
                    "Not provided"
                  )}
                </Detail>
                <Detail label="Property address">
                  {quote.propertyAddress}
                </Detail>
                <Detail label="Requested services">
                  {quote.serviceIds.length > 0
                    ? quote.serviceIds.map(titleCase).join(", ")
                    : "Not specified"}
                </Detail>
                <Detail label="Quote ID">
                  <code className="break-all text-xs">{quote.id}</code>
                </Detail>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ReviewsPanel({
  reviews,
  updatingId,
  onStatusChange,
  canWrite,
}: {
  reviews: AdminReview[];
  updatingId: string | null;
  onStatusChange: (review: AdminReview, status: ReviewStatus) => Promise<void>;
  canWrite: boolean;
}) {
  if (reviews.length === 0) {
    return <EmptyState icon={MessageSquare} title="No submitted reviews" />;
  }

  return (
    <section aria-labelledby="admin-reviews-heading">
      <h2
        id="admin-reviews-heading"
        className="text-2xl font-black text-slate-950 dark:text-white"
      >
        Review Moderation
      </h2>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        New submissions stay pending. Approve only genuine feedback with clear
        publication consent.
      </p>
      {!canWrite && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Your editor role can review submissions but cannot change moderation
          status.
        </p>
      )}
      <div className="mt-6 space-y-5">
        {reviews.map((review) => {
          const isUpdating = updatingId === review.id;

          return (
            <article
              key={review.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-black text-slate-950 dark:text-white">
                      {review.customerDisplayName}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black tracking-wider text-slate-700 uppercase dark:bg-slate-950 dark:text-slate-200">
                      {titleCase(review.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Submitted {formatDate(review.createdAt)}
                  </p>
                </div>
                <p className="font-black text-amber-600 dark:text-amber-300">
                  {review.rating} / 5
                </p>
              </div>

              <blockquote className="mt-5 border-l-4 border-blue-500 pl-4 leading-relaxed text-slate-700 dark:text-slate-200">
                {review.reviewText}
              </blockquote>

              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <Detail label="Service">
                  {review.serviceId
                    ? titleCase(review.serviceId)
                    : "Not specified"}
                </Detail>
                <Detail label="Publication consent">
                  {review.consentToPublish ? "Confirmed" : "Not confirmed"}
                </Detail>
              </dl>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
                {REVIEW_STATUSES.map((status) => (
                  <button
                    type="button"
                    key={status}
                    disabled={
                      isUpdating ||
                      !canWrite ||
                      status === review.status ||
                      (status === "approved" && !review.consentToPublish)
                    }
                    onClick={() => void onStatusChange(review, status)}
                    className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 transition hover:border-blue-500 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-600 dark:text-slate-100"
                  >
                    Mark {titleCase(status)}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SecurityPanel({
  session,
  onRefresh,
  refreshing,
}: {
  session: AdminSession | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <section
      aria-labelledby="admin-security-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <ShieldCheck className="h-9 w-9 text-blue-600 dark:text-blue-300" aria-hidden="true" />
      <h2
        id="admin-security-heading"
        className="mt-5 text-2xl font-black text-slate-950 dark:text-white"
      >
        Session Security
      </h2>
      <dl className="mt-6 grid gap-5 sm:grid-cols-2">
        <Detail label="Signed-in account">
          {session?.email ?? "Email unavailable"}
        </Detail>
        <Detail label="Authorized role">
          {session ? titleCase(session.role) : "Unavailable"}
        </Detail>
        <Detail label="Authenticator level">
          {session?.aal === "aal2" ? "AAL2 — MFA verified" : "AAL1"}
        </Detail>
        <Detail label="MFA enforcement">
          {session?.mfaRequired
            ? "Required by admin policy"
            : "Enrollment complete; enforcement pending migration"}
        </Detail>
      </dl>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-800 transition hover:border-blue-500 hover:text-blue-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-600 dark:text-slate-100"
      >
        <RefreshCw
          className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        Refresh Secure Data
      </button>
    </section>
  );
}

function SettingsMigrationPanel() {
  return (
    <section aria-labelledby="admin-settings-heading">
      <h2
        id="admin-settings-heading"
        className="text-2xl font-black text-slate-950 dark:text-white"
      >
        Site Settings
      </h2>
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="flex items-start gap-4">
          <LockKeyhole
            className="mt-0.5 h-6 w-6 shrink-0"
            aria-hidden="true"
          />
          <div>
            <h3 className="font-black">Secure settings migration pending</h3>
            <p className="mt-2 leading-relaxed">
              Existing production settings have not been connected to this
              security branch. They remain untouched. Settings editing stays
              unavailable until the current data is inventoried and a separate
              migration is reviewed and approved.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-black tracking-wider text-slate-500 uppercase dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-slate-800 dark:text-slate-100">{children}</dd>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
}: {
  icon: typeof ClipboardList;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <Icon className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" aria-hidden="true" />
      <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
        {title}
      </h2>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Nothing is waiting for review right now.
      </p>
    </section>
  );
}

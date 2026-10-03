"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, ShieldCheck } from "lucide-react";
import type {
  TwoFactorEnrolment,
  TwoFactorStatus,
} from "@urcommerce/api-client";
import {
  useConfirmTwoFactor,
  useDisableTwoFactor,
  useEnrolTwoFactor,
  useRegenerateRecoveryCodes,
  useTwoFactorStatus,
} from "@/api/profile";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CODE_FORMAT_HINT,
  isAuthenticatorCode,
  isPlausibleCode,
  normaliseCode,
} from "@/lib/two-factor-code";
import { RecoveryCodes } from "./recovery-codes";
import { InlineStatus, SettingsCard, errorText } from "./settings-card";

type Mode =
  | { kind: "idle" }
  | { kind: "enrolling"; enrolment: TwoFactorEnrolment }
  | { kind: "codes"; codes: string[]; message: string }
  | { kind: "verify"; action: "disable" | "regenerate" };

const LOW_RECOVERY_CODES = 3;

function StatusBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
      <Check className="size-3" aria-hidden />
      On
    </span>
  ) : (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      Off
    </span>
  );
}

function CodeForm({
  id,
  label,
  submitLabel,
  pendingLabel,
  pending,
  allowRecovery,
  destructive,
  onSubmit,
  onCancel,
}: {
  id: string;
  label: string;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  allowRecovery: boolean;
  destructive?: boolean;
  onSubmit: (code: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalised = normaliseCode(code);
    const valid = allowRecovery
      ? isPlausibleCode(normalised)
      : isAuthenticatorCode(normalised);
    if (!valid) {
      setError(
        allowRecovery
          ? CODE_FORMAT_HINT
          : "Enter the 6-digit code from your app.",
      );
      return;
    }
    setError(null);
    try {
      await onSubmit(normalised);
    } catch (cause) {
      setCode("");
      setError(errorText(cause, "That code did not work. Try again."));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <TextField
        id={id}
        label={label}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        autoFocus
        placeholder="123456"
        className="max-w-60 font-mono tracking-[0.2em]"
        error={error}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="md"
          shape="rounded"
          variant={destructive ? "destructive" : "primary"}
          loading={pending}
          loadingText={pendingLabel}
        >
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button
            size="md"
            shape="rounded"
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function CopyableSecret({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  const grouped = secret.match(/.{1,4}/g)?.join(" ") ?? secret;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="rounded-md bg-muted px-2.5 py-1.5 font-mono text-xs tracking-wider break-all">
        {grouped}
      </code>
      <Button
        size="xs"
        variant="ghost"
        leading={copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        onClick={() => {
          void navigator.clipboard.writeText(secret).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? "Copied" : "Copy key"}
      </Button>
    </div>
  );
}

function Enrolment({
  enrolment,
  onConfirmed,
  onCancel,
}: {
  enrolment: TwoFactorEnrolment;
  onConfirmed: (codes: string[]) => void;
  onCancel: () => void;
}) {
  const confirm = useConfirmTwoFactor();
  return (
    <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
      <Image
        unoptimized
        src={enrolment.qrCodeDataUrl}
        alt="QR code to add this account to your authenticator app"
        width={176}
        height={176}
        className="size-44 rounded-lg border bg-white p-2"
      />
      <div className="space-y-4">
        <ol className="list-decimal space-y-1.5 pl-4 text-sm">
          <li>
            Open an authenticator app such as Google Authenticator, Authy or
            1Password.
          </li>
          <li>Scan the QR code, or type in this key:</li>
        </ol>
        <CopyableSecret secret={enrolment.secret} />
        <p className="text-sm">3. Enter the 6-digit code the app shows.</p>
        <CodeForm
          id="two-factor-confirm-code"
          label="Code from your app"
          submitLabel="Turn on"
          pendingLabel="Checking…"
          pending={confirm.isPending}
          allowRecovery={false}
          onSubmit={async (code) => {
            const result = await confirm.mutateAsync(code);
            onConfirmed(result.recoveryCodes);
          }}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

function EnabledSummary({
  status,
  onVerify,
}: {
  status: TwoFactorStatus;
  onVerify: (action: "disable" | "regenerate") => void;
}) {
  const low = status.recoveryCodesRemaining <= LOW_RECOVERY_CODES;
  return (
    <div className="space-y-4">
      <p className="text-sm">
        Signing in asks for a code from your authenticator app after your
        password.
      </p>
      {low ? (
        <InlineStatus tone="warning">
          Only {status.recoveryCodesRemaining} recovery code
          {status.recoveryCodesRemaining === 1 ? "" : "s"} left. Make new ones
          before you run out.
        </InlineStatus>
      ) : (
        <p className="text-sm text-muted-foreground">
          {status.recoveryCodesRemaining} recovery codes left.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          shape="rounded"
          variant="outline"
          onClick={() => onVerify("regenerate")}
        >
          Make new recovery codes
        </Button>
        {status.required ? null : (
          <Button
            size="sm"
            shape="rounded"
            variant="destructive-ghost"
            onClick={() => onVerify("disable")}
          >
            Turn off
          </Button>
        )}
      </div>
      {status.required ? (
        <p className="text-xs text-muted-foreground">
          Required for store owners, so it cannot be turned off.
        </p>
      ) : null}
    </div>
  );
}

function VerifyAction({
  action,
  onDone,
  onCancel,
}: {
  action: "disable" | "regenerate";
  onDone: (codes: string[] | null) => void;
  onCancel: () => void;
}) {
  const disable = useDisableTwoFactor();
  const regenerate = useRegenerateRecoveryCodes();
  const isDisable = action === "disable";

  return (
    <div className="space-y-3">
      <p className="text-sm">
        {isDisable
          ? "Confirm with a code to turn off two-step verification. Your password alone will then sign you in."
          : "Confirm with a code. Your old recovery codes stop working straight away."}
      </p>
      <CodeForm
        id={`two-factor-${action}-code`}
        label="Authenticator or recovery code"
        submitLabel={isDisable ? "Turn off" : "Make new codes"}
        pendingLabel={isDisable ? "Turning off…" : "Making codes…"}
        pending={disable.isPending || regenerate.isPending}
        allowRecovery
        destructive={isDisable}
        onSubmit={async (code) => {
          if (isDisable) {
            await disable.mutateAsync(code);
            onDone(null);
            return;
          }
          const result = await regenerate.mutateAsync(code);
          onDone(result.recoveryCodes);
        }}
        onCancel={onCancel}
      />
    </div>
  );
}

function OffSummary({
  status,
  starting,
  error,
  onStart,
}: {
  status: TwoFactorStatus;
  starting: boolean;
  error: string | null;
  onStart: () => void;
}) {
  return (
    <div className="space-y-4">
      {status.required ? (
        <InlineStatus tone="warning">
          Store owners need two-step verification. Set it up now to protect your
          store.
        </InlineStatus>
      ) : (
        <p className="text-sm">
          Add a code from an authenticator app to every sign-in, so a stolen
          password is not enough to get into your account.
        </p>
      )}
      {error ? <InlineStatus tone="error">{error}</InlineStatus> : null}
      <Button
        size="md"
        shape="rounded"
        leading={<ShieldCheck aria-hidden />}
        loading={starting}
        loadingText="Preparing…"
        onClick={onStart}
      >
        Set up two-step verification
      </Button>
    </div>
  );
}

export function TwoFactorSettings({ accountEmail }: { accountEmail: string }) {
  const { data: status, isPending, isError } = useTwoFactorStatus();
  const enrol = useEnrolTwoFactor();
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [notice, setNotice] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const idle = () => setMode({ kind: "idle" });

  async function start() {
    setNotice(null);
    setStartError(null);
    try {
      const enrolment = await enrol.mutateAsync();
      setMode({ kind: "enrolling", enrolment });
    } catch (cause) {
      setStartError(errorText(cause, "Could not start set-up. Try again."));
    }
  }

  function body() {
    if (isPending) {
      return (
        <div className="space-y-2" aria-busy>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-9 w-48 rounded-lg" />
        </div>
      );
    }
    if (isError || !status) {
      return (
        <InlineStatus tone="error">
          Could not load your two-step verification settings.
        </InlineStatus>
      );
    }
    switch (mode.kind) {
      case "enrolling":
        return (
          <Enrolment
            enrolment={mode.enrolment}
            onCancel={idle}
            onConfirmed={(codes) =>
              setMode({
                kind: "codes",
                codes,
                message: "Two-step verification is on.",
              })
            }
          />
        );
      case "codes":
        return (
          <div className="space-y-4">
            <InlineStatus tone="success">{mode.message}</InlineStatus>
            <RecoveryCodes
              codes={mode.codes}
              accountEmail={accountEmail}
              onDone={idle}
            />
          </div>
        );
      case "verify":
        return (
          <VerifyAction
            action={mode.action}
            onCancel={idle}
            onDone={(codes) => {
              if (codes) {
                setMode({
                  kind: "codes",
                  codes,
                  message:
                    "New recovery codes are ready. The old ones no longer work.",
                });
                return;
              }
              setNotice("Two-step verification is off.");
              idle();
            }}
          />
        );
      case "idle":
        return status.enabled ? (
          <EnabledSummary
            status={status}
            onVerify={(action) => {
              setNotice(null);
              setMode({ kind: "verify", action });
            }}
          />
        ) : (
          <OffSummary
            status={status}
            starting={enrol.isPending}
            error={startError}
            onStart={() => void start()}
          />
        );
    }
  }

  return (
    <SettingsCard
      icon={ShieldCheck}
      title="Two-step verification"
      description="A code from your phone, on top of your password."
      aside={status ? <StatusBadge enabled={status.enabled} /> : null}
    >
      {notice && mode.kind === "idle" ? (
        <div className="mb-4">
          <InlineStatus tone="success">{notice}</InlineStatus>
        </div>
      ) : null}
      {body()}
    </SettingsCard>
  );
}

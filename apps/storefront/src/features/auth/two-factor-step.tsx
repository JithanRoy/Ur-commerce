"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useCompleteTwoFactor } from "@/api/auth";
import { apiErrorMessage } from "@/api/use-api-mutation";
import { TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  CODE_FORMAT_HINT,
  isPlausibleCode,
  normaliseCode,
} from "@/lib/two-factor-code";

export function TwoFactorStep({
  challengeToken,
  remember,
  onSignedIn,
  onBack,
}: {
  challengeToken: string;
  remember: boolean;
  onSignedIn: () => void;
  onBack: () => void;
}) {
  const complete = useCompleteTwoFactor();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalised = normaliseCode(code);
    if (!isPlausibleCode(normalised)) {
      setError(CODE_FORMAT_HINT);
      return;
    }
    setError(null);
    try {
      await complete.mutateAsync({
        challengeToken,
        code: normalised,
        remember,
      });
      onSignedIn();
    } catch (cause) {
      setCode("");
      setError(apiErrorMessage(cause));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-medium">Two-step verification</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Open your authenticator app and enter the 6-digit code. Lost your
            phone? Use one of your recovery codes instead.
          </p>
        </div>
      </div>

      <TextField
        id="two-factor-code"
        label="Code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        autoFocus
        placeholder="123456"
        className="font-mono tracking-[0.2em]"
        error={error}
      />

      <Button
        type="submit"
        shape="rounded"
        fullWidth
        loading={complete.isPending}
        loadingText="Verifying…"
      >
        Verify and sign in
      </Button>

      <Button
        variant="link"
        size="sm"
        onClick={onBack}
        className="mx-auto flex"
      >
        Use a different account
      </Button>
    </form>
  );
}

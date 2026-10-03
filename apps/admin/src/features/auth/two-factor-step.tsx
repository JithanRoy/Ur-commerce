import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { isApiError } from "@urcommerce/api-client";
import type { LoginResponse } from "@urcommerce/api-client";
import { useCompleteTwoFactor } from "@/api/auth";
import { TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  CODE_FORMAT_HINT,
  isPlausibleCode,
  normaliseCode,
} from "@/lib/two-factor-code";

export function TwoFactorStep({
  challengeToken,
  onVerified,
  onBack,
}: {
  challengeToken: string;
  onVerified: (session: LoginResponse) => void;
  onBack: () => void;
}) {
  const complete = useCompleteTwoFactor();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalised = normaliseCode(code);
    if (!isPlausibleCode(normalised)) {
      setError(CODE_FORMAT_HINT);
      return;
    }
    setError(null);
    setPending(true);
    try {
      onVerified(await complete({ challengeToken, code: normalised }));
    } catch (cause) {
      setCode("");
      setError(
        isApiError(cause) ? cause.message : "Could not reach the server.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm" noValidate>
      <div className="mb-8">
        <div className="mb-6 inline-flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Two-step verification
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app. Lost your phone?
          Use one of your recovery codes.
        </p>
      </div>

      <TextField
        id="two-factor-code"
        label="Code"
        size="lg"
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
        size="lg"
        shape="rounded"
        fullWidth
        loading={pending}
        loadingText="Verifying…"
        className="mt-5"
      >
        Verify and sign in
      </Button>

      <Button
        variant="link"
        size="sm"
        onClick={onBack}
        className="mx-auto mt-4 flex"
      >
        Use a different account
      </Button>
    </form>
  );
}

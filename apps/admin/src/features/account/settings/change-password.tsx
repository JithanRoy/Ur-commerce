import { useState } from "react";
import { KeyRound } from "lucide-react";
import { PASSWORD_MIN_LENGTH } from "@urcommerce/api-client";
import type { Profile } from "@urcommerce/api-client";
import { useChangePassword } from "@/api/profile";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  InlineStatus,
  SettingsCard,
  errorText,
  timeAgo,
} from "./settings-card";

type Errors = Partial<Record<"current" | "next" | "confirm", string>>;

function validate(current: string, next: string, confirm: string): Errors {
  const errors: Errors = {};
  if (!current) errors.current = "Enter your current password";
  if (next.length < PASSWORD_MIN_LENGTH) {
    errors.next = `At least ${PASSWORD_MIN_LENGTH} characters`;
  } else if (next === current) {
    errors.next = "Choose a password you are not using now";
  }
  if (confirm !== next) errors.confirm = "Passwords do not match";
  return errors;
}

function lastChanged(profile: Profile): string {
  return profile.passwordChangedAt
    ? `Last changed ${timeAgo(profile.passwordChangedAt)}.`
    : "Never changed since you joined.";
}

export function ChangePassword({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (email: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const change = useChangePassword();

  const errors = validate(current, next, confirm);
  const visible = showErrors ? errors : {};

  const reset = () => {
    setOpen(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    setShowErrors(false);
    setFailure(null);
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    setFailure(null);
    if (Object.keys(errors).length > 0) return;
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next });
      await onChanged(profile.email);
    } catch (cause) {
      setFailure(
        errorText(cause, "Could not change your password. Please try again."),
      );
    }
  }

  return (
    <SettingsCard
      icon={KeyRound}
      title="Password"
      description={lastChanged(profile)}
      aside={
        open ? null : (
          <Button
            size="sm"
            shape="rounded"
            variant="outline"
            onClick={() => setOpen(true)}
          >
            Change password
          </Button>
        )
      }
    >
      {open ? (
        <form onSubmit={submit} noValidate className="space-y-4">
          <TextField
            id="current-password"
            label="Current password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            error={visible.current}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="new-password"
              label="New password"
              type="password"
              autoComplete="new-password"
              hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
              value={next}
              onChange={(event) => setNext(event.target.value)}
              error={visible.next}
            />
            <TextField
              id="confirm-password"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              error={visible.confirm}
            />
          </div>

          <InlineStatus tone="warning">
            Changing your password signs you out on every device, including this
            one. You will sign in again with the new password.
          </InlineStatus>

          {failure ? <InlineStatus tone="error">{failure}</InlineStatus> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="md"
              shape="rounded"
              loading={change.isPending}
              loadingText="Changing…"
            >
              Change password
            </Button>
            <Button
              size="md"
              shape="rounded"
              variant="ghost"
              onClick={reset}
              disabled={change.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </SettingsCard>
  );
}

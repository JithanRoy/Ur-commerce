import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import {
  STORE_OWNER_PASSWORD_MIN_LENGTH,
  STORE_USER_ROLE_LABELS,
  isApiError,
} from "@urcommerce/api-client";
import type {
  PlatformStore,
  StoreUser,
  StoreUserPasswordReset,
} from "@urcommerce/api-client";
import { useResetStaffPassword, useStoreStaff } from "@/api/stores";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { generatePassword } from "@/lib/passwords";
import { adminUrl } from "@/lib/store-urls";
import { CopyButton } from "./copy-button";
import { formatDate } from "./date";

function passwordNote(user: StoreUser): string {
  return user.passwordChangedAt
    ? `Password changed ${formatDate(user.passwordChangedAt)}`
    : "Password never changed";
}

function resetHandover(
  store: PlatformStore,
  user: StoreUser,
  password: string,
): string {
  return [
    `Your password for ${store.name} was reset.`,
    `Admin: ${adminUrl(store.subdomain)}`,
    `Email: ${user.email}`,
    `Temporary password: ${password}`,
    "Please change it after you sign in.",
  ].join("\n");
}

function ResetDone({
  store,
  user,
  password,
  result,
  onClose,
}: {
  store: PlatformStore;
  user: StoreUser;
  password: string;
  result: StoreUserPasswordReset;
  onClose: () => void;
}) {
  const devices = result.revokedSessions;
  return (
    <div role="status" className="mt-3 rounded-lg border bg-muted/40 p-4">
      <p className="text-sm font-medium">Password reset for {user.name}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {devices > 0
          ? `Signed out of ${devices} device${devices === 1 ? "" : "s"}. `
          : ""}
        Send the new password yourself; it is shown only now.
        {user.twoFactorEnabled
          ? " They still need their authenticator code to sign in."
          : ""}
      </p>
      <p className="mt-3 break-all rounded-md border bg-background px-3 py-2 font-mono text-sm">
        {password}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton
          text={resetHandover(store, user, password)}
          label="Copy sign-in details"
        />
        <Button variant="ghost" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

function ResetForm({
  store,
  user,
  onClose,
}: {
  store: PlatformStore;
  user: StoreUser;
  onClose: () => void;
}) {
  const reset = useResetStaffPassword(store.id);
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoreUserPasswordReset | null>(null);

  if (result) {
    return (
      <ResetDone
        store={store}
        user={user}
        password={password}
        result={result}
        onClose={onClose}
      />
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < STORE_OWNER_PASSWORD_MIN_LENGTH) {
      setError(`At least ${STORE_OWNER_PASSWORD_MIN_LENGTH} characters`);
      return;
    }
    setError(null);
    try {
      setResult(await reset.mutateAsync({ userId: user.id, password }));
    } catch (cause) {
      setError(
        isApiError(cause) ? cause.message : "Could not reset the password.",
      );
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={`Reset password for ${user.name}`}
      className="mt-3 rounded-lg border bg-muted/40 p-4"
    >
      <p className="text-sm text-muted-foreground">
        {user.name} is signed out everywhere and must use this new password.
      </p>
      <TextField
        label="New password"
        autoComplete="new-password"
        spellCheck={false}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={error}
        fieldClassName="mt-3"
        action={
          <Button
            variant="link"
            size="xs"
            leading={<KeyRound aria-hidden />}
            onClick={() => setPassword(generatePassword())}
          >
            Generate
          </Button>
        }
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          loading={reset.isPending}
          loadingText="Resetting…"
        >
          Reset password
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={reset.isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PersonRow({
  store,
  user,
  resetting,
  onReset,
  onClose,
}: {
  store: PlatformStore;
  user: StoreUser;
  resetting: boolean;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {user.name}
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              {STORE_USER_ROLE_LABELS[user.role]}
            </span>
            {user.isActive ? null : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Deactivated
              </span>
            )}
          </p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{passwordNote(user)}</span>
            {user.twoFactorEnabled ? (
              <span className="inline-flex items-center gap-1 text-success">
                <ShieldCheck className="size-3.5" aria-hidden />
                Two-step on
              </span>
            ) : null}
          </p>
        </div>
        {resetting ? null : (
          <Button
            variant="outline"
            size="sm"
            leading={<KeyRound aria-hidden />}
            onClick={onReset}
          >
            Reset password
          </Button>
        )}
      </div>
      {resetting ? (
        <ResetForm store={store} user={user} onClose={onClose} />
      ) : null}
    </li>
  );
}

export function StorePeople({ store }: { store: PlatformStore }) {
  const { data, isPending, isError } = useStoreStaff(store.id);
  const [resettingId, setResettingId] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="people-title"
      className="rounded-xl border bg-card px-6 py-4"
    >
      <h2 id="people-title" className="font-semibold">
        Owners and staff
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        People who can sign in to this store&apos;s admin. Owners add staff from
        their own Team page.
      </p>
      {isPending ? (
        <div className="mt-4">
          <LoadingState variant="block" label="Loading people" />
        </div>
      ) : isError ? (
        <div className="mt-4">
          <ErrorState message="We could not load this store's people." />
        </div>
      ) : data.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          This store has no owner or staff accounts.
        </p>
      ) : (
        <ul className="mt-2 divide-y">
          {data.map((user) => (
            <PersonRow
              key={user.id}
              store={store}
              user={user}
              resetting={resettingId === user.id}
              onReset={() => setResettingId(user.id)}
              onClose={() => setResettingId(null)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router";
import { Building2 } from "lucide-react";
import {
  STORE_STATUSES,
  STORE_STATUS_LABELS,
  isApiError,
} from "@urcommerce/api-client";
import { useLogin } from "@/api/stores";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { statusDot } from "@/features/stores/status-style";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const reasonMessages = {
  expired: "Your session ended. Sign in again to continue.",
  "signed-out": "You signed out.",
} as const;

function LifecycleLegend() {
  return (
    <ul
      aria-label="Store statuses"
      className="mt-10 flex flex-wrap gap-x-5 gap-y-2"
    >
      {STORE_STATUSES.map((status) => (
        <li key={status} className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className={cn("size-2 rounded-full", statusDot[status])}
          />
          <span className="text-sidebar-foreground/85">
            {STORE_STATUS_LABELS[status]}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const signIn = useAuth((state) => state.signIn);
  const reason = useAuth((state) => state.signOutReason);
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const session = await login.mutateAsync(values);
      signIn(session.accessToken, values.email);
      navigate(from && from !== "/login" ? from : "/", { replace: true });
    } catch (error) {
      setFormError(
        isApiError(error) ? error.message : "Could not reach the server.",
      );
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="hidden flex-col justify-between bg-ink p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-white/12">
            <Building2 className="size-4.5" aria-hidden />
          </span>
          <span className="font-semibold">Ur-commerce</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight">
            Every shop on the platform, from one desk.
          </h2>
          <p className="mt-4 leading-relaxed text-sidebar-muted">
            Open new shops, hand owners their sign-in, and move a shop between
            trial, active and suspended when its payment changes.
          </p>
          <LifecycleLegend />
        </div>
        <p className="text-xs text-sidebar-muted">
          Store owners and staff sign in at their own shop&apos;s admin, not
          here.
        </p>
      </section>
      <section className="flex items-center justify-center bg-paper px-6 py-12">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="w-full max-w-sm"
        >
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-ink text-sidebar-foreground lg:hidden">
            <Building2 className="size-5" aria-hidden />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight lg:mt-0">
            Platform console
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in as the platform owner to manage every store.
          </p>

          {reason && reason !== "signed-out" ? (
            <p
              role="status"
              className="mt-6 rounded-lg border border-warning/40 bg-warning/10 px-3.5 py-3 text-sm"
            >
              {reasonMessages[reason]}
            </p>
          ) : null}

          <div className="mt-6 space-y-4">
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              error={errors.email?.message}
              {...form.register("email")}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...form.register("password")}
            />
          </div>

          {formError ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            fullWidth
            className="mt-6"
            loading={isSubmitting}
            loadingText="Signing in…"
          >
            Sign in
          </Button>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Platform owner accounts are created on the server with{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              npm run db:seed-platform
            </code>
            . There is no public sign-up.
          </p>
        </form>
      </section>
    </main>
  );
}

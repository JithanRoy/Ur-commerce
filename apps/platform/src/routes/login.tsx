import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router";
import { Building2 } from "lucide-react";
import { isApiError } from "@urcommerce/api-client";
import { useLogin } from "@/api/stores";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
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
    <main className="flex min-h-dvh items-center justify-center bg-sidebar px-6 py-12">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-xl"
      >
        <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="size-5" aria-hidden />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
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
    </main>
  );
}

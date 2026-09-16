import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router";
import { isApiError, isStaffRole } from "@urcommerce/api-client";
import { authApi } from "@/lib/api";
import { useAuth } from "@/stores/auth";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useAuth((state) => state.signIn);
  const from = (location.state as { from?: { pathname: string } } | null)?.from
    ?.pathname;
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const session = await authApi.login(values);
      if (!isStaffRole(session.role)) {
        setFormError("This account cannot access the admin panel.");
        return;
      }
      signIn(session);
      navigate(from ?? "/products", { replace: true });
    } catch (error) {
      if (isApiError(error)) {
        setFormError(
          error.isWrongStoreOrForbidden
            ? "Please sign in to this store."
            : error.message,
        );
        return;
      }
      setFormError("Could not reach the server.");
    }
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/20 px-6">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-5 rounded-xl border bg-background p-8 shadow-sm"
        noValidate
      >
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Store admin</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage your store.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...form.register("email")}
          />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...form.register("password")}
          />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
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
  const routerState = location.state as {
    from?: { pathname: string };
    reason?: string;
  } | null;
  const from = routerState?.from?.pathname;
  const bounceMessage =
    routerState?.reason === "not-staff"
      ? "That account cannot access the admin panel."
      : null;
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
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:44px_44px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 size-[28rem] rounded-full bg-background/[0.04]"
        />

        <div className="relative">
          <div className="inline-flex size-10 items-center justify-center rounded-lg bg-white/12">
            <ShieldCheck className="size-5" aria-hidden />
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight">
            Run your store from one place.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-sidebar-muted">
            Products and stock, orders from placed to delivered, and the people
            who help you run it.
          </p>
        </div>

        <p className="relative text-xs text-sidebar-muted/70">
          Staff access only. Every action is attributed to your account.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full max-w-sm"
          noValidate
        >
          <div className="mb-8">
            <div className="mb-6 inline-flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
              <ShieldCheck className="size-5" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Store admin
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to manage your store.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@store.com"
                aria-invalid={Boolean(errors.email)}
                className="h-11 w-full rounded-lg border border-input bg-transparent px-3.5 text-sm outline-none transition-shadow placeholder:text-muted-foreground/50 focus-visible:border-foreground/30 focus-visible:ring-4 focus-visible:ring-foreground/5 aria-invalid:border-destructive/60"
                {...form.register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
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
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                className="h-11 w-full rounded-lg border border-input bg-transparent px-3.5 text-sm outline-none transition-shadow placeholder:text-muted-foreground/50 focus-visible:border-foreground/30 focus-visible:ring-4 focus-visible:ring-foreground/5 aria-invalid:border-destructive/60"
                {...form.register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
          </div>

          {formError ?? bounceMessage ? (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
            >
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
              {formError ?? bounceMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </section>
    </main>
  );
}

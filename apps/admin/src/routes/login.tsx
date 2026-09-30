import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router";
import { Lock, ShieldCheck } from "lucide-react";
import { isApiError, isStaffRole } from "@urcommerce/api-client";
import { authApi } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { TextField } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [remember, setRemember] = useState(true);

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
      signIn(session, remember);
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
            <TextField
              label="Email"
              id="email"
              type="email"
              size="lg"
              autoComplete="email"
              autoFocus
              placeholder="you@store.com"
              error={errors.email?.message}
              {...form.register("email")}
            />

            <TextField
              label="Password"
              id="password"
              type="password"
              size="lg"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...form.register("password")}
            />
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

          <Checkbox
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            containerClassName="mt-5 flex select-none items-center"
            label={
              <span className="text-muted-foreground">
                Keep me signed in on this device
              </span>
            }
          />

          <Button
            type="submit"
            size="lg"
            shape="rounded"
            fullWidth
            loading={isSubmitting}
            loadingText="Signing in…"
            className="mt-4"
          >
            Sign in
          </Button>
        </form>
      </section>
    </main>
  );
}

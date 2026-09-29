"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { isApiError } from "@urcommerce/api-client";
import { authApi } from "@/lib/browser-api";
import { useAuth } from "@/stores/auth";
import { clearCartSession } from "@/stores/cart-session";
import { cartQueryKey } from "@/features/cart/use-cart";
import { TextField } from "@/components/ui/text-field";
import { PasswordInput } from "@/components/ui/password-input";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type Values = z.infer<typeof schema>;

export function SignInForm({
  onSignedIn,
  submitLabel = "Sign in",
  autoFocus = false,
}: {
  onSignedIn: () => void;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const queryClient = useQueryClient();
  const signIn = useAuth((state) => state.signIn);
  const [formError, setFormError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      const session = await authApi.login(values);
      signIn(session, remember);
      clearCartSession();
      await queryClient.invalidateQueries({ queryKey: cartQueryKey });
      onSignedIn();
    } catch (error) {
      setFormError(
        isApiError(error) ? error.message : "Something went wrong. Try again.",
      );
    }
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus={autoFocus}
        placeholder="you@example.com"
        error={errors.email?.message}
        {...form.register("email")}
      />

      <TextField label="Password" error={errors.password?.message}>
        <PasswordInput
          autoComplete="current-password"
          placeholder="••••••••"
          {...form.register("password")}
        />
      </TextField>

      <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="size-4 rounded border-input accent-primary"
        />
        <span className="text-muted-foreground">
          Keep me signed in on this device
        </span>
      </label>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Signing in…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSignIn } from "@/api/auth";
import { apiErrorMessage } from "@/api/use-api-mutation";
import { TextField } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const signIn = useSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      await signIn.mutateAsync({ ...values, remember });
      onSignedIn();
    } catch (error) {
      setFormError(apiErrorMessage(error));
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

      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...form.register("password")}
      />

      <Checkbox
        checked={remember}
        onChange={(event) => setRemember(event.target.checked)}
        label={
          <span className="text-muted-foreground">
            Keep me signed in on this device
          </span>
        }
        containerClassName="flex select-none items-center"
      />

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <Button
        type="submit"
        shape="rounded"
        fullWidth
        loading={isSubmitting}
        loadingText="Signing in…"
      >
        {submitLabel}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppRouter } from "@/lib/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister, useSignIn } from "@/api/auth";
import { apiErrorMessage } from "@/api/use-api-mutation";
import { TextField } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "At least 8 characters"),
});

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const register = useRegister();
  const signIn = useSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);

  const returnTo = searchParams.get("returnTo") ?? "/";
  const schema = mode === "login" ? loginSchema : registerSchema;

  const form = useForm<{ name?: string; email: string; password: string }>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: {
    name?: string;
    email: string;
    password: string;
  }) {
    setFormError(null);
    try {
      if (mode === "register") {
        await register.mutateAsync({
          name: values.name ?? "",
          email: values.email,
          password: values.password,
        });
      }

      await signIn.mutateAsync({
        email: values.email,
        password: values.password,
        remember,
      });
      router.push(returnTo);
      router.refresh();
    } catch (error) {
      setFormError(apiErrorMessage(error));
    }
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="w-full max-w-sm space-y-5"
      noValidate
    >
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {mode === "login" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Welcome back."
            : "It only takes a moment."}
        </p>
      </div>

      {mode === "register" ? (
        <TextField
          id="name"
          label="Name"
          autoComplete="name"
          error={errors.name?.message}
          {...form.register("name")}
        />
      ) : null}

      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...form.register("email")}
      />

      <TextField
        id="password"
        label="Password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
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
        fullWidth
        loading={isSubmitting}
        loadingText="Please wait…"
      >
        {mode === "login" ? "Sign in" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/register" className="underline underline-offset-4">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

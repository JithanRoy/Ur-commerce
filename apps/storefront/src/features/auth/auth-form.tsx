"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@urcommerce/api-client";
import { authApi } from "@/lib/browser-api";
import { useAuth } from "@/stores/auth";
import { clearCartSession } from "@/stores/cart-session";
import { cartQueryKey } from "@/features/cart/use-cart";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const signIn = useAuth((state) => state.signIn);
  const [formError, setFormError] = useState<string | null>(null);

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
        await authApi.register({
          name: values.name ?? "",
          email: values.email,
          password: values.password,
        });
      }

      const session = await authApi.login({
        email: values.email,
        password: values.password,
      });

      signIn(session);
      clearCartSession();
      await queryClient.invalidateQueries({ queryKey: cartQueryKey });
      router.push(returnTo);
      router.refresh();
    } catch (error) {
      setFormError(
        isApiError(error) ? error.message : "Something went wrong. Try again.",
      );
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
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            {...form.register("name")}
          />
          {errors.name ? (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
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
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          aria-invalid={Boolean(errors.password)}
          className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
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
        className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </button>

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

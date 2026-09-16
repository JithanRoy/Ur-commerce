import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-14">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}

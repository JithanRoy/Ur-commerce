import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-14">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}

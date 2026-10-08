import { AccountShell } from "@/features/account/account-shell";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-10">
      <AccountShell>{children}</AccountShell>
    </div>
  );
}

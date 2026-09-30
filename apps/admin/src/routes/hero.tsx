import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { HeroManager } from "@/features/hero/hero-manager";
import { useAuth } from "@/stores/auth";

export function HeroRoute() {
  const role = useAuth((state) => state.user?.role ?? state.session?.role);

  if (role !== "TENANT_OWNER") {
    return (
      <>
        <PageHeader title="Homepage hero" />
        <ErrorState message="Only the store owner can manage the homepage hero." />
      </>
    );
  }

  return <HeroManager />;
}

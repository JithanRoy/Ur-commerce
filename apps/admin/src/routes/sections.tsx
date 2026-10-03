import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { SectionManager } from "@/features/sections/section-manager";
import { useAuth } from "@/stores/auth";

export function SectionsRoute() {
  const role = useAuth((state) => state.user?.role ?? state.session?.role);

  if (role !== "TENANT_OWNER") {
    return (
      <>
        <PageHeader title="Homepage sections" />
        <ErrorState message="Only the store owner can manage the homepage layout." />
      </>
    );
  }

  return <SectionManager />;
}

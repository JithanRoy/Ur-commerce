import { useState } from "react";
import { isApiError, STAFF_ROLE_LABELS } from "@urcommerce/api-client";
import type { StaffRole } from "@urcommerce/api-client";
import {
  useAddStaff,
  useSetStaffAccess,
  useSetStaffRole,
  useTeam,
} from "@/api/team";
import { useAuth } from "@/stores/auth";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { AddStaffForm } from "@/features/team/add-staff-form";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TeamRoute() {
  const currentUser = useAuth((state) => state.user);
  const [error, setError] = useState<string | null>(null);

  const failed = (fallback: string) => (mutationError: unknown) => {
    setError(isApiError(mutationError) ? mutationError.message : fallback);
  };

  const { data, isPending, error: loadError } = useTeam();

  const clearError = () => setError(null);

  const addStaff = useAddStaff({
    success: "Team member added.",
    onSuccess: clearError,
    onError: failed("Could not add the team member."),
  });

  const setActive = useSetStaffAccess({
    success: (_result, variables) =>
      variables.isActive ? "Access restored." : "Access revoked.",
    onSuccess: clearError,
    onError: failed("Could not update access."),
  });

  const setRole = useSetStaffRole({
    success: "Role updated.",
    onSuccess: clearError,
    onError: failed("Could not change the role."),
  });

  if (currentUser && currentUser.role !== "TENANT_OWNER") {
    return (
      <>
        <PageHeader title="Team" />
        <ErrorState message="Only the store owner can manage team members." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Team"
        count={data?.total}
        description="People who can sign in to this admin panel."
      />
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Add a team member</h2>
        <AddStaffForm
          onAdd={(input) => addStaff.mutate(input)}
          isPending={addStaff.isPending}
        />
      </div>

      {isPending ? <LoadingState variant="table" /> : null}

      {loadError ? (
        <ErrorState
          message={
            loadError instanceof Error
              ? loadError.message
              : "Could not load the team."
          }
        />
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          title="No team members yet"
          description="Add someone above to give them admin access."
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="w-px px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((member) => {
                const isSelf = member.id === currentUser?.id;
                return (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {member.name}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          you
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {member.email}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        size="sm"
                        value={member.role}
                        disabled={isSelf || setRole.isPending}
                        onChange={(event) =>
                          setRole.mutate({
                            id: member.id,
                            role: event.target.value as StaffRole,
                          })
                        }
                        aria-label={`Role for ${member.name}`}
                        containerClassName="w-fit"
                        className="w-auto text-sm disabled:opacity-60"
                      >
                        <option value="TENANT_STAFF">
                          {STAFF_ROLE_LABELS.TENANT_STAFF}
                        </option>
                        <option value="TENANT_OWNER">
                          {STAFF_ROLE_LABELS.TENANT_OWNER}
                        </option>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          member.isActive
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {member.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSelf || setActive.isPending}
                        onClick={() =>
                          setActive.mutate({
                            id: member.id,
                            isActive: !member.isActive,
                          })
                        }
                        title={
                          isSelf
                            ? "You cannot change your own access"
                            : undefined
                        }
                        className="text-xs font-normal disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {member.isActive ? "Revoke access" : "Restore access"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

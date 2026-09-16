import { useState } from "react";
import { UserPlus } from "lucide-react";
import type { CreateStaffInput, StaffRole } from "@urcommerce/api-client";

type Props = {
  onAdd: (input: CreateStaffInput) => void;
  isPending: boolean;
};

const field = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";

export function AddStaffForm({ onAdd, isPending }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("TENANT_STAFF");

  const complete =
    name.trim() !== "" && email.trim() !== "" && password.length >= 8;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!complete) return;
    onAdd({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    });
    setName("");
    setEmail("");
    setPassword("");
    setRole("TENANT_STAFF");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label htmlFor="staff-name" className="block text-xs font-medium text-muted-foreground">
          Name
        </label>
        <input
          id="staff-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={`${field} w-40`}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="staff-email" className="block text-xs font-medium text-muted-foreground">
          Email
        </label>
        <input
          id="staff-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`${field} w-56`}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="staff-password" className="block text-xs font-medium text-muted-foreground">
          Password
        </label>
        <input
          id="staff-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="8+ characters"
          className={`${field} w-40`}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="staff-role" className="block text-xs font-medium text-muted-foreground">
          Role
        </label>
        <select
          id="staff-role"
          value={role}
          onChange={(event) => setRole(event.target.value as StaffRole)}
          className={`${field} w-32`}
        >
          <option value="TENANT_STAFF">Staff</option>
          <option value="TENANT_OWNER">Owner</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={!complete || isPending}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40"
      >
        <UserPlus className="size-4" />
        {isPending ? "Adding…" : "Add member"}
      </button>
    </form>
  );
}

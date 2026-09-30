import { useState } from "react";
import { UserPlus } from "lucide-react";
import type { CreateStaffInput, StaffRole } from "@urcommerce/api-client";
import { SelectField, TextField } from "@/components/ui/field";
import type { SelectOption } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  onAdd: (input: CreateStaffInput) => void;
  isPending: boolean;
};

const ROLE_OPTIONS: SelectOption[] = [
  { value: "TENANT_STAFF", label: "Staff" },
  { value: "TENANT_OWNER", label: "Owner" },
];

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
      <TextField
        id="staff-name"
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="h-9 w-40"
      />

      <TextField
        id="staff-email"
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="h-9 w-56"
      />

      <TextField
        id="staff-password"
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="8+ characters"
        className="h-9"
        containerClassName="w-40"
      />

      <SelectField
        id="staff-role"
        label="Role"
        value={role}
        onChange={(event) => setRole(event.target.value as StaffRole)}
        className="h-9"
        containerClassName="w-32"
        options={ROLE_OPTIONS}
      />

      <Button
        type="submit"
        disabled={!complete}
        loading={isPending}
        loadingText="Adding…"
        leading={<UserPlus />}
        className="h-9 gap-1.5"
      >
        Add member
      </Button>
    </form>
  );
}

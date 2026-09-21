"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Address, CreateAddressInput } from "@urcommerce/api-client";

export const addressSchema = z.object({
  fullName: z.string().min(2, "Enter at least 2 characters"),
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Enter an 11-digit number starting 01"),
  division: z.string().min(1, "Required"),
  district: z.string().min(1, "Required"),
  thana: z.string().min(1, "Required"),
  addressLine: z.string().min(1, "Required"),
  area: z.string().optional(),
  postCode: z.string().optional(),
  landmark: z.string().optional(),
  label: z.string().optional(),
});

export type AddressValues = z.infer<typeof addressSchema>;

const emptyValues: AddressValues = {
  fullName: "",
  phone: "",
  division: "Dhaka",
  district: "Dhaka",
  thana: "",
  addressLine: "",
  area: "",
  postCode: "",
  landmark: "",
  label: "",
};

export function toCreateInput(values: AddressValues): CreateAddressInput {
  const trimmed = <K extends keyof AddressValues>(key: K) => {
    const value = values[key]?.trim();
    return value ? value : undefined;
  };

  return {
    fullName: values.fullName.trim(),
    phone: values.phone.trim(),
    division: values.division.trim(),
    district: values.district.trim(),
    thana: values.thana.trim(),
    addressLine: values.addressLine.trim(),
    area: trimmed("area"),
    postCode: trimmed("postCode"),
    landmark: trimmed("landmark"),
    label: trimmed("label"),
  };
}

export function valuesFromAddress(address: Address): AddressValues {
  return {
    fullName: address.fullName,
    phone: address.phone,
    division: address.division,
    district: address.district,
    thana: address.thana,
    addressLine: address.addressLine,
    area: address.area ?? "",
    postCode: address.postCode ?? "",
    landmark: address.landmark ?? "",
    label: address.label ?? "",
  };
}

const inputClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm";

function Field({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-muted-foreground">
            (optional)
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AddressForm({
  address,
  submitLabel,
  pending,
  error,
  showOptionalFields = true,
  onSubmit,
  onCancel,
}: {
  address?: Address;
  submitLabel: string;
  pending?: boolean;
  error?: string | null;
  showOptionalFields?: boolean;
  onSubmit: (values: AddressValues) => void;
  onCancel?: () => void;
}) {
  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: address ? valuesFromAddress(address) : emptyValues,
  });

  const errors = form.formState.errors;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fullName" label="Full name" error={errors.fullName?.message}>
          <input
            id="fullName"
            autoComplete="name"
            className={inputClass}
            {...form.register("fullName")}
          />
        </Field>
        <Field id="phone" label="Phone" error={errors.phone?.message}>
          <input
            id="phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            className={inputClass}
            {...form.register("phone")}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="division" label="Division" error={errors.division?.message}>
          <input
            id="division"
            className={inputClass}
            {...form.register("division")}
          />
        </Field>
        <Field id="district" label="District" error={errors.district?.message}>
          <input
            id="district"
            className={inputClass}
            {...form.register("district")}
          />
        </Field>
        <Field id="thana" label="Thana" error={errors.thana?.message}>
          <input
            id="thana"
            className={inputClass}
            {...form.register("thana")}
          />
        </Field>
      </div>

      <Field
        id="addressLine"
        label="Address"
        error={errors.addressLine?.message}
      >
        <input
          id="addressLine"
          autoComplete="street-address"
          placeholder="House, road, block"
          className={inputClass}
          {...form.register("addressLine")}
        />
      </Field>

      {showOptionalFields ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="area" label="Area" optional>
              <input
                id="area"
                placeholder="Gulshan 2"
                className={inputClass}
                {...form.register("area")}
              />
            </Field>
            <Field id="postCode" label="Post code" optional>
              <input
                id="postCode"
                inputMode="numeric"
                autoComplete="postal-code"
                className={inputClass}
                {...form.register("postCode")}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="landmark" label="Landmark" optional>
              <input
                id="landmark"
                placeholder="Beside the circle"
                className={inputClass}
                {...form.register("landmark")}
              />
            </Field>
            <Field id="label" label="Label" optional>
              <input
                id="label"
                placeholder="Home, Office"
                className={inputClass}
                {...form.register("label")}
              />
            </Field>
          </div>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md border border-input px-5 text-sm font-medium"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

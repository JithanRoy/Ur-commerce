"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Address, CreateAddressInput } from "@urcommerce/api-client";
import { TextField } from "@/components/ui/field";

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
        <TextField
          id="fullName"
          label="Full name"
          autoComplete="name"
          error={errors.fullName?.message}
          {...form.register("fullName")}
        />
        <TextField
          id="phone"
          label="Phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          error={errors.phone?.message}
          {...form.register("phone")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          id="division"
          label="Division"
          error={errors.division?.message}
          {...form.register("division")}
        />
        <TextField
          id="district"
          label="District"
          error={errors.district?.message}
          {...form.register("district")}
        />
        <TextField
          id="thana"
          label="Thana"
          error={errors.thana?.message}
          {...form.register("thana")}
        />
      </div>

      <TextField
        id="addressLine"
        label="Address"
        autoComplete="street-address"
        placeholder="House, road, block"
        error={errors.addressLine?.message}
        {...form.register("addressLine")}
      />

      {showOptionalFields ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="area"
              label="Area"
              optional
              placeholder="Gulshan 2"
              {...form.register("area")}
            />
            <TextField
              id="postCode"
              label="Post code"
              optional
              inputMode="numeric"
              autoComplete="postal-code"
              {...form.register("postCode")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="landmark"
              label="Landmark"
              optional
              placeholder="Beside the circle"
              {...form.register("landmark")}
            />
            <TextField
              id="label"
              label="Label"
              optional
              placeholder="Home, Office"
              {...form.register("label")}
            />
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

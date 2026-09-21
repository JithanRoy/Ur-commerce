"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { isApiError } from "@urcommerce/api-client";
import type { Address } from "@urcommerce/api-client";
import { checkoutApi } from "@/lib/browser-api";
import { cn } from "@/lib/utils";
import { AddressForm, toCreateInput } from "./address-form";
import type { AddressValues } from "./address-form";

const addressesQueryKey = ["addresses"];

function formatAddressLines(address: Address): string[] {
  const locality = [address.area, address.thana, address.district]
    .filter(Boolean)
    .join(", ");
  const region = [address.division, address.postCode]
    .filter(Boolean)
    .join(" — ");

  return [address.addressLine, locality, region].filter(
    (line): line is string => Boolean(line),
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

export function AddressesClient() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: addressesQueryKey,
    queryFn: () => checkoutApi.addresses.list(),
    retry: false,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: addressesQueryKey });

  const closeForms = () => {
    setIsAdding(false);
    setEditingId(null);
    setActionError(null);
  };

  const createAddress = useMutation({
    mutationFn: (values: AddressValues) =>
      checkoutApi.addresses.create(toCreateInput(values)),
    onSuccess: () => {
      refresh();
      closeForms();
    },
    onError: (error) =>
      setActionError(errorMessage(error, "Could not save this address.")),
  });

  const updateAddress = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AddressValues }) =>
      checkoutApi.addresses.update(id, toCreateInput(values)),
    onSuccess: () => {
      refresh();
      closeForms();
    },
    onError: (error) =>
      setActionError(errorMessage(error, "Could not update this address.")),
  });

  const removeAddress = useMutation({
    mutationFn: (id: string) => checkoutApi.addresses.remove(id),
    onSuccess: () => {
      refresh();
      setPendingDeleteId(null);
      setActionError(null);
    },
    onError: (error) => {
      setPendingDeleteId(null);
      setActionError(errorMessage(error, "Could not remove this address."));
    },
  });

  const setDefaultAddress = useMutation({
    mutationFn: (id: string) => checkoutApi.addresses.setDefault(id),
    onSuccess: () => {
      refresh();
      setActionError(null);
    },
    onError: (error) =>
      setActionError(errorMessage(error, "Could not change your default.")),
  });

  if (isPending) {
    return <p className="text-muted-foreground">Loading your addresses…</p>;
  }

  if (isError) {
    return (
      <p role="alert" className="text-destructive">
        We could not load your addresses. Please refresh in a moment.
      </p>
    );
  }

  const addresses = data ?? [];
  const isMutating =
    createAddress.isPending ||
    updateAddress.isPending ||
    removeAddress.isPending ||
    setDefaultAddress.isPending;

  if (addresses.length === 0 && !isAdding) {
    return (
      <div className="rounded-xl border border-dashed px-8 py-20 text-center">
        <MapPin
          className="mx-auto size-10 text-muted-foreground/40"
          aria-hidden
        />
        <p className="mt-4 font-medium">No saved addresses</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Save an address to check out faster next time.
        </p>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Add an address
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionError && !isAdding && !editingId ? (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      <ul className="space-y-4">
        {addresses.map((address) => (
          <li key={address.id} className="rounded-xl border p-5">
            {editingId === address.id ? (
              <AddressForm
                address={address}
                submitLabel="Save changes"
                pending={updateAddress.isPending}
                error={actionError}
                onSubmit={(values) =>
                  updateAddress.mutate({ id: address.id, values })
                }
                onCancel={closeForms}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{address.fullName}</p>
                      {address.label ? (
                        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                          {address.label}
                        </span>
                      ) : null}
                      {address.isDefault ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatAddressLines(address).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                      {address.landmark ? <p>{address.landmark}</p> : null}
                      <p className="mt-1">{address.phone}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {!address.isDefault ? (
                      <button
                        type="button"
                        onClick={() => setDefaultAddress.mutate(address.id)}
                        disabled={isMutating}
                        className="h-9 rounded-md border border-input px-3 text-sm font-medium disabled:opacity-50"
                      >
                        Make default
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setIsAdding(false);
                        setEditingId(address.id);
                      }}
                      disabled={isMutating}
                      className="h-9 rounded-md border border-input px-3 text-sm font-medium disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(address.id)}
                      disabled={isMutating}
                      className={cn(
                        "h-9 rounded-md border px-3 text-sm font-medium disabled:opacity-50",
                        pendingDeleteId === address.id
                          ? "border-destructive text-destructive"
                          : "border-input",
                      )}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {pendingDeleteId === address.id ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                    <p className="text-sm">
                      Remove this address? Orders already placed keep their own
                      copy.
                    </p>
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => removeAddress.mutate(address.id)}
                        disabled={removeAddress.isPending}
                        className="h-9 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground disabled:opacity-50"
                      >
                        {removeAddress.isPending ? "Removing…" : "Remove"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="h-9 rounded-md border border-input px-4 text-sm font-medium"
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>

      {isAdding ? (
        <div className="rounded-xl border p-5">
          <h2 className="mb-4 font-medium">New address</h2>
          <AddressForm
            submitLabel="Save address"
            pending={createAddress.isPending}
            error={actionError}
            onSubmit={(values) => createAddress.mutate(values)}
            onCancel={closeForms}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setEditingId(null);
            setIsAdding(true);
          }}
          className="h-10 rounded-md border border-input px-5 text-sm font-medium"
        >
          Add another address
        </button>
      )}
    </div>
  );
}

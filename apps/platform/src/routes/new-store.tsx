import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { ArrowLeft, KeyRound } from "lucide-react";
import {
  RESERVED_SUBDOMAINS,
  STORE_OWNER_PASSWORD_MIN_LENGTH,
  SUBDOMAIN_MAX_LENGTH,
  SUBDOMAIN_MIN_LENGTH,
  SUBDOMAIN_PATTERN,
  isApiError,
} from "@urcommerce/api-client";
import type { PlatformStore } from "@urcommerce/api-client";
import { useCreateStore } from "@/api/stores";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Radio } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  StoreHandover,
  type OwnerCredentials,
} from "@/features/stores/store-handover";
import { generatePassword } from "@/lib/passwords";
import { displayHost, storefrontUrl } from "@/lib/store-urls";
import { suggestSubdomain } from "@/lib/subdomain";

const reserved: readonly string[] = RESERVED_SUBDOMAINS;

const schema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(120),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(SUBDOMAIN_MIN_LENGTH, `At least ${SUBDOMAIN_MIN_LENGTH} characters`)
    .max(SUBDOMAIN_MAX_LENGTH)
    .regex(
      SUBDOMAIN_PATTERN,
      "Lowercase letters and numbers, joined by single hyphens",
    )
    .refine(
      (value) => !reserved.includes(value),
      "That name is reserved for the platform",
    ),
  status: z.enum(["TRIAL", "ACTIVE"]),
  ownerName: z.string().trim().min(2, "At least 2 characters").max(120),
  ownerEmail: z.email("Enter a valid email").max(200),
  ownerPassword: z
    .string()
    .min(
      STORE_OWNER_PASSWORD_MIN_LENGTH,
      `At least ${STORE_OWNER_PASSWORD_MIN_LENGTH} characters`,
    )
    .max(128),
});

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = {
  name: "",
  subdomain: "",
  status: "TRIAL",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: "",
};

type Created = { store: PlatformStore; owner: OwnerCredentials };

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function NewStoreForm({
  onCreated,
}: {
  onCreated: (created: Created) => void;
}) {
  const create = useCreateStore();
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm,
  });
  const { errors, isSubmitting } = form.formState;
  const subdomain = useWatch({ control: form.control, name: "subdomain" });
  const status = useWatch({ control: form.control, name: "status" });

  const nameField = form.register("name", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!subdomainTouched) {
        form.setValue("subdomain", suggestSubdomain(event.target.value), {
          shouldValidate: form.formState.isSubmitted,
        });
      }
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const store = await create.mutateAsync(values);
      onCreated({
        store,
        owner: {
          name: values.ownerName,
          email: values.ownerEmail,
          password: values.ownerPassword,
        },
      });
    } catch (error) {
      if (!isApiError(error)) return;
      if (/subdomain/i.test(error.message)) {
        form.setError("subdomain", { message: error.message });
      } else if (/email/i.test(error.message)) {
        form.setError("ownerEmail", { message: error.message });
      }
    }
  }

  const preview = subdomain
    ? displayHost(storefrontUrl(subdomain.trim().toLowerCase()))
    : null;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="max-w-2xl space-y-6"
    >
      <Section title="Store" description="The shop's name and its web address.">
        <TextField
          label="Store name"
          placeholder="Rangdhonu Fashion"
          error={errors.name?.message}
          {...nameField}
        />
        <TextField
          label="Subdomain"
          placeholder="rangdhonu"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.subdomain?.message}
          hint={
            preview
              ? `The shop will live at ${preview}`
              : "Lowercase letters, numbers and hyphens."
          }
          {...form.register("subdomain", {
            onChange: () => setSubdomainTouched(true),
          })}
        />
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Start as</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Radio
              value="TRIAL"
              checked={status === "TRIAL"}
              onChange={() => form.setValue("status", "TRIAL")}
              label="Trial"
              description="Full access while they try it out."
              containerClassName="rounded-lg border p-3"
            />
            <Radio
              value="ACTIVE"
              checked={status === "ACTIVE"}
              onChange={() => form.setValue("status", "ACTIVE")}
              label="Active"
              description="For a store that has already paid."
              containerClassName="rounded-lg border p-3"
            />
          </div>
        </fieldset>
      </Section>

      <Section
        title="Owner"
        description="The first person who can sign in to this store's admin. They can add staff later."
      >
        <TextField
          label="Owner name"
          placeholder="Rafiqul Islam"
          autoComplete="off"
          error={errors.ownerName?.message}
          {...form.register("ownerName")}
        />
        <TextField
          label="Owner email"
          type="email"
          autoComplete="off"
          placeholder="owner@example.com"
          error={errors.ownerEmail?.message}
          {...form.register("ownerEmail")}
        />
        <TextField
          label="Temporary password"
          type="password"
          autoComplete="new-password"
          error={errors.ownerPassword?.message}
          hint="You'll see it once more after the store is created, to send to the owner."
          action={
            <Button
              variant="link"
              size="xs"
              leading={<KeyRound aria-hidden />}
              onClick={() =>
                form.setValue("ownerPassword", generatePassword(), {
                  shouldValidate: form.formState.isSubmitted,
                })
              }
            >
              Generate
            </Button>
          }
          {...form.register("ownerPassword")}
        />
      </Section>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          loading={isSubmitting}
          loadingText="Creating store…"
        >
          Create store
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

export function NewStoreRoute() {
  const [created, setCreated] = useState<Created | null>(null);
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Stores
      </Link>
      <PageHeader
        title={created ? "Store created" : "New store"}
        description={
          created
            ? undefined
            : "Creates the shop and its owner account together. The owner signs in with the details below."
        }
      />
      {created ? (
        <StoreHandover
          store={created.store}
          owner={created.owner}
          onCreateAnother={() => {
            setCreated(null);
            setFormKey((key) => key + 1);
          }}
        />
      ) : (
        <NewStoreForm key={formKey} onCreated={setCreated} />
      )}
    </>
  );
}

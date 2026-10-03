import { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import {
  GENDERS,
  GENDER_LABELS,
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_NAME_MIN_LENGTH,
} from "@urcommerce/api-client";
import type {
  Gender,
  Profile,
  UpdateProfileInput,
} from "@urcommerce/api-client";
import { useUpdateProfile } from "@/api/profile";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { InlineStatus, SettingsCard, errorText } from "./settings-card";

type Draft = {
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender | "";
};

const BD_MOBILE = /^(?:\+?880|0)?1[3-9]\d{8}$/;

const MISSING_LABELS = {
  name: "your name",
  phone: "a phone number",
  dateOfBirth: "your date of birth",
  gender: "your gender",
} as const;

const GENDER_OPTIONS = GENDERS.map((gender) => ({
  value: gender,
  label: GENDER_LABELS[gender],
}));

function draftOf(profile: Profile): Draft {
  return {
    name: profile.name,
    phone: profile.phone ?? "",
    dateOfBirth: profile.dateOfBirth?.slice(0, 10) ?? "",
    gender: profile.gender ?? "",
  };
}

function isGender(value: string): value is Gender {
  return (GENDERS as readonly string[]).includes(value);
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function changesBetween(saved: Draft, draft: Draft): UpdateProfileInput {
  const changes: UpdateProfileInput = {};
  if (draft.name.trim() !== saved.name) changes.name = draft.name.trim();
  if (orNull(draft.phone) !== orNull(saved.phone)) {
    changes.phone = orNull(draft.phone);
  }
  if (draft.dateOfBirth !== saved.dateOfBirth) {
    changes.dateOfBirth = orNull(draft.dateOfBirth);
  }
  if (draft.gender !== saved.gender) {
    changes.gender = draft.gender === "" ? null : draft.gender;
  }
  return changes;
}

function validate(draft: Draft): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {};
  const name = draft.name.trim();
  if (name.length < PROFILE_NAME_MIN_LENGTH) {
    errors.name = `At least ${PROFILE_NAME_MIN_LENGTH} characters`;
  }
  const phone = draft.phone.replace(/[\s-]/g, "");
  if (phone !== "" && !BD_MOBILE.test(phone)) {
    errors.phone = "Enter a Bangladeshi mobile number, like 01712345678";
  }
  if (draft.dateOfBirth && draft.dateOfBirth >= todayIso()) {
    errors.dateOfBirth = "Must be in the past";
  }
  return errors;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function missingFields(profile: Profile): string[] {
  return (Object.keys(MISSING_LABELS) as (keyof typeof MISSING_LABELS)[])
    .filter((field) => !profile[field])
    .map((field) => MISSING_LABELS[field]);
}

function listInProse(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function CompletionMeter({ profile }: { profile: Profile }) {
  if (profile.completion >= 100) return null;
  const missing = missingFields(profile);
  return (
    <div className="mb-5 rounded-lg bg-muted/50 p-3.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Profile {profile.completion}% complete
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Profile completion"
        aria-valuenow={profile.completion}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${profile.completion}%` }}
        />
      </div>
      {missing.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Add {listInProse(missing)} to finish your profile.
        </p>
      ) : null}
    </div>
  );
}

export function ProfileDetails({ profile }: { profile: Profile }) {
  const saved = useMemo(() => draftOf(profile), [profile]);
  const [draft, setDraft] = useState<Draft>(saved);
  const [showErrors, setShowErrors] = useState(false);
  const [status, setStatus] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const update = useUpdateProfile();

  useEffect(() => setDraft(saved), [saved]);

  const changes = changesBetween(saved, draft);
  const dirty = Object.keys(changes).length > 0;
  const errors = validate(draft);
  const visibleErrors = showErrors ? errors : {};

  const set = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setStatus(null);
    setDraft((current) => ({ ...current, [field]: value }));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length > 0 || !dirty) return;
    try {
      await update.mutateAsync(changes);
      setShowErrors(false);
      setStatus({ tone: "success", message: "Your details are saved." });
    } catch (cause) {
      setStatus({
        tone: "error",
        message: errorText(cause, "Could not save your details."),
      });
    }
  }

  return (
    <SettingsCard
      icon={UserRound}
      title="Your details"
      description="Your name as your team sees it, and how the store can reach you."
    >
      <CompletionMeter profile={profile} />

      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="profile-name"
            label="Name"
            autoComplete="name"
            maxLength={PROFILE_NAME_MAX_LENGTH}
            value={draft.name}
            onChange={(event) => set("name", event.target.value)}
            error={visibleErrors.name}
          />
          <TextField
            id="profile-email"
            label="Email"
            value={profile.email}
            readOnly
            disabled
            hint="Your sign-in email cannot be changed here."
          />
          <TextField
            id="profile-phone"
            label="Phone"
            optional
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01712345678"
            value={draft.phone}
            onChange={(event) => set("phone", event.target.value)}
            error={visibleErrors.phone}
          />
          <TextField
            id="profile-dob"
            label="Date of birth"
            optional
            type="date"
            max={todayIso()}
            value={draft.dateOfBirth}
            onChange={(event) => set("dateOfBirth", event.target.value)}
            error={visibleErrors.dateOfBirth}
          />
          <SelectField
            id="profile-gender"
            label="Gender"
            optional
            placeholder="Not set"
            options={GENDER_OPTIONS}
            value={draft.gender}
            onChange={(event) => {
              const value = event.target.value;
              set("gender", isGender(value) ? value : "");
            }}
          />
        </div>

        {status ? (
          <InlineStatus tone={status.tone}>{status.message}</InlineStatus>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            size="md"
            shape="rounded"
            disabled={!dirty}
            loading={update.isPending}
            loadingText="Saving…"
          >
            Save details
          </Button>
          {dirty ? (
            <Button
              size="md"
              shape="rounded"
              variant="ghost"
              onClick={() => {
                setDraft(saved);
                setShowErrors(false);
                setStatus(null);
              }}
            >
              Discard changes
            </Button>
          ) : null}
        </div>
      </form>
    </SettingsCard>
  );
}

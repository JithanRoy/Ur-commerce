"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FieldContext } from "./field-context";
import {
  Input,
  Select,
  Textarea,
  type InputProps,
  type SelectProps,
  type TextareaProps,
} from "./input";

export type FieldProps = {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  action?: React.ReactNode;
  id?: string;
  className?: string;
  children: React.ReactNode;
};

export function Field({
  label,
  hint,
  error,
  required,
  optional,
  disabled,
  hideLabel,
  action,
  id,
  className,
  children,
}: FieldProps) {
  const generated = React.useId();
  const fieldId = id ?? generated;
  const hasError = Boolean(error);
  const messageId = hasError
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined;

  const context = React.useMemo(
    () => ({
      id: fieldId,
      describedBy: messageId,
      invalid: hasError,
      required,
      disabled,
    }),
    [fieldId, messageId, hasError, required, disabled],
  );

  return (
    <div data-slot="field" className={cn("space-y-1.5", className)}>
      {label !== undefined || action !== undefined ? (
        <div className="flex items-center justify-between gap-2">
          {label !== undefined ? (
            <label
              htmlFor={fieldId}
              className={cn(
                "text-sm font-medium",
                disabled && "opacity-60",
                hideLabel && "sr-only",
              )}
            >
              {label}
              {required ? (
                <span aria-hidden className="ml-0.5 text-destructive">
                  *
                </span>
              ) : null}
              {optional ? (
                <span className="ml-1 font-normal text-muted-foreground">
                  (optional)
                </span>
              ) : null}
            </label>
          ) : null}
          {action}
        </div>
      ) : null}

      <FieldContext.Provider value={context}>{children}</FieldContext.Provider>

      {hasError ? (
        <p id={messageId} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type FieldPassthrough = Omit<FieldProps, "children" | "className" | "id"> & {
  fieldClassName?: string;
};

function fieldPropsOf<T extends FieldPassthrough & { id?: string }>({
  label,
  hint,
  error,
  optional,
  hideLabel,
  action,
  fieldClassName,
  required,
  disabled,
  id,
  ...control
}: T) {
  return {
    field: {
      label,
      hint,
      error,
      optional,
      hideLabel,
      action,
      required,
      disabled,
      id,
      className: fieldClassName,
    },
    control: { ...control, required, disabled, id },
  };
}

export function TextField(props: FieldPassthrough & InputProps) {
  const { field, control } = fieldPropsOf(props);
  return (
    <Field {...field}>
      <Input {...control} />
    </Field>
  );
}

export function TextareaField(props: FieldPassthrough & TextareaProps) {
  const { field, control } = fieldPropsOf(props);
  return (
    <Field {...field}>
      <Textarea {...control} />
    </Field>
  );
}

export function SelectField(props: FieldPassthrough & SelectProps) {
  const { field, control } = fieldPropsOf(props);
  return (
    <Field {...field}>
      <Select {...control} />
    </Field>
  );
}

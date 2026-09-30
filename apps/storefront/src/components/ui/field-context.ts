import * as React from "react";

type FieldContextValue = {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean | undefined;
  disabled: boolean | undefined;
};

export const FieldContext = React.createContext<FieldContextValue | null>(
  null,
);

type ControlState = {
  id?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  "aria-describedby"?: string;
};

function ariaFlag(
  value: React.AriaAttributes["aria-invalid"],
): boolean | undefined {
  if (value === undefined) return undefined;
  return value === true || value === "true";
}

export function useFieldControl(state: ControlState) {
  const field = React.useContext(FieldContext);
  const invalid =
    state.invalid ?? ariaFlag(state["aria-invalid"]) ?? field?.invalid ?? false;
  const describedBy = [state["aria-describedby"], field?.describedBy]
    .filter(Boolean)
    .join(" ");

  return {
    id: state.id ?? field?.id,
    required: state.required ?? field?.required,
    disabled: state.disabled ?? field?.disabled,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy || undefined,
  };
}

# UI components

Every button and form control in both apps comes from `src/components/ui/`.
Feature code composes these and never writes a raw, hand-styled
`<button>`, `<input>`, `<select>` or `<textarea>`.

The storefront and the admin each have their own copy, and **both copies have
the same API**. They differ only in defaults and theme tokens. The storefront
is a branded shop and the admin is a dense tool, so the copies can diverge on
purpose; see "Resist a shared `packages/ui`" in `CLAUDE.md`.

| | Admin default | Storefront default |
|---|---|---|
| Control / button height | `md` (h-10) | `lg` (h-11) |
| `accent` button | `bg-accent` wash | tenant brand `accent-solid` |

## Where things live

```
apps/<app>/src/
├── components/
│   ├── ui/            Generic building blocks: no API calls, no domain types
│   │   ├── button.tsx          Button, IconButton, buttonVariants
│   │   ├── input.tsx           Input, Textarea, Select, Checkbox, Radio
│   │   ├── field.tsx           Field, TextField, TextareaField, SelectField
│   │   ├── field-context.ts    Wires label/hint/error aria into controls
│   │   ├── image-field.tsx     (admin) single-image upload tile
│   │   ├── image-dropzone.tsx  (admin) multi-image drag-and-drop uploader
│   │   └── …
│   ├── layout/        App shell: header, sidebar, topbar
│   └── product/       (storefront) ProductCard, which every grid reuses
├── features/<area>/   Domain UI with data fetching (products, orders, auth…)
└── routes/ | app/     Pages: compose features, own no styling primitives
```

A change inside `components/ui/` updates every screen that uses it. If the
same markup appears in two places, extract it one level up.

## Button

```tsx
import { Button, IconButton } from "@/components/ui/button";

<Button>Save</Button>
<Button type="submit" loading={save.isPending} loadingText="Saving…">
  Save branding
</Button>
<Button variant="outline" leading={<Plus />}>Add variant</Button>
<Button asChild variant="ghost"><Link to="/products">Cancel</Link></Button>
<IconButton label="Delete brand" variant="destructive-ghost"><Trash2 /></IconButton>
```

| Prop | Values |
|---|---|
| `variant` | `primary` (default) · `secondary` · `accent` · `outline` · `ghost` · `soft` · `destructive` · `destructive-ghost` · `link` |
| `size` | `xs` · `sm` · `md` · `lg` · `xl` · `icon-xs` · `icon-sm` · `icon` · `icon-lg` |
| `shape` | `default` (rounded-md) · `rounded` (rounded-lg) · `pill` · `square` |
| `fullWidth` | stretches to the width of its container |
| `loading` / `loadingText` | shows a spinner, sets `disabled` and `aria-busy`, and can swap the label |
| `leading` / `trailing` | icon slots |
| `asChild` | renders the child, such as a router `Link`, with button styling |

- **`type` defaults to `"button"`.** A form's submit button must say
  `type="submit"` explicitly.
- `IconButton` requires a `label`, which becomes the `aria-label` and the
  tooltip. An icon-only button without one fails type-checking.
- `buttonVariants({...})` returns only the class string, for the rare element
  that cannot be a Button.

## Form controls

```tsx
import { TextField, SelectField, Field } from "@/components/ui/field";
import { Input, Checkbox } from "@/components/ui/input";

<TextField id="email" label="Email" type="email" error={errors.email?.message} {...register("email")} />
<TextField label="Password" type="password" />               {/* eye toggle built in */}
<TextField label="Price" leading="৳" inputMode="decimal" hint="In taka." />
<SelectField label="Status" options={STATUS_OPTIONS} value={status} onChange={…} />
<Input aria-label="Search products" leading={<Search />} value={q} onChange={…} onClear={() => setQ("")} />
<Checkbox label="Remember me" description="Stay signed in on this device." />

<Field label="Colour" hint="Buttons and links." error={problem}>
  <MyCustomControl />                                         {/* any control */}
</Field>
```

| Component | Adds on top of the native element |
|---|---|
| `Input` | `size`, `invalid`, `leading` / `trailing` slots, `onClear` (with `clearLabel`), password reveal (turn off with `revealable={false}`) |
| `Textarea` | `size`, `invalid`, `autoResize` |
| `Select` | `size`, `options`, `placeholder`, `leading`; still accepts child `<option>`s. Opt in to a search box with `searchable` (plus `searchPlaceholder`, `noResultsText`) |
| `Checkbox` / `Radio` | `label`, `description` |
| `Field` | `label`, `hint`, `error`, `required` (shows an asterisk), `optional`, `hideLabel`, `action` (a slot beside the label, for example "Forgot password?") |
| `TextField` etc. | `Field` and its control in one; `fieldClassName` styles the wrapper |

- A control inside a `Field` picks up its `id`, `aria-describedby`,
  `aria-invalid`, `required` and `disabled` automatically, so labels and error
  messages are announced correctly.
- **`className` always styles the control itself.** When a wrapper renders
  (any `Select`, or an `Input` with slots, clear or password),
  put margin, width and layout classes on `containerClassName`.
- **`searchable` is opt-in.** Without it, `Select` is the native element.
  With it, the same `onChange(event)` contract still fires (a hidden native
  `<select>` carries the value, so `name` and form submission keep working),
  but only `options` are rendered, not child `<option>`s. Search matches
  `option.keywords` when given, otherwise a string `label`. Set
  `alwaysShown` on an option that must survive filtering, such as
  "Create new…". Use it for long or growing lists (categories, brands, SKUs),
  not for three fixed statuses.
- React 19 passes `ref` as an ordinary prop, so `{...register("x")}` from
  react-hook-form works on any of these controls.
- The only native controls left are the hidden `type="file"` inputs inside the
  uploaders and the colour swatch picker.

## Dialog (storefront)

`components/ui/dialog.tsx` is the one modal shell: portal to `body`, backdrop,
Escape and backdrop click to close, scroll lock, focus moved in and restored
on close, and a close button. Bottom sheet on phones, centred from `sm`.

```tsx
<Dialog onClose={close} labelledBy="my-title" className="max-w-lg">
  <h2 id="my-title">…</h2>
</Dialog>
```

Pass `label` instead of `labelledBy` when there is no visible heading yet.
Used by quick-add and the review dialog. Keep the dialog mounted in a stable
spot in the tree; rendering it inside a branch that flips when its own save
refetches data remounts it and loses its state.

## Avatar and FileTrigger (storefront)

`components/ui/avatar.tsx` — initials in a tinted circle; `name` (null shows
a person icon) and `size` `sm` · `md` · `lg`. Used by the account menu and
each review.

`components/ui/file-trigger.tsx` — a label that opens the file picker, with
the real `<input type="file">` visually hidden but focusable. Props: `accept`,
`multiple`, `disabled`, `label` (the input's accessible name), `onFiles`.
Style it through `className`; the input value is reset after each pick so the
same file can be chosen again.

## Image upload (admin)

- `ImageField`: one image, such as a brand logo, category banner or store
  logo/favicon. It uploads direct to storage under a scope (`product`,
  `brand`, `category`, `collection` or `store`) and reports an `objectKey`
  plus a preview URL.
- `ImageDropzone`: many images, with drag-and-drop, multi-select and preview.

No admin screen accepts pasted image URLs.

# Frontend task — homepage hero carousel

**Status of the backend: done and verified.** Every endpoint below was
exercised against a live server on 2026-09-30, and every payload in this
document is a real captured response. Nothing here is waiting on backend work.

The hero on the homepage is currently **hardcoded in the storefront**. This
task makes it merchant-managed: the store owner uploads banner images in the
admin panel, and the storefront renders whatever it is given.

Two pieces of work, independent of each other:

| | Surface | Size |
|---|---|---|
| **Task A** | storefront — render the carousel | **S** |
| **Task B** | admin panel — manage the images | **M** |

Task A can ship first and is useful on its own: with no slides configured it
falls back to the existing static hero, so nothing regresses.

---

## Task A — render the carousel · **S**

### Where the data comes from

The homepage already calls `GET /api/v1/home`. That response now carries a
`hero` key alongside `sections` — **no extra request needed**.

```jsonc
// GET /api/v1/home  →  data.hero
{
  "autoplay": true,
  "intervalMs": 5000,
  "slides": [
    {
      "id": "ccb54857-8c96-4f81-a8e9-44c6616a8fad",
      "imageUrl": "https://cdn.example.com/hero/eid-2026.jpg",
      "mobileImageUrl": null,
      "alt": "Eid panjabi collection",
      "position": 0
    },
    {
      "id": "539f558d-846a-4009-86f4-90b99f02b2b1",
      "imageUrl": "https://cdn.example.com/hero/winter.jpg",
      "mobileImageUrl": null,
      "alt": "Winter arrivals",
      "position": 1
    }
  ]
}
```

`GET /api/v1/hero` returns the identical object if you need it standalone
(a client-side refresh, or a separate hero component that mounts on its own).

Slides arrive **already sorted** by `position`. Do not re-sort.

### The component

```tsx
import Autoplay from "embla-carousel-autoplay";

type HeroSlide = {
  id: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  alt: string | null;
  position: number;
};

type Hero = { autoplay: boolean; intervalMs: number; slides: HeroSlide[] };

export function HomeHero({ hero }: { hero: Hero }) {
  if (!hero?.slides?.length) return <StaticHero />;

  const plugins = hero.autoplay ? [Autoplay({ delay: hero.intervalMs })] : [];

  return (
    <Carousel opts={{ loop: hero.slides.length > 1 }} plugins={plugins}>
      <CarouselContent>
        {hero.slides.map((slide, i) => (
          <CarouselItem key={slide.id}>
            <picture>
              {slide.mobileImageUrl && (
                <source media="(max-width: 640px)" srcSet={slide.mobileImageUrl} />
              )}
              <img
                src={slide.imageUrl}
                alt={slide.alt ?? ""}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
              />
            </picture>
          </CarouselItem>
        ))}
      </CarouselContent>
      {hero.slides.length > 1 && (
        <>
          <CarouselPrevious />
          <CarouselNext />
        </>
      )}
    </Carousel>
  );
}
```

### The four cases that must not break

**1. No slides.** A newly provisioned store has none until its owner uploads
something, so this is the *default* state, not an edge case.

```jsonc
// real response from a store with no hero configured
{ "success": true, "data": { "autoplay": true, "intervalMs": 5000, "slides": [] } }
```

`200`, never `404`, never `null`. `data.slides` is **always an array** and
`data.hero` is **always present** on `/home`. One guard is enough:

```tsx
if (!hero?.slides?.length) return <StaticHero />;
```

**2. A slide whose image fails to load.** The URL points at object storage,
and a file can go missing while the database row survives. Drop that slide
rather than rendering a broken-image icon:

```tsx
const [broken, setBroken] = useState<Set<string>>(new Set());
const slides = hero.slides.filter((s) => !broken.has(s.id));
// on the <img>:  onError={() => setBroken((b) => new Set(b).add(slide.id))}
```

Then re-check `slides.length` — if every image fails, fall back to the static
hero.

**3. One slide.** Not a carousel. Skip the autoplay timer, the arrows and the
dots — `loop: hero.slides.length > 1` above handles the loop, but check your
dots component too.

**4. The request fails.** The hero is decorative; the rest of the homepage is
independent of it. Render the static hero rather than blocking the page.

### Accessibility — this is on you, not the API

The API sends `autoplay` and `intervalMs` but **cannot enforce how you use
them**.

- **Pause on hover and on keyboard focus.** `embla-carousel-autoplay` has
  `stopOnInteraction` and `stopOnMouseEnter` — turn both on.
- **Respect `prefers-reduced-motion: reduce`** by not autoplaying at all:

  ```tsx
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const plugins = hero.autoplay && !reduced ? [Autoplay({ delay: hero.intervalMs })] : [];
  ```

  WCAG 2.2.2 requires moving content to be pausable. A merchant setting a 2s
  interval is within their rights; making it unusable is not.
- **`alt` may be null**, which means the image is decorative. Pass `alt=""` —
  **not** the store name, and not a made-up description.

### Performance

The hero is the homepage's **largest contentful paint**. Load the first slide
eagerly with `fetchPriority="high"` and lazy-load the rest, as in the snippet
above. Reserve its height in CSS (aspect-ratio box) or the page shifts as the
image arrives.

### Done when

- [ ] A store with slides shows them, rotating at `intervalMs`
- [ ] A store with **no** slides shows the existing static hero, no console errors
- [ ] `autoplay: false` renders the slides without rotating
- [ ] A single slide shows no arrows, dots or timer
- [ ] A broken image URL drops that slide instead of showing a broken icon
- [ ] Autoplay pauses on hover and on focus
- [ ] Nothing autoplays under `prefers-reduced-motion: reduce`
- [ ] The first slide is not lazy-loaded
- [ ] Lighthouse shows no layout shift from the hero

---

## Task B — manage the images in the admin panel · **M**

**Owner-only.** A `TENANT_STAFF` token gets **403** on every route below —
verified. Hide the menu entry for non-owners rather than letting them click
into a screen that will fail.

```jsonc
// staff hitting GET /admin/hero
{ "success": false, "message": "You do not have permission to perform this action" }
```

### The screen

A list of slide cards, in order, with drag-to-reorder. Each card shows the
image, its alt text and a delete control. Above or beside the list: an
autoplay toggle and an interval control.

### Endpoints

| Method | Path | Body |
|---|---|---|
| GET | `/api/v1/admin/hero` | — |
| POST | `/api/v1/admin/hero/slides` | `{ imageObjectKey, alt? }` |
| PATCH | `/api/v1/admin/hero/slides/:id` | `{ alt? }` |
| DELETE | `/api/v1/admin/hero/slides/:id` | — |
| PUT | `/api/v1/admin/hero/slides/order` | `{ slideIds: [...] }` |
| PATCH | `/api/v1/admin/hero/settings` | `{ heroAutoplay?, heroIntervalMs? }` |

`GET /admin/hero` returns the same envelope as the public route, plus
`isActive`, `startsAt`, `endsAt`, `imageObjectKey`, `createdAt` and
`updatedAt` on each slide. **You can ignore all of those** — see
*Fields to ignore* at the end.

### Uploading

Reuse the **`useImageUpload` hook from
[09-image-uploads-tasks.md](09-image-uploads-tasks.md)**. It is the same
three-step presigned flow as product and brand images. The only difference is
the scope:

```ts
const objectKey = await uploadImage(file, { scope: "store" });
await api.post("/admin/hero/slides", { objectKey ... });
```

Full reference: [10-image-upload-reference.md](10-image-upload-reference.md).
If that hook does not exist yet, build it there first — four other screens
need it.

The reminder worth repeating, because it costs half a day: **step 2 (`PUT` to
storage) must bypass your API client.** No `Authorization` header — adding one
invalidates the signature and you get a 403 that looks like a permissions bug.

Send `imageObjectKey` **or** `imageUrl`, never both:

```jsonc
{ "success": false, "message": "Send either imageUrl or imageObjectKey, not both" }
```

### Reorder is all-or-nothing

`PUT /admin/hero/slides/order` takes **every** slide id, in the new order. A
partial list is refused rather than applied:

```jsonc
{ "success": false, "message": "Send every slide id exactly once — expected 2, got 1" }
```

So send the complete list from your local state after the drag settles, not
just the moved item. Optimistically reorder locally, then reconcile with the
response — it returns the full list in its new order.

### Settings

```jsonc
// PATCH /admin/hero/settings
{ "heroAutoplay": false, "heroIntervalMs": 8000 }
// →  data: { "autoplay": false, "intervalMs": 8000 }
```

`heroIntervalMs` must be **2000–30000** ms. Use a slider or a select with
sensible steps (3s / 5s / 8s / 10s) rather than a free number input — the
bound exists because under 2s a slide is gone before it can be read.

### Errors to surface

All errors come back as `{ success: false, message, path, timestamp }` with the
matching HTTP status. Show `message` directly — each one is written for the
merchant:

| Situation | `message` | Status |
|---|---|---|
| No image sent | `A slide needs an image` | 400 |
| Both image forms | `Send either imageUrl or imageObjectKey, not both` | 400 |
| Eleventh slide | `A store may have at most 10 hero slides. Delete one first.` | 400 |
| Interval too low | `heroIntervalMs must not be less than 2000` | 400 |
| Partial reorder | `Send every slide id exactly once — expected N, got M` | 400 |
| Slide from another store | `Slide not found` | 404 |
| Staff, not owner | `You do not have permission to perform this action` | 403 |

**Max 10 slides.** Disable the upload control at 10 and say why, rather than
letting the merchant pick a file and then fail.

### Caching

`GET /hero` is cached 5 minutes per store, but **every admin write invalidates
it immediately**. The merchant sees their change on the next storefront load;
you do not need to bust anything.

### Done when

- [ ] An owner can upload an image and see it on the storefront
- [ ] Drag-to-reorder persists and survives a refresh
- [ ] Deleting a slide removes it from the storefront
- [ ] The autoplay toggle and interval control round-trip
- [ ] The upload control is disabled at 10 slides, with an explanation
- [ ] Every error above renders its `message` to the merchant
- [ ] The hero menu entry is hidden for `TENANT_STAFF`

---

## Fields to ignore

A slide can also carry `eyebrow`, `headline`, `subheadline` and two
label-plus-URL button pairs, so a merchant could own the hero copy as well as
the image. **Ignore them for this task** — keep your existing headline and
buttons in the storefront. They come back `null` when unused and are safe to
leave out of both the admin form and the render.

`GET /admin/hero` also returns `isActive`, `startsAt` and `endsAt`, which
support scheduling a campaign in advance. The public route already filters on
them, so a scheduled slide simply does not appear until its window opens.
Nothing to build unless you want to expose scheduling later.

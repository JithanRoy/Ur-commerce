function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = channelLuminance(parseInt(value.slice(0, 2), 16));
  const g = channelLuminance(parseInt(value.slice(2, 4), 16));
  const b = channelLuminance(parseInt(value.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: number, b: number): number {
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

export function readableTextOn(hex: string): string {
  const background = relativeLuminance(hex);
  const onWhite = contrastRatio(background, 1);
  const onBlack = contrastRatio(background, 0);
  return onWhite >= onBlack ? "#FFFFFF" : "#111827";
}

function tint(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const mix = (start: number) =>
    Math.round(start + (255 - start) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(parseInt(value.slice(0, 2), 16))}${mix(
    parseInt(value.slice(2, 4), 16),
  )}${mix(parseInt(value.slice(4, 6), 16))}`;
}

export function BrandPreview({
  storeName,
  tagline,
  logoUrl,
  primaryColor,
  accentColor,
}: {
  storeName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
}) {
  const onPrimary = readableTextOn(primaryColor);
  const accentWash = tint(accentColor, 0.86);

  return (
    <div className="lg:sticky lg:top-20">
      <p className="mb-3 text-sm font-medium">Storefront preview</p>

      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="flex h-12 items-center gap-3 border-b bg-white px-4">
          {logoUrl.trim().startsWith("https://") ? (
            <img
              src={logoUrl}
              alt=""
              className="h-6 w-auto object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="text-sm font-semibold text-neutral-900">
              {storeName}
            </span>
          )}
          <span className="ml-auto flex gap-3 text-[0.7rem] text-neutral-400">
            <span>Shop</span>
            <span>Brands</span>
          </span>
        </div>

        <div className="px-6 py-8" style={{ background: accentWash }}>
          <p className="text-[0.6rem] uppercase tracking-[0.2em] text-neutral-500">
            {storeName}
          </p>
          <p className="mt-2 text-xl font-semibold leading-tight text-neutral-900">
            Everyday pieces,{" "}
            <span style={{ color: primaryColor }}>made to be worn.</span>
          </p>
          {tagline.trim() ? (
            <p className="mt-2 text-xs text-neutral-600">{tagline}</p>
          ) : null}
          <span
            className="mt-4 inline-flex h-8 items-center rounded-full px-4 text-xs font-medium"
            style={{ background: primaryColor, color: onPrimary }}
          >
            Shop the collection
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 bg-white p-4">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <div className="aspect-4/5 rounded bg-neutral-100" />
              <div className="mt-1.5 h-1.5 w-3/4 rounded bg-neutral-200" />
              <div
                className="mt-1 h-1.5 w-1/2 rounded"
                style={{ background: primaryColor, opacity: 0.55 }}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Button text flips between light and dark automatically, whichever stays
        readable on your primary colour.
      </p>
    </div>
  );
}

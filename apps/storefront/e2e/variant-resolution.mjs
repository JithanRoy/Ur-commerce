import {
  findVariant, isValueAvailable, hasStockFor, optionNamesInOrder, maxQuantityFor,
} from "../src/features/product/variant-resolution.ts";

const res = await fetch("http://localhost:3002/api/v1/products/slim-fit-denim-shirt", {
  headers: { "X-Tenant-Host": "demo.localhost" },
});
const product = (await res.json()).data;
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

console.log("product:", product.name, "| variants:", product.variants.length);
const names = optionNamesInOrder(product);
ok(JSON.stringify(names) === '["Size","Colour"]', `options sorted by position → ${JSON.stringify(names)}`);

ok(findVariant(product, {}) === null, "no selection → no variant");
ok(findVariant(product, { Size: "M" }) === null, "partial selection → no variant");

const v = findVariant(product, { Size: "M", Colour: "Indigo" });
ok(v?.sku === "DEN-IND-M", `full selection resolves → ${v?.sku}`);
ok(v?.price === 249900, `variant price in paisa → ${v?.price}`);

const v2 = findVariant(product, { Size: "L", Colour: "Black" });
ok(v2?.sku === "DEN-BLK-L", `second combination → ${v2?.sku}`);
ok(v2?.stock === 0, `out-of-stock variant still resolves (stock ${v2?.stock})`);
ok(maxQuantityFor(v2) === 0, "max quantity 0 for sold-out variant");
ok(maxQuantityFor(v) === Math.min(v.stock, 100), `max quantity capped at stock (${maxQuantityFor(v)})`);

ok(isValueAvailable(product, {}, "Size", "M"), "M available with no selection");
ok(isValueAvailable(product, { Colour: "Black" }, "Size", "L"), "L available when Black picked");
ok(!isValueAvailable(product, { Colour: "Purple" }, "Size", "M"), "impossible combination unavailable");

ok(hasStockFor(product, { Colour: "Indigo" }, "Size", "L"), "L+Indigo has stock");
ok(!hasStockFor(product, { Colour: "Black" }, "Size", "L"), "L+Black is sold out (disabled, not hidden)");

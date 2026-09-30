import { lazyRoute } from "@/lib/lazy-route";

export const ProductsRoute = lazyRoute(
  () => import("./products"),
  "ProductsRoute",
);
export const ProductNewRoute = lazyRoute(
  () => import("./product-new"),
  "ProductNewRoute",
);
export const ProductEditRoute = lazyRoute(
  () => import("./product-edit"),
  "ProductEditRoute",
);
export const OrdersRoute = lazyRoute(() => import("./orders"), "OrdersRoute");
export const OrderDetailRoute = lazyRoute(
  () => import("./order-detail"),
  "OrderDetailRoute",
);
export const CategoriesRoute = lazyRoute(
  () => import("./categories"),
  "CategoriesRoute",
);
export const BrandsRoute = lazyRoute(() => import("./brands"), "BrandsRoute");
export const CollectionsRoute = lazyRoute(
  () => import("./collections"),
  "CollectionsRoute",
);
export const CollectionProductsRoute = lazyRoute(
  () => import("./collection-products"),
  "CollectionProductsRoute",
);
export const TeamRoute = lazyRoute(() => import("./team"), "TeamRoute");
export const BrandingRoute = lazyRoute(
  () => import("./branding"),
  "BrandingRoute",
);
export const NotFoundRoute = lazyRoute(
  () => import("./not-found"),
  "NotFoundRoute",
);

const allRoutes = [
  ProductsRoute,
  ProductNewRoute,
  ProductEditRoute,
  OrdersRoute,
  OrderDetailRoute,
  CategoriesRoute,
  BrandsRoute,
  CollectionsRoute,
  CollectionProductsRoute,
  TeamRoute,
  BrandingRoute,
  NotFoundRoute,
];

export function preloadAllRoutes() {
  for (const route of allRoutes) void route.preload();
}

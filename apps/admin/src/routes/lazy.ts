import { lazyRoute, type Preloadable } from "@/lib/lazy-route";

export const LoginRoute = lazyRoute(() => import("./login"), "LoginRoute");

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
export const HeroRoute = lazyRoute(() => import("./hero"), "HeroRoute");
export const AccountRoute = lazyRoute(
  () => import("./account"),
  "AccountRoute",
);
export const SectionsRoute = lazyRoute(
  () => import("./sections"),
  "SectionsRoute",
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
  HeroRoute,
  SectionsRoute,
  AccountRoute,
  NotFoundRoute,
];

export function preloadAllRoutes() {
  for (const route of allRoutes) void route.preload();
}

const routesByNavPath: Record<string, Preloadable> = {
  "/products": ProductsRoute,
  "/orders": OrdersRoute,
  "/categories": CategoriesRoute,
  "/brands": BrandsRoute,
  "/collections": CollectionsRoute,
  "/team": TeamRoute,
  "/branding": BrandingRoute,
  "/hero": HeroRoute,
  "/sections": SectionsRoute,
  "/account": AccountRoute,
};

export function preloadRouteFor(path: string) {
  void routesByNavPath[path]?.preload();
}

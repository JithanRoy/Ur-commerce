import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { isApiError } from "@urcommerce/api-client";
import { ActivityBar } from "@/components/layout/activity-bar";
import { AdminShell } from "@/components/layout/admin-shell";
import { NetworkStatus } from "@/components/ui/network-status";
import {
  BrandingRoute,
  BrandsRoute,
  CategoriesRoute,
  CollectionProductsRoute,
  CollectionsRoute,
  NotFoundRoute,
  OrderDetailRoute,
  OrdersRoute,
  ProductEditRoute,
  ProductNewRoute,
  ProductsRoute,
  TeamRoute,
} from "@/routes/lazy";
import { LoginRoute } from "@/routes/login";
import { RedirectIfAuthenticated } from "@/routes/redirect-if-authenticated";
import { RequireStaff } from "@/routes/require-staff";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ActivityBar />
      <NetworkStatus />
      <BrowserRouter>
        <Routes>
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<LoginRoute />} />
          </Route>

          <Route element={<RequireStaff />}>
            <Route element={<AdminShell />}>
              <Route index element={<Navigate to="/products" replace />} />
              <Route path="products" element={<ProductsRoute />} />
              <Route path="products/new" element={<ProductNewRoute />} />
              <Route path="products/:productId" element={<ProductEditRoute />} />
              <Route path="orders" element={<OrdersRoute />} />
              <Route path="orders/:orderId" element={<OrderDetailRoute />} />
              <Route path="categories" element={<CategoriesRoute />} />
              <Route path="brands" element={<BrandsRoute />} />
              <Route path="collections" element={<CollectionsRoute />} />
              <Route
                path="collections/:collectionId"
                element={<CollectionProductsRoute />}
              />
              <Route path="team" element={<TeamRoute />} />
              <Route path="branding" element={<BrandingRoute />} />
              <Route path="*" element={<NotFoundRoute />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

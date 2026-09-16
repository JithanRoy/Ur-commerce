import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { isApiError } from "@urcommerce/api-client";
import { AdminShell } from "@/components/layout/admin-shell";
import { BrandsRoute } from "@/routes/brands";
import { CategoriesRoute } from "@/routes/categories";
import { CollectionsRoute } from "@/routes/collections";
import { LoginRoute } from "@/routes/login";
import { NotFoundRoute } from "@/routes/not-found";
import { ProductEditRoute } from "@/routes/product-edit";
import { ProductNewRoute } from "@/routes/product-new";
import { OrderDetailRoute } from "@/routes/order-detail";
import { OrdersRoute } from "@/routes/orders";
import { ProductsRoute } from "@/routes/products";
import { RedirectIfAuthenticated } from "@/routes/redirect-if-authenticated";
import { RequireStaff } from "@/routes/require-staff";
import { TeamRoute } from "@/routes/team";

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
              <Route path="team" element={<TeamRoute />} />
              <Route path="*" element={<NotFoundRoute />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

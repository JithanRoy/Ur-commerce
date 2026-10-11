import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { isApiError } from "@urcommerce/api-client";
import { ConsoleShell } from "@/components/layout/console-shell";
import { LoginRoute } from "@/routes/login";
import { NewStoreRoute } from "@/routes/new-store";
import { NotFoundRoute } from "@/routes/not-found";
import { RequireOwner, RedirectIfSignedIn } from "@/routes/guards";
import { StoreDetailRoute } from "@/routes/store-detail";
import { StoresRoute } from "@/routes/stores";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
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
          <Route element={<RedirectIfSignedIn />}>
            <Route path="/login" element={<LoginRoute />} />
          </Route>
          <Route element={<RequireOwner />}>
            <Route element={<ConsoleShell />}>
              <Route index element={<StoresRoute />} />
              <Route path="stores/new" element={<NewStoreRoute />} />
              <Route path="stores/:storeId" element={<StoreDetailRoute />} />
              <Route path="*" element={<NotFoundRoute />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}

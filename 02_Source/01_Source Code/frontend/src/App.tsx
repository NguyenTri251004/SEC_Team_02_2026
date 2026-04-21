import { RouterProvider } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from "antd";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./auth/AuthProvider";
import { router } from "./router";
import { antTheme } from "./constants/theme";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { frontendLogger } from "./lib/observability/logger";


// React Query client (shared across app)
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      frontendLogger.error("frontend.query.error", {
        queryKey: query.queryKey,
        message: error instanceof Error ? error.message : String(error),
      });
    },
  }),
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={antTheme}>
          <AntdApp>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

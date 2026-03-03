import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import DashboardRouter from "../pages/dashboard/DashboardRouter";
//import MaterialsPage from "../pages/materials/MaterialsPage";
import NotFoundPage from "../pages/not-found/NotFoundPage";

/**
 * /dashboard   → role-based dashboard (Admin / InventoryManager / QC / Production)
 * /lots        → Inventory Lots CRUD
 * /materials   → Materials CRUD
 * /transactions→ Transaction history
 * /qc          → Quality Control queue & tests
 * /batches     → Production Batches
 * /labels      → Label Templates
 * /reports     → Reports & Export
 * /users       → User Management  (Admin only)
 * /config      → System Config    (Admin only)
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardRouter /> },
      { path: "lots", element: <NotFoundPage /> },
      { path: "materials", element: <NotFoundPage /> },
      { path: "transactions", element: <NotFoundPage /> },
      { path: "qc", element: <NotFoundPage /> },
      { path: "batches", element: <NotFoundPage /> },
      { path: "labels", element: <NotFoundPage /> },
      { path: "reports", element: <NotFoundPage /> },
      { path: "users", element: <NotFoundPage /> },
      { path: "config", element: <NotFoundPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

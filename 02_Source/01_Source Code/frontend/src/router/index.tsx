import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import DashboardRouter from "../pages/dashboard/DashboardRouter";
import MaterialsPage from "../pages/materials/MaterialsPage";
import LotsPage from "../pages/lots/LotsPage";
import TransactionsPage from "../pages/transactions/TransactionsPage";
import QCPage from "../pages/qc/QCPage";
import BatchesPage from "../pages/batches/BatchesPage";
import LabelsPage from "../pages/labels/LabelsPage";
import ReportsPage from "../pages/reports/ReportsPage";
import UsersPage from "../pages/users/UsersPage";
import ConfigPage from "../pages/config/ConfigPage";
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
      { path: "lots", element: <LotsPage /> },
      { path: "materials", element: <MaterialsPage /> },
      { path: "transactions", element: <TransactionsPage /> },
      { path: "qc", element: <QCPage /> },
      { path: "batches", element: <BatchesPage /> },
      { path: "labels", element: <LabelsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "config", element: <ConfigPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

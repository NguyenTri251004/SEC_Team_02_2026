import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import LoginPage from "../pages/login/LoginPage";
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
import { useAuth } from "../auth/context";

function AuthGuard() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <AuthGuard />,
    children: [
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
    ],
  },
]);


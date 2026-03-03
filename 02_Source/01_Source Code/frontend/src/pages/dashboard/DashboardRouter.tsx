import { useAuth } from "../../auth/context";
import AdminDashboard from "./AdminDashboard";
import InventoryManagerDashboard from "./InventoryManagerDashboard";
import QualityControlDashboard from "./QualityControlDashboard";
import ProductionDashboard from "./ProductionDashboard";
import NotFoundPage from "../not-found/NotFoundPage";

/**
 * Routes the user to their role-specific dashboard.
 */
export default function DashboardRouter() {
  const { user } = useAuth();

  switch (user?.role) {
    case "admin":
      return <AdminDashboard />;
    case "inventory_manager":
      return <InventoryManagerDashboard />;
    case "quality_control":
      return <QualityControlDashboard />;
    case "production":
      return <ProductionDashboard />;
    default:
      return <NotFoundPage />;
  }
}

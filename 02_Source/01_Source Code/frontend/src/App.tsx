import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";

import DashboardPage from "./pages/DashboardPage"; 
import MaterialsPage from "./pages/MaterialsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute />, 
    children: [
      {
        element: <MainLayout />, 
        children: [
          { index: true, element: <DashboardPage /> }, 
          
          {
            element: <ProtectedRoute allowedRoles={['inventory_manager', 'admin', 'viewer','production','quality_control']} />,
            children: [
              { path: "materials", element: <MaterialsPage /> }
            ]
          }
        ]
      }
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import type { User } from "../types";

const mockData: User[] = [
  {
    user_id: "USR-001",
    keycloak_sub: "kc-sub-001",
    email: "admin@ims.local",
    username: "admin_user",
    role: "admin",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    last_login_at: "2026-03-06T08:00:00Z",
  },
  {
    user_id: "USR-002",
    keycloak_sub: "kc-sub-002",
    email: "manager@ims.local",
    username: "inv_manager",
    role: "inventory_manager",
    is_active: true,
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-02-20T00:00:00Z",
    last_login_at: "2026-03-05T14:30:00Z",
  },
  {
    user_id: "USR-003",
    keycloak_sub: "kc-sub-003",
    email: "qc@ims.local",
    username: "qc_analyst1",
    role: "quality_control",
    is_active: true,
    created_at: "2026-01-10T00:00:00Z",
    updated_at: "2026-01-10T00:00:00Z",
    last_login_at: "2026-03-06T09:15:00Z",
  },
  {
    user_id: "USR-004",
    keycloak_sub: "kc-sub-004",
    email: "operator@ims.local",
    username: "operator1",
    role: "production",
    is_active: true,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
    last_login_at: "2026-03-04T07:45:00Z",
  },
  {
    user_id: "USR-005",
    keycloak_sub: "kc-sub-005",
    email: "viewer@ims.local",
    username: "report_viewer",
    role: "viewer",
    is_active: false,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-28T00:00:00Z",
    last_login_at: null,
  },
];

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      try {
        const response = await api.get("/api/admin/users");
        const data = response.data?.data || response.data;
        if (!data || data.length === 0) return mockData;
        return data;
      } catch {
        return mockData;
      }
    },
  });
};

export const useSaveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ isEditing, data }: { isEditing: boolean; data: Partial<User> & { password?: string } }) => {
      if (isEditing) {
        return api.put(`/api/admin/users/${data.user_id}`, data);
      }
      return api.post("/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useToggleUserActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return api.patch(`/api/admin/users/${userId}/toggle-active`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

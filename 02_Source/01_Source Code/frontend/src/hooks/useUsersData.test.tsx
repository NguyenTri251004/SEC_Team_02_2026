import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import {
  useResetPassword,
  useSaveUser,
  useToggleUserActive,
  useUsers,
} from "./useUsersData";

const invalidateQueries = vi.fn();
const useQueryMock = vi.fn((options: unknown) => options);
const useMutationMock = vi.fn((options: unknown) => options);

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("useUsersData hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns fallback users on empty/error responses", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
    let query = useUsers();
    let users = await query.queryFn();
    expect(users.length).toBeGreaterThan(0);
    expect(users[0].user_id).toBe("USR-001");

    vi.mocked(api.get).mockRejectedValueOnce(new Error("offline"));
    query = useUsers();
    users = await query.queryFn();
    expect(users.length).toBeGreaterThan(0);
  });

  it("save user mutation handles create/update and cache invalidation", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.put).mockResolvedValue({ data: {} });
    const mutation = useSaveUser();

    await mutation.mutationFn({ isEditing: false, data: { user_id: "USR-9" } });
    expect(api.post).toHaveBeenCalledWith("/api/admin/users", { user_id: "USR-9" });

    await mutation.mutationFn({ isEditing: true, data: { user_id: "USR-9" } });
    expect(api.put).toHaveBeenCalledWith("/api/admin/users/USR-9", {
      user_id: "USR-9",
    });

    mutation.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it("toggles activity and resets password with expected payloads", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    const toggleMutation = useToggleUserActive();
    await toggleMutation.mutationFn("USR-1");
    expect(api.patch).toHaveBeenCalledWith("/api/admin/users/USR-1/toggle-active");
    toggleMutation.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["users"] });

    const resetMutation = useResetPassword();
    await resetMutation.mutationFn({ userId: "USR-1", newPassword: "new-pass" });
    expect(api.post).toHaveBeenCalledWith("/api/admin/users/USR-1/reset-password", {
      new_password: "new-pass",
    });
  });
});

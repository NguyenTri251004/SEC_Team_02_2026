import { describe, expect, it, vi } from "vitest";
import { reportApi } from "../services/api";
import {
  useAuditLog,
  useInventoryReport,
  useTransactionReport,
} from "./useReportsData";

const useQueryMock = vi.fn((options: unknown) => options);

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("../services/api", () => ({
  reportApi: {
    getInventoryReport: vi.fn(),
    getTransactionReport: vi.fn(),
    getAuditLog: vi.fn(),
  },
}));

describe("useReportsData hooks", () => {
  it("wires inventory report query and select function", async () => {
    vi.mocked(reportApi.getInventoryReport).mockResolvedValue({ data: [{ id: 1 }] } as any);
    const hook = useInventoryReport({ site: "A" }) as any;
    const response = await hook.queryFn();
    expect(reportApi.getInventoryReport).toHaveBeenCalledWith({ site: "A" });
    expect(hook.select(response)).toEqual([{ id: 1 }]);
  });

  it("wires transaction report query and select function", async () => {
    vi.mocked(reportApi.getTransactionReport).mockResolvedValue({ data: [{ id: 2 }] } as any);
    const hook = useTransactionReport() as any;
    const response = await hook.queryFn();
    expect(reportApi.getTransactionReport).toHaveBeenCalledWith(undefined);
    expect(hook.select(response)).toEqual([{ id: 2 }]);
  });

  it("wires audit log query and select function", async () => {
    vi.mocked(reportApi.getAuditLog).mockResolvedValue({ data: [{ id: 3 }] } as any);
    const hook = useAuditLog({ actor: "alice" }) as any;
    const response = await hook.queryFn();
    expect(reportApi.getAuditLog).toHaveBeenCalledWith({ actor: "alice" });
    expect(hook.select(response)).toEqual([{ id: 3 }]);
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { exportToCSV } from "./exportUtils";

describe("exportToCSV", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exports CSV and triggers a download with escaped values", () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => undefined);
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "a") return link;
      return originalCreateElement(tagName);
    });

    exportToCSV(
      [
        { name: 'Alice "A"', amount: 12 },
        { name: null, amount: undefined },
      ],
      [
        { key: "name", title: "Name" },
        { key: "amount", title: "Amount" },
      ],
      "inventory-export",
    );

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(link.download).toBe("inventory-export.csv");
    expect(link.href).toBe("blob:mock-url");
    expect(appendSpy).toHaveBeenCalledWith(link);
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledWith(link);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});

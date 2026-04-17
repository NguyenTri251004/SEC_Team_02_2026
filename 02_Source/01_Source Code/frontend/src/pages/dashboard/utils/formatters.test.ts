import { describe, expect, it } from "vitest";
import { formatQuantitiesByUnit } from "./formatters";

describe("formatQuantitiesByUnit", () => {
  it("returns null for empty or missing input", () => {
    expect(formatQuantitiesByUnit(undefined)).toBeNull();
    expect(formatQuantitiesByUnit([])).toBeNull();
  });

  it("filters invalid units and returns null when none are valid", () => {
    expect(
      formatQuantitiesByUnit([
        { unit_of_measure: " ", total_quantity: 1 },
        { unit_of_measure: "", total_quantity: 2 },
      ]),
    ).toBeNull();
  });

  it("formats up to two entries and appends +N more for remaining units", () => {
    const formatted = formatQuantitiesByUnit([
      { unit_of_measure: "kg", total_quantity: 1200 },
      { unit_of_measure: "ea", total_quantity: 8 },
      { unit_of_measure: "L", total_quantity: 3 },
    ]);

    expect(formatted).toBe("1,200 kg, 8 ea +1 more");
  });
});

/**
 * Formats an array of quantities by unit into a human-readable string.
 * Truncates to first 2 units if more than 2 exist.
 * Filters out empty/invalid units.
 *
 * @example
 * formatQuantitiesByUnit([
 *   { unit_of_measure: "kg", total_quantity: 420 },
 *   { unit_of_measure: "ea", total_quantity: 200 }
 * ])
 * // Returns: "420 kg, 200 ea"
 *
 * @example
 * formatQuantitiesByUnit([...5 items])
 * // Returns: "420 kg, 200 ea +3 more"
 */
export function formatQuantitiesByUnit(
  quantitiesByUnit?: { unit_of_measure: string; total_quantity: number }[],
): string | null {
  if (!quantitiesByUnit || quantitiesByUnit.length === 0) {
    return null;
  }

  const validQuantities = quantitiesByUnit.filter(
    (item) => item.unit_of_measure.trim().length > 0,
  );

  if (validQuantities.length === 0) {
    return null;
  }

  const visibleItems = validQuantities.slice(0, 2);
  const moreCount = validQuantities.length - visibleItems.length;

  const formatted = visibleItems
    .map(
      (item) =>
        `${item.total_quantity.toLocaleString()} ${item.unit_of_measure}`,
    )
    .join(", ");

  return moreCount > 0 ? `${formatted} +${moreCount} more` : formatted;
}

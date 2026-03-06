export function exportToCSV(
  data: Record<string, unknown>[],
  columns: { key: string; title: string }[],
  filename: string,
): void {
  // Generate CSV headers from columns
  const headers = columns.map((c) => c.title);
  const headerLine = headers.map((h) => `"${h}"`).join(",");

  // Map data rows using column keys
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        // Handle null/undefined values
        if (value === null || value === undefined) return '""';
        const str = String(value).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(","),
  );

  const csvContent = [headerLine, ...rows].join("\n");

  // Create Blob with BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  // Trigger download via temporary anchor element
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

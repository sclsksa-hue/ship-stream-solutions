import Papa from "papaparse";
import { toast } from "sonner";

export type CsvImportResult<T> = {
  valid: T[];
  errors: string[];
};

/**
 * Export data to CSV and trigger download
 * @param data Array of objects to export
 * @param filename Name of the file (without .csv extension)
 * @param columns Optional column mapping { key: data key, label: CSV header }
 */
export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) {
    toast.error("No data to export");
    return;
  }

  // If columns specified, map data to include only those columns with custom labels
  let csvData: any[] = data;
  let headers: string[] | undefined;

  if (columns) {
    headers = columns.map(c => c.label);
    csvData = data.map(row => {
      const mappedRow: any = {};
      columns.forEach(col => {
        mappedRow[col.label] = row[col.key] ?? "";
      });
      return mappedRow;
    });
  }

  const csv = Papa.unparse(csvData, {
    header: true,
    columns: headers,
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast.success("CSV exported successfully");
}

/**
 * Handle CSV file import with validation
 * @param validator Function that validates and transforms parsed CSV data
 * @param onSuccess Callback with validated data
 */
export async function handleCsvImport<T>(
  validator: (data: any[]) => CsvImportResult<T>,
  onSuccess: (data: T[]) => Promise<void>
) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv";

  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { valid, errors } = validator(results.data);

          if (errors.length > 0) {
            toast.error(`Import errors: ${errors.join(", ")}`);
          }

          if (valid.length === 0) {
            toast.error("No valid rows to import");
            return;
          }

          await onSuccess(valid);
          toast.success(`Successfully imported ${valid.length} rows`);
        } catch (error: any) {
          toast.error(`Import failed: ${error.message}`);
        }
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  input.click();
}

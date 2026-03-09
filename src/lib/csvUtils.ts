import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export type CsvImportResult<T> = {
  valid: T[];
  errors: string[];
};

/**
 * Export data to CSV and trigger download
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

  const csv = Papa.unparse(csvData, { header: true, columns: headers });
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
  toast.success("CSV exported successfully");
}

/**
 * Export data to Excel (.xlsx)
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) {
    toast.error("No data to export");
    return;
  }

  let exportData: any[] = data;
  if (columns) {
    exportData = data.map(row => {
      const mappedRow: any = {};
      columns.forEach(col => {
        mappedRow[col.label] = row[col.key] ?? "";
      });
      return mappedRow;
    });
  }

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
  toast.success("Excel exported successfully");
}

/**
 * Handle CSV or Excel file import with validation
 */
export async function handleFileImport<T>(
  validator: (data: any[]) => CsvImportResult<T>,
  onSuccess: (data: T[]) => Promise<void>
) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,.xlsx,.xls";

  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      let rows: any[];

      if (ext === "xlsx" || ext === "xls") {
        rows = await parseExcelFile(file);
      } else {
        rows = await parseCsvFile(file);
      }

      const { valid, errors } = validator(rows);

      if (errors.length > 0) {
        toast.error(`Import errors: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? ` (+${errors.length - 3} more)` : ""}`);
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
  };

  input.click();
}

/** Keep backward compat */
export const handleCsvImport = handleFileImport;

function parseCsvFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
}

function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
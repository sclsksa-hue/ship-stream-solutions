import * as XLSX from "xlsx";

function downloadTemplate(headers: string[], sheetName: string, filename: string, sampleRows?: string[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...(sampleRows || [])]);
  // Set column widths
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function downloadCustomersTemplate() {
  downloadTemplate(
    ["Company Name", "Contact Person", "Phone", "Email", "Country", "City", "Industry", "Category", "Notes"],
    "Customers",
    "customers_template.xlsx",
    [["Acme Trading Co.", "John Smith", "+966501234567", "john@acme.com", "Saudi Arabia", "Riyadh", "Trading", "regular", "Key account"]]
  );
}

export function downloadLeadsTemplate() {
  downloadTemplate(
    ["Company Name", "Contact Name", "Email", "Phone", "Country", "Source", "Notes"],
    "Leads",
    "leads_template.xlsx",
    [["Gulf Imports LLC", "Ahmed Ali", "ahmed@gulf.com", "+971501234567", "UAE", "referral", "Met at exhibition"]]
  );
}

export function downloadShipmentsTemplate() {
  downloadTemplate(
    ["Customer Name", "Mode", "Origin", "Destination", "Carrier", "ETD", "ETA", "Total Cost", "Total Revenue", "Notes"],
    "Shipments",
    "shipments_template.xlsx",
    [["Acme Trading Co.", "fcl", "Shanghai", "Jeddah", "MSC", "2026-04-01", "2026-04-25", "5000", "7500", ""]]
  );
}

export function downloadQuotationsTemplate() {
  downloadTemplate(
    ["Customer Name", "Origin", "Destination", "Shipment Type", "Carrier Cost", "Selling Price", "Currency", "Valid Until", "Notes"],
    "Quotations",
    "quotations_template.xlsx",
    [["Acme Trading Co.", "Shanghai", "Jeddah", "fcl", "5000", "7500", "USD", "2026-04-30", ""]]
  );
}

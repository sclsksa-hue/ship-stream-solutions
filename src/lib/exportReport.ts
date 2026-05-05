import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToExcel(filename: string, sheets: { name: string; rows: any[] }[]) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ "لا توجد بيانات": "" }]);
    XLSX.utils.book_append_sheet(wb, ws, s.name.substring(0, 30));
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(filename: string, title: string, tables: { name: string; columns: string[]; rows: (string | number)[][] }[]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  let startY = 22;
  tables.forEach((t) => {
    doc.setFontSize(11);
    doc.text(t.name, 14, startY);
    autoTable(doc, {
      startY: startY + 4,
      head: [t.columns],
      body: t.rows.length ? t.rows : [["No data"]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    startY = (doc as any).lastAutoTable.finalY + 10;
    if (startY > 260) { doc.addPage(); startY = 20; }
  });
  doc.save(`${filename}.pdf`);
}

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  background: #ffffff;
  color: #1a1a2e;
`;

const headerStyle = `
  background: #1a1a2e;
  color: #ffffff;
  padding: 24px;
  border-radius: 8px 8px 0 0;
  text-align: center;
`;

const bodyStyle = `
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 8px 8px;
`;

const buttonStyle = `
  display: inline-block;
  background: #3b82f6;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  margin-top: 16px;
`;

const footerStyle = `
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

export function generateQuotationEmail(params: {
  quoteNumber: string;
  customerName: string;
  origin?: string;
  destination?: string;
  totalAmount?: number;
  currency?: string;
  validUntil?: string;
}) {
  const { quoteNumber, customerName, origin, destination, totalAmount, currency, validUntil } = params;
  return `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <h1 style="margin:0;font-size:20px;">Quotation ${quoteNumber}</h1>
      </div>
      <div style="${bodyStyle}">
        <p>Dear ${customerName},</p>
        <p>Please find your quotation details below:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          ${origin ? `<tr><td style="padding:8px 0;color:#6b7280;">Origin</td><td style="padding:8px 0;font-weight:600;">${origin}</td></tr>` : ""}
          ${destination ? `<tr><td style="padding:8px 0;color:#6b7280;">Destination</td><td style="padding:8px 0;font-weight:600;">${destination}</td></tr>` : ""}
          ${totalAmount ? `<tr><td style="padding:8px 0;color:#6b7280;">Total Amount</td><td style="padding:8px 0;font-weight:600;">${currency || "USD"} ${totalAmount.toLocaleString()}</td></tr>` : ""}
          ${validUntil ? `<tr><td style="padding:8px 0;color:#6b7280;">Valid Until</td><td style="padding:8px 0;font-weight:600;">${validUntil}</td></tr>` : ""}
        </table>
        <p>Please don't hesitate to reach out if you have any questions.</p>
        <div style="${footerStyle}">
          <p>This is an automated message from your CRM system.</p>
        </div>
      </div>
    </div>
  `;
}

export function generateShipmentUpdateEmail(params: {
  shipmentNumber: string;
  customerName: string;
  status: string;
  origin?: string;
  destination?: string;
  eta?: string;
}) {
  const { shipmentNumber, customerName, status, origin, destination, eta } = params;
  const statusColor = status === "delivered" ? "#10b981" : status === "cancelled" ? "#ef4444" : "#f59e0b";
  return `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <h1 style="margin:0;font-size:20px;">Shipment Update: ${shipmentNumber}</h1>
      </div>
      <div style="${bodyStyle}">
        <p>Dear ${customerName},</p>
        <p>Your shipment status has been updated:</p>
        <div style="text-align:center;margin:20px 0;">
          <span style="background:${statusColor};color:#fff;padding:8px 20px;border-radius:20px;font-weight:600;text-transform:uppercase;font-size:14px;">${status.replace(/_/g, " ")}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          ${origin ? `<tr><td style="padding:8px 0;color:#6b7280;">Origin</td><td style="padding:8px 0;font-weight:600;">${origin}</td></tr>` : ""}
          ${destination ? `<tr><td style="padding:8px 0;color:#6b7280;">Destination</td><td style="padding:8px 0;font-weight:600;">${destination}</td></tr>` : ""}
          ${eta ? `<tr><td style="padding:8px 0;color:#6b7280;">ETA</td><td style="padding:8px 0;font-weight:600;">${eta}</td></tr>` : ""}
        </table>
        <div style="${footerStyle}">
          <p>This is an automated message from your CRM system.</p>
        </div>
      </div>
    </div>
  `;
}

export function generateTaskReminderEmail(params: {
  taskDescription: string;
  assigneeName: string;
  dueDate?: string;
  priority?: string;
}) {
  const { taskDescription, assigneeName, dueDate, priority } = params;
  const priorityColor = priority === "high" ? "#ef4444" : priority === "normal" ? "#f59e0b" : "#6b7280";
  return `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <h1 style="margin:0;font-size:20px;">Task Reminder</h1>
      </div>
      <div style="${bodyStyle}">
        <p>Hi ${assigneeName},</p>
        <p>You have a task that needs your attention:</p>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid ${priorityColor};">
          <p style="margin:0;font-weight:600;">${taskDescription}</p>
          ${dueDate ? `<p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Due: ${dueDate}</p>` : ""}
        </div>
        <div style="${footerStyle}">
          <p>This is an automated message from your CRM system.</p>
        </div>
      </div>
    </div>
  `;
}

export function generateInternalAlertEmail(params: {
  title: string;
  message: string;
  severity?: "info" | "warning" | "critical";
}) {
  const { title, message, severity = "info" } = params;
  const colors = { info: "#3b82f6", warning: "#f59e0b", critical: "#ef4444" };
  const color = colors[severity];
  return `
    <div style="${baseStyle}">
      <div style="background:${color};color:#ffffff;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:20px;">${title}</h1>
      </div>
      <div style="${bodyStyle}">
        <p>${message}</p>
        <div style="${footerStyle}">
          <p>Internal CRM Alert — ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  `;
}

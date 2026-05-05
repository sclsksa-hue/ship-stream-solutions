// Central RBAC permission map for SCLS CRM
export type AppRole =
  | "admin" | "manager" | "sales" | "operations" | "accountant" | "viewer" | "customer"
  | "super_admin" | "sales_manager" | "sales_agent" | "marketing" | "finance";
export type Action = "view" | "create" | "update" | "delete" | "approve" | "upload" | "export";
export type Resource =
  | "leads" | "customers" | "contacts" | "opportunities" | "quotations"
  | "shipments" | "customs" | "warehouses" | "containers"
  | "tasks" | "activities" | "documents"
  | "users" | "settings" | "integrations" | "reports" | "audit_logs";

type Matrix = Record<AppRole, Partial<Record<Resource, Action[]>>>;

const ALL: Action[] = ["view", "create", "update", "delete", "approve", "upload", "export"];

export const PERMISSIONS: Matrix = {
  admin: {
    leads: ALL, customers: ALL, contacts: ALL, opportunities: ALL, quotations: ALL,
    shipments: ALL, customs: ALL, warehouses: ALL, containers: ALL,
    tasks: ALL, activities: ALL, documents: ALL,
    users: ALL, settings: ALL, integrations: ALL, reports: ALL, audit_logs: ["view", "export"],
  },
  manager: {
    leads: ["view", "update", "approve"],
    customers: ["view", "update"],
    contacts: ["view", "update"],
    opportunities: ["view", "update", "approve"],
    quotations: ["view", "update", "approve"],
    shipments: ["view"],
    tasks: ["view", "update"],
    activities: ["view"],
    documents: ["view", "upload"],
    reports: ["view", "export"],
    users: ["view"],
  },
  sales: {
    leads: ["view", "create", "update"],
    customers: ["view", "create", "update"],
    contacts: ["view", "create", "update"],
    opportunities: ["view", "create", "update"],
    quotations: ["view", "create", "update", "upload"],
    shipments: ["view"],
    tasks: ["view", "create", "update"],
    activities: ["view", "create", "update"],
    documents: ["view", "upload"],
  },
  operations: {
    contacts: ["view", "create", "update"],
    shipments: ["view", "create", "update", "upload"],
    customs: ["view", "create", "update"],
    warehouses: ["view", "create", "update"],
    containers: ["view", "create", "update"],
    tasks: ["view", "create", "update"],
    activities: ["view", "create", "update"],
    documents: ["view", "upload"],
  },
  accountant: {
    leads: ["view"], customers: ["view"], contacts: ["view"],
    opportunities: ["view"], quotations: ["view", "export"],
    shipments: ["view", "export"], customs: ["view"], warehouses: ["view"],
    reports: ["view", "export"],
  },
  viewer: {
    leads: ["view"], customers: ["view"], contacts: ["view"],
    opportunities: ["view"], quotations: ["view"], shipments: ["view"],
    warehouses: ["view"], containers: ["view"], tasks: ["view"], activities: ["view"],
  },
  customer: {
    quotations: ["view"], shipments: ["view"], documents: ["view"],
  },
  super_admin: {
    leads: ALL, customers: ALL, contacts: ALL, opportunities: ALL, quotations: ALL,
    shipments: ALL, customs: ALL, warehouses: ALL, containers: ALL,
    tasks: ALL, activities: ALL, documents: ALL,
    users: ALL, settings: ALL, integrations: ALL, reports: ALL, audit_logs: ALL,
  },
  sales_manager: {
    leads: ALL, customers: ALL, contacts: ALL, opportunities: ALL, quotations: ALL,
    tasks: ALL, activities: ALL, documents: ["view", "upload"], reports: ["view", "export"],
  },
  sales_agent: {
    leads: ["view", "create", "update"],
    customers: ["view", "create", "update"],
    contacts: ["view", "create", "update"],
    opportunities: ["view", "create", "update"],
    quotations: ["view", "create", "update", "upload"],
    tasks: ["view", "create", "update"],
    activities: ["view", "create", "update"],
    documents: ["view", "upload"],
  },
  marketing: {
    leads: ["view", "create", "update"],
    customers: ["view"],
    contacts: ["view"],
    activities: ["view", "create", "update"],
    documents: ["view", "upload"],
  },
  finance: {
    quotations: ["view", "update", "export"],
    reports: ["view", "export"],
  },
};

export function can(role: AppRole | null, action: Action, resource: Resource): boolean {
  if (!role) return false;
  const actions = PERMISSIONS[role]?.[resource];
  return !!actions?.includes(action);
}

// Sensitive fields hidden per role
const FINANCIAL_FIELDS = ["carrier_cost", "margin", "profit", "total_cost", "total_amount", "selling_price", "estimated_value", "total_revenue"];
const HIDDEN_FIELDS: Partial<Record<AppRole, string[]>> = {
  sales: ["carrier_cost", "margin", "profit", "total_cost"],
  viewer: [...FINANCIAL_FIELDS],
  customer: ["carrier_cost", "margin", "profit", "total_cost", "notes"],
  operations: [...FINANCIAL_FIELDS],
  marketing: [...FINANCIAL_FIELDS],
};

export function canSeeField(role: AppRole | null, field: string): boolean {
  if (!role) return false;
  return !HIDDEN_FIELDS[role]?.includes(field);
}

// Page access map
export const PAGE_ACCESS: Record<string, AppRole[]> = {
  "/": ["admin", "super_admin", "manager", "sales_manager", "sales_agent", "sales", "operations", "accountant", "finance", "marketing", "viewer"],
  "/leads": ["admin", "super_admin", "sales_manager", "sales_agent", "marketing"],
  "/customers": ["admin", "super_admin", "manager", "sales_manager", "sales_agent", "sales", "operations", "marketing", "accountant"],
  "/contacts": ["admin", "super_admin", "manager", "sales_manager", "sales_agent", "sales", "operations", "marketing"],
  "/opportunities": ["admin", "super_admin", "sales_manager", "sales_agent"],
  "/quotations": ["admin", "super_admin", "sales_manager", "sales_agent", "finance"],
  "/activities": ["admin", "super_admin", "manager", "sales_manager", "sales_agent", "sales", "operations", "marketing"],
  "/tasks": ["admin", "super_admin", "manager", "sales_manager", "sales_agent", "sales", "operations"],
  "/requests": ["admin", "super_admin", "sales_manager", "sales_agent", "operations"],
  "/employees": ["admin", "super_admin", "manager", "sales_manager", "sales_agent", "sales", "operations", "accountant", "finance", "marketing", "viewer"],
  "/users": ["admin", "super_admin"],
  "/integrations": ["super_admin"],
  "/audit-logs": ["super_admin"],
};

export function canAccessPage(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = PAGE_ACCESS[path];
  if (!allowed) return true;
  return allowed.includes(role);
}

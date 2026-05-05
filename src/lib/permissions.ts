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
};

export function can(role: AppRole | null, action: Action, resource: Resource): boolean {
  if (!role) return false;
  const actions = PERMISSIONS[role]?.[resource];
  return !!actions?.includes(action);
}

// Sensitive fields hidden per role
const HIDDEN_FIELDS: Partial<Record<AppRole, string[]>> = {
  sales: ["carrier_cost", "margin", "profit", "total_cost"],
  viewer: ["carrier_cost", "margin", "profit", "total_cost", "selling_price"],
  customer: ["carrier_cost", "margin", "profit", "total_cost", "notes"],
  operations: ["margin", "profit"],
};

export function canSeeField(role: AppRole | null, field: string): boolean {
  if (!role) return false;
  return !HIDDEN_FIELDS[role]?.includes(field);
}

// Page access map
export const PAGE_ACCESS: Record<string, AppRole[]> = {
  "/": ["admin", "manager", "sales", "operations", "accountant", "viewer"],
  "/leads": ["admin", "manager", "sales"],
  "/customers": ["admin", "manager", "sales", "operations", "accountant"],
  "/contacts": ["admin", "manager", "sales", "operations"],
  "/opportunities": ["admin", "manager", "sales", "accountant"],
  "/quotations": ["admin", "manager", "sales", "accountant"],
  "/activities": ["admin", "manager", "sales", "operations"],
  "/tasks": ["admin", "manager", "sales", "operations"],
  "/employees": ["admin", "manager", "sales", "operations", "accountant", "viewer"],
  "/users": ["admin"],
  "/integrations": ["admin"],
  "/audit-logs": ["admin"],
};

export function canAccessPage(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = PAGE_ACCESS[path];
  if (!allowed) return true;
  return allowed.includes(role);
}

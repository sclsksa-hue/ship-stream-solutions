import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listLeads from "./tools/list-leads";
import createLead from "./tools/create-lead";
import listCustomers from "./tools/list-customers";
import listOpportunities from "./tools/list-opportunities";
import listQuotations from "./tools/list-quotations";
import listTasks from "./tools/list-tasks";
import createTask from "./tools/create-task";
import listClientRequests from "./tools/list-client-requests";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "scls-crm-mcp",
  title: "SCLS CRM",
  version: "0.1.0",
  instructions:
    "Tools for the SCLS logistics CRM. Read and create leads, customers, opportunities, quotations, tasks, and client requests. All calls are executed as the signed-in user and honor row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoami,
    listLeads,
    createLead,
    listCustomers,
    listOpportunities,
    listQuotations,
    listTasks,
    createTask,
    listClientRequests,
  ],
});

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RequireAuth } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Customers from "./pages/Customers";
import Contacts from "./pages/Contacts";
import Opportunities from "./pages/Opportunities";
import Quotations from "./pages/Quotations";
import Activities from "./pages/Activities";
import Tasks from "./pages/Tasks";
import ClientRequests from "./pages/ClientRequests";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import CustomerPortal from "./pages/CustomerPortal";
import UserManagement from "./pages/UserManagement";
import EmployeeDirectory from "./pages/EmployeeDirectory";
import Integrations from "./pages/Integrations";
import AuditLogs from "./pages/AuditLogs";
import SecuritySettings from "./pages/SecuritySettings";
import RequireRole from "./components/RequireRole";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/portal" element={<CustomerPortal />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/employees" element={<RequireAuth><EmployeeDirectory /></RequireAuth>} />
            

            {/* CRM */}
            <Route path="/leads" element={<RequireAuth><RequireRole roles={["admin","super_admin","sales_manager","sales_agent","marketing"]}><Leads /></RequireRole></RequireAuth>} />
            <Route path="/customers" element={<RequireAuth><RequireRole roles={["admin","super_admin","manager","sales_manager","sales_agent","sales","operations","marketing","accountant"]}><Customers /></RequireRole></RequireAuth>} />
            <Route path="/contacts" element={<RequireAuth><Contacts /></RequireAuth>} />
            <Route path="/opportunities" element={<RequireAuth><RequireRole roles={["admin","super_admin","sales_manager","sales_agent"]}><Opportunities /></RequireRole></RequireAuth>} />
            <Route path="/quotations" element={<RequireAuth><RequireRole roles={["admin","super_admin","sales_manager","sales_agent","finance"]}><Quotations /></RequireRole></RequireAuth>} />
            <Route path="/activities" element={<RequireAuth><Activities /></RequireAuth>} />
            <Route path="/tasks" element={<RequireAuth><Tasks /></RequireAuth>} />
            <Route path="/requests" element={<RequireAuth><ClientRequests /></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth><RequireRole roles={["admin","super_admin","sales_manager","sales_agent","sales","finance","accountant","marketing"]}><Reports /></RequireRole></RequireAuth>} />
            <Route path="/integrations" element={<RequireAuth><RequireRole roles={["super_admin"]}><Integrations /></RequireRole></RequireAuth>} />
            <Route path="/audit-logs" element={<RequireAuth><RequireRole roles={["super_admin"]}><AuditLogs /></RequireRole></RequireAuth>} />
            <Route path="/users" element={<RequireAuth><RequireRole roles={["admin","super_admin"]}><UserManagement /></RequireRole></RequireAuth>} />
            <Route path="/settings/security" element={<RequireAuth><SecuritySettings /></RequireAuth>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;

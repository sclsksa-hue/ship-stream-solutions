import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RequireAuth } from "@/lib/auth";
import RoleGuard from "@/components/RoleGuard";
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
import Shipments from "./pages/Shipments";
import Documents from "./pages/Documents";
import Agents from "./pages/Agents";
import Analytics from "./pages/Analytics";
import CustomsClearance from "./pages/CustomsClearance";
import Warehousing from "./pages/Warehousing";
import NotFound from "./pages/NotFound";
import CustomerPortal from "./pages/CustomerPortal";
import UserManagement from "./pages/UserManagement";
import EmployeeDirectory from "./pages/EmployeeDirectory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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

            {/* All authenticated users */}
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/employees" element={<RequireAuth><EmployeeDirectory /></RequireAuth>} />

            {/* CRM - Admin & Sales */}
            <Route path="/leads" element={<RequireAuth><RoleGuard allowedRoles={["admin", "sales"]}><Leads /></RoleGuard></RequireAuth>} />
            <Route path="/customers" element={<RequireAuth><RoleGuard allowedRoles={["admin", "sales"]}><Customers /></RoleGuard></RequireAuth>} />
            <Route path="/contacts" element={<RequireAuth><RoleGuard allowedRoles={["admin", "sales"]}><Contacts /></RoleGuard></RequireAuth>} />
            <Route path="/opportunities" element={<RequireAuth><RoleGuard allowedRoles={["admin", "sales"]}><Opportunities /></RoleGuard></RequireAuth>} />
            <Route path="/quotations" element={<RequireAuth><RoleGuard allowedRoles={["admin", "sales"]}><Quotations /></RoleGuard></RequireAuth>} />
            <Route path="/activities" element={<RequireAuth><RoleGuard allowedRoles={["admin", "sales", "operations"]}><Activities /></RoleGuard></RequireAuth>} />
            <Route path="/tasks" element={<RequireAuth><RoleGuard allowedRoles={["admin", "sales", "operations"]}><Tasks /></RoleGuard></RequireAuth>} />

            {/* TMS - Admin & Operations */}
            <Route path="/shipments" element={<RequireAuth><RoleGuard allowedRoles={["admin", "operations"]}><Shipments /></RoleGuard></RequireAuth>} />
            <Route path="/documents" element={<RequireAuth><RoleGuard allowedRoles={["admin", "operations"]}><Documents /></RoleGuard></RequireAuth>} />
            <Route path="/agents" element={<RequireAuth><RoleGuard allowedRoles={["admin", "operations"]}><Agents /></RoleGuard></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth><RoleGuard allowedRoles={["admin", "operations"]}><Analytics /></RoleGuard></RequireAuth>} />
            <Route path="/customs" element={<RequireAuth><RoleGuard allowedRoles={["admin", "operations"]}><CustomsClearance /></RoleGuard></RequireAuth>} />
            <Route path="/warehousing" element={<RequireAuth><RoleGuard allowedRoles={["admin", "operations"]}><Warehousing /></RoleGuard></RequireAuth>} />

            {/* Admin only */}
            <Route path="/users" element={<RequireAuth><UserManagement /></RequireAuth>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

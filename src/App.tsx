import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RequireAuth } from "@/lib/auth";
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

            {/* All authenticated users can access all pages */}
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/employees" element={<RequireAuth><EmployeeDirectory /></RequireAuth>} />
            <Route path="/users" element={<RequireAuth><UserManagement /></RequireAuth>} />

            {/* CRM */}
            <Route path="/leads" element={<RequireAuth><Leads /></RequireAuth>} />
            <Route path="/customers" element={<RequireAuth><Customers /></RequireAuth>} />
            <Route path="/contacts" element={<RequireAuth><Contacts /></RequireAuth>} />
            <Route path="/opportunities" element={<RequireAuth><Opportunities /></RequireAuth>} />
            <Route path="/quotations" element={<RequireAuth><Quotations /></RequireAuth>} />
            <Route path="/activities" element={<RequireAuth><Activities /></RequireAuth>} />
            <Route path="/tasks" element={<RequireAuth><Tasks /></RequireAuth>} />

            {/* TMS */}
            <Route path="/shipments" element={<RequireAuth><Shipments /></RequireAuth>} />
            <Route path="/documents" element={<RequireAuth><Documents /></RequireAuth>} />
            <Route path="/agents" element={<RequireAuth><Agents /></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
            <Route path="/customs" element={<RequireAuth><CustomsClearance /></RequireAuth>} />
            <Route path="/warehousing" element={<RequireAuth><Warehousing /></RequireAuth>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

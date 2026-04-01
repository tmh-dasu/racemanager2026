import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import PickTeam from "./pages/PickTeam";
import MyTeam from "./pages/MyTeam";
import Leaderboard from "./pages/Leaderboard";
import Results from "./pages/Results";
import Admin from "./pages/Admin";
import Rules from "./pages/Rules";
import Payment from "./pages/Payment";
import Auth from "./pages/Auth";
import TeamPublic from "./pages/TeamPublic";
import Predictions from "./pages/Predictions";
import DriverProfile from "./pages/DriverProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/betal" element={<Payment />} />
            <Route path="/vaelg-hold" element={<PickTeam />} />
            <Route path="/mit-hold" element={<MyTeam />} />
            <Route path="/rangering" element={<Leaderboard />} />
            <Route path="/resultater" element={<Results />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/regler" element={<Rules />} />
            <Route path="/hold/:slug" element={<TeamPublic />} />
            <Route path="/koerer/:slug" element={<DriverProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

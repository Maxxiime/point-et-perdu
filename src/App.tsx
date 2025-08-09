import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Historique from "./pages/Historique";
import Statistiques from "./pages/Statistiques";
import Admin from "./pages/Admin";
import PartieDetail from "./pages/PartieDetail";
import NotFound from "./pages/NotFound";
import Regles from "./pages/Regles";
import { DataProvider } from "@/store/DataContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HelmetProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/historique" element={<Historique />} />
                <Route path="/stats" element={<Statistiques />} />
                <Route path="/regles" element={<Regles />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/partie/:id" element={<PartieDetail />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </HelmetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

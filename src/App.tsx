import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { TreeProvider } from "./hooks/useTree";
import { AppShell } from "./components/AppShell";
import { Seo } from "./components/Seo";
import { recordAccess } from "./lib/superadmin";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import TreeView from "./pages/TreeView";
import People from "./pages/People";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import Ajuda from "./pages/Ajuda";
import Novidades from "./pages/Novidades";
import Shared from "./pages/Shared";
import Convite from "./pages/Convite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RequireAuth() {
  const { user, isLoading } = useAuth();

  // Registra o acesso uma vez por sessão (o servidor ainda faz throttle de 15 min).
  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem("genea_access_logged")) return;
    sessionStorage.setItem("genea_access_logged", "1");
    recordAccess(window.location.pathname);
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <TreeProvider>
      {/* Áreas privadas: nunca indexar */}
      <Seo title="Painel · Árvore Genealógica Flive" noindex />
      <AppShell>
        <Outlet />
      </AppShell>
    </TreeProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/compartilhar/:token" element={<Shared />} />
              <Route path="/convite/:token" element={<Convite />} />
              <Route element={<RequireAuth />}>
                <Route path="/arvore" element={<TreeView />} />
                <Route path="/pessoas" element={<People />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/superadmin" element={<SuperAdmin />} />
                <Route path="/ajuda" element={<Ajuda />} />
                <Route path="/novidades" element={<Novidades />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

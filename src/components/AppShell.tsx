import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Network,
  Users,
  LayoutDashboard,
  Shield,
  LogOut,
  ChevronDown,
  Plus,
  HelpCircle,
} from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTree } from "@/hooks/useTree";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/arvore", label: "Árvore", icon: Network },
  { to: "/pessoas", label: "Pessoas", icon: Users },
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/ajuda", label: "Ajuda", icon: HelpCircle },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { trees, activeTree, setActiveTree, isAdmin, createNewTree } = useTree();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNewTree = async () => {
    const name = window.prompt("Nome da nova árvore (ex.: Família Silva):");
    if (name?.trim()) {
      await createNewTree(name.trim());
      navigate("/arvore");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center gap-3 px-4">
          <Link to="/arvore" className="shrink-0">
            <Logo />
          </Link>

          {/* Seletor de árvore */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-1 max-w-[200px]">
                <span className="truncate">{activeTree?.name ?? "Selecionar árvore"}</span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Minhas árvores</DropdownMenuLabel>
              {trees.map((t) => (
                <DropdownMenuItem key={t.id} onClick={() => setActiveTree(t.id)}>
                  {t.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleNewTree}>
                <Plus className="mr-2 h-4 w-4" /> Nova árvore
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <nav className="ml-auto hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}>
                  <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <Icon className="h-4 w-4" /> {item.label}
                  </Button>
                </Link>
              );
            })}
            {isAdmin && (
              <Link to="/admin">
                <Button
                  variant={location.pathname === "/admin" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" /> Admin
                </Button>
              </Link>
            )}
          </nav>

          <div className="ml-auto md:ml-2 flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="max-w-[160px]">
                  <span className="truncate">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Nav mobile */}
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}>
                <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <Icon className="h-4 w-4" /> {item.label}
                </Button>
              </Link>
            );
          })}
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-2">
                <Shield className="h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
        </nav>
      </header>

      <main className={cn("flex-1 w-full")}>{children}</main>
    </div>
  );
}

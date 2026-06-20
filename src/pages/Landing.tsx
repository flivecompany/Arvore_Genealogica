import { Link } from "react-router-dom";
import {
  Network,
  Search,
  Share2,
  ShieldCheck,
  Images,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES = [
  { icon: Network, title: "Organograma interativo", desc: "Visualize pais, filhos, cônjuges e irmãos com zoom, navegação e expansão de ramos." },
  { icon: Search, title: "Busca inteligente", desc: "Encontre parentes por nome, cidade, ano ou grau de parentesco." },
  { icon: Images, title: "Fotos e documentos", desc: "Galeria por pessoa, biografia e anexos históricos preservados com segurança." },
  { icon: Clock, title: "Linha do tempo", desc: "Acompanhe gerações, nascimentos e a história da família ao longo do tempo." },
  { icon: Share2, title: "Compartilhe com segurança", desc: "Links de somente leitura e exportação em PDF e imagem de alta resolução." },
  { icon: ShieldCheck, title: "Privado e seguro", desc: "Autenticação, permissões por papel, criptografia e log de auditoria." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="container flex items-center justify-between py-4 px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/auth"><Button variant="ghost">Entrar</Button></Link>
          <Link to="/auth"><Button>Começar</Button></Link>
        </div>
      </header>

      <section className="container px-4 py-16 sm:py-24 text-center">
        <span className="inline-block rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold mb-4">
          Módulo do ecossistema Controle Flive
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto">
          A história da sua família,{" "}
          <span className="bg-gradient-flive bg-clip-text text-transparent">organizada e viva</span>
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          Cadastre membros, visualize a árvore em um organograma elegante com fotos
          e conexões claras, e preserve memórias com segurança.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Criar minha árvore <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="container px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="p-6 hover:shadow-card transition-shadow">
              <div className="h-11 w-11 rounded-lg bg-gradient-flive grid place-items-center mb-4">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          );
        })}
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Flive Company · Árvore Genealógica
      </footer>
    </div>
  );
}

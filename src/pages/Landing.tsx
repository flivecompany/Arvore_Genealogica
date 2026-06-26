import { Link } from "react-router-dom";
import {
  Network,
  Search,
  Share2,
  ShieldCheck,
  Images,
  Clock,
  ArrowRight,
  UserPlus,
  TreeDeciduous,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Seo, SITE_URL } from "@/components/Seo";

const FEATURES = [
  { icon: Network, title: "Organograma interativo", desc: "Visualize pais, filhos, cônjuges e irmãos com zoom, navegação e expansão de ramos." },
  { icon: Search, title: "Busca inteligente", desc: "Encontre parentes por nome, cidade, ano ou grau de parentesco." },
  { icon: Images, title: "Fotos e documentos", desc: "Galeria por pessoa, biografia e anexos históricos preservados com segurança." },
  { icon: Clock, title: "Linha do tempo", desc: "Acompanhe gerações, nascimentos e a história da família ao longo do tempo." },
  { icon: Share2, title: "Compartilhe com segurança", desc: "Links de somente leitura e exportação em PDF e imagem de alta resolução." },
  { icon: ShieldCheck, title: "Privado e seguro", desc: "Autenticação, permissões por papel, criptografia e log de auditoria." },
];

const STEPS = [
  { icon: UserPlus, title: "1. Crie sua conta grátis", desc: "O cadastro é gratuito e leva menos de um minuto — só precisa de um e-mail." },
  { icon: TreeDeciduous, title: "2. Monte a árvore", desc: "Adicione familiares, fotos e datas. As conexões aparecem no organograma automaticamente." },
  { icon: Share2, title: "3. Compartilhe", desc: "Gere um link de visualização para a família ou exporte em PDF e imagem." },
];

const FAQ = [
  {
    q: "A Árvore Genealógica da Flive é gratuita?",
    a: "Sim. O acesso é gratuito: basta criar uma conta com seu e-mail para começar a montar a árvore genealógica da sua família, sem custo.",
  },
  {
    q: "Preciso instalar algum programa?",
    a: "Não. É 100% online e funciona direto no navegador, tanto no computador quanto no celular.",
  },
  {
    q: "Como compartilho minha árvore genealógica com a família?",
    a: "Você gera um link de visualização (somente leitura) para quem só quer ver, ou um convite de edição para quem vai colaborar. Também é possível exportar em PDF e imagem.",
  },
  {
    q: "Meus dados ficam seguros e privados?",
    a: "Sim. Cada árvore é privada, com autenticação, permissões por papel e controle de quem pode visualizar ou editar as informações.",
  },
  {
    q: "Posso adicionar fotos e documentos das pessoas?",
    a: "Sim. Cada familiar pode ter foto, biografia e anexos, preservando memórias e documentos históricos da família.",
  },
];

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Árvore Genealógica Flive",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/`,
    inLanguage: "pt-BR",
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Seo path="/" jsonLd={JSON_LD} />

      <header className="container flex items-center justify-between py-4 px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/auth"><Button variant="ghost">Entrar</Button></Link>
          <Link to="/auth"><Button>Começar grátis</Button></Link>
        </div>
      </header>

      <section className="container px-4 py-16 sm:py-24 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold mb-4">
          <Check className="h-3.5 w-3.5" /> Grátis · basta criar uma conta
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto">
          A história da sua família,{" "}
          <span className="bg-gradient-flive bg-clip-text text-transparent">organizada e viva</span>
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          Crie sua árvore genealógica online <strong>de graça</strong>: cadastre membros,
          visualize a árvore em um organograma elegante com fotos e conexões claras, e
          preserve memórias com segurança. Sem instalar nada.
        </p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Criar minha árvore grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-xs text-muted-foreground">
            Não tem conta? O cadastro é gratuito e leva menos de 1 minuto.
          </span>
        </div>
      </section>

      {/* Recursos */}
      <section className="container px-4 pb-8" aria-labelledby="recursos-title">
        <h2 id="recursos-title" className="text-2xl sm:text-3xl font-bold text-center mb-8">
          Tudo o que você precisa para montar sua árvore genealógica
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </div>
      </section>

      {/* Como funciona */}
      <section className="container px-4 py-16" aria-labelledby="como-funciona-title">
        <h2 id="como-funciona-title" className="text-2xl sm:text-3xl font-bold text-center mb-3">
          Como funciona
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
          Comece de graça em três passos simples. Não é preciso cartão de crédito nem instalação.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.title} className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-gradient-flive grid place-items-center mx-auto mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Começar agora — é grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="container px-4 py-16 max-w-3xl" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-2xl sm:text-3xl font-bold text-center mb-8">
          Perguntas frequentes
        </h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <Card key={f.q} className="p-5">
              <h3 className="font-semibold mb-1">{f.q}</h3>
              <p className="text-sm text-muted-foreground">{f.a}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Flive Company · Árvore Genealógica
      </footer>
    </div>
  );
}

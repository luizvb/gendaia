import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Scissors,
  Star,
  MessageSquare,
  Bot,
  Smartphone,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight">
              GENDAIA
            </span>
          </Link>
          <nav className="hidden md:flex md:gap-4">
            <Link
              href="#features"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Recursos
            </Link>
            <Link
              href="#ai-agent"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Agente IA
            </Link>
            <Link
              href="#dashboard"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="#pricing"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Preços
            </Link>
            <Link
              href="#testimonials"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Depoimentos
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="outline">Entrar</Button>
          </Link>
          <Link href="/register">
            <Button>Registrar</Button>
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Gerencie seu negócio com facilidade
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Plataforma completa para agendamentos, gestão de clientes e
                    controle financeiro da sua Negócio.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/register">
                    <Button size="lg" className="gap-1">
                      Comece agora
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button size="lg" variant="outline">
                      Saiba mais
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>
                    7 dias de teste grátis! sem compromisso, sem a necessidade
                    cartão de crédito!
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-[350px] w-full overflow-hidden rounded-xl bg-muted">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-medium">
                      Imagem da plataforma
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="w-full bg-muted/50 py-12 md:py-24 lg:py-32"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  Recursos Principais
                </h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Tudo o que você precisa para gerenciar sua Negócio em um só
                  lugar
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3">
              <div className="flex flex-col items-center space-y-2 rounded-lg border bg-background p-6 shadow-sm">
                <Calendar className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Agendamento Online</h3>
                <p className="text-center text-muted-foreground">
                  Permita que seus clientes agendem serviços online, 24 horas
                  por dia, 7 dias por semana.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border bg-background p-6 shadow-sm">
                <Scissors className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Gestão de Serviços</h3>
                <p className="text-center text-muted-foreground">
                  Cadastre e gerencie todos os serviços oferecidos pela sua
                  Negócio.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border bg-background p-6 shadow-sm">
                <Clock className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Controle de Horários</h3>
                <p className="text-center text-muted-foreground">
                  Defina horários de funcionamento e disponibilidade dos
                  profissionais.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="ai-agent" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="flex items-center justify-center">
                <div className="relative h-[450px] w-full overflow-hidden rounded-xl bg-muted">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                      <Bot className="h-8 w-8" />
                    </div>
                    <div className="max-w-md space-y-4 rounded-lg border bg-background p-4 shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-sm">
                            Olá! Sou a Gendaia. Como posso ajudar com seu com
                            seu agendamento hoje?
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 justify-end">
                        <div className="rounded-lg bg-primary p-3">
                          <p className="text-sm text-primary-foreground">
                            Quero agendar um corte de cabelo para amanhã às 14h
                          </p>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                          <Smartphone className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-sm">
                            Perfeito! Verifiquei que temos disponibilidade
                            amanhã às 14h com o profissional João. Confirmo seu
                            agendamento?
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm">
                    <Zap className="mr-1 h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Novo Recurso</span>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                    Agente de IA no WhatsApp
                  </h2>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Ofereça agendamentos inteligentes diretamente pelo WhatsApp
                    com nosso assistente virtual especialista
                  </p>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Atendimento 24/7</h3>
                      <p className="text-muted-foreground">
                        Seus clientes podem agendar a qualquer hora, mesmo
                        quando você está ocupado ou fora do horário comercial
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Inteligência Humana</h3>
                      <p className="text-muted-foreground">
                        Nosso agente de IA entende linguagem natural e responde
                        como um atendente humano, oferecendo uma experiência
                        personalizada
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Integração Automática</h3>
                      <p className="text-muted-foreground">
                        Todos os agendamentos são sincronizados instantaneamente
                        com sua agenda, evitando conflitos de horários
                      </p>
                    </div>
                  </li>
                </ul>
                <div className="flex flex-col gap-2 min-[400px]:flex-row pt-4">
                  <Link href="/register">
                    <Button size="lg" className="gap-1">
                      Ativar Agente IA
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#demo">
                    <Button size="lg" variant="outline">
                      Ver demonstração
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="dashboard"
          className="w-full bg-gradient-to-b from-background to-muted/30 py-12 md:py-24 lg:py-32"
        >
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm">
                    <span className="text-xs font-medium">
                      Dashboard Inteligente
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                    Seu negócio na palma da mão
                  </h2>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Informações completas de faturamento e agendamento baseado
                    nos serviços, tudo em um só lugar.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/register">
                    <Button size="lg" className="gap-1">
                      Experimente agora
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button size="lg" variant="outline">
                      Ver recursos
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-[450px] w-full overflow-hidden rounded-xl border bg-background p-4 shadow-lg">
                  <div className="flex h-full flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Dashboard</h3>
                        <p className="text-sm text-muted-foreground">
                          Visão geral do seu negócio
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          Hoje
                        </div>
                        <div className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                          Semana
                        </div>
                        <div className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                          Mês
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border bg-card p-3">
                        <div className="text-sm text-muted-foreground">
                          Faturamento
                        </div>
                        <div className="mt-1 text-2xl font-bold">R$ 3.450</div>
                        <div className="mt-1 flex items-center text-xs text-green-500">
                          <ArrowRight className="h-3 w-3 rotate-45" />
                          <span>+12% vs ontem</span>
                        </div>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <div className="text-sm text-muted-foreground">
                          Agendamentos
                        </div>
                        <div className="mt-1 text-2xl font-bold">24</div>
                        <div className="mt-1 flex items-center text-xs text-green-500">
                          <ArrowRight className="h-3 w-3 rotate-45" />
                          <span>+5% vs ontem</span>
                        </div>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <div className="text-sm text-muted-foreground">
                          Clientes
                        </div>
                        <div className="mt-1 text-2xl font-bold">18</div>
                        <div className="mt-1 flex items-center text-xs text-green-500">
                          <ArrowRight className="h-3 w-3 rotate-45" />
                          <span>+3 novos</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 rounded-lg border bg-card p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-medium">Desempenho por Serviço</h4>
                        <div className="text-xs text-muted-foreground">
                          Últimos 30 dias
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Corte de Cabelo</span>
                            <span className="font-medium">R$ 1.250</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className="h-2 w-[75%] rounded-full bg-primary"></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Barba</span>
                            <span className="font-medium">R$ 850</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className="h-2 w-[45%] rounded-full bg-primary"></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Coloração</span>
                            <span className="font-medium">R$ 1.350</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className="h-2 w-[85%] rounded-full bg-primary"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-card p-3">
                      <div className="mb-2 text-sm font-medium">
                        Próximos Agendamentos
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/20"></div>
                          <div>
                            <div className="font-medium">Ana Silva</div>
                            <div className="text-xs text-muted-foreground">
                              Corte + Coloração
                            </div>
                          </div>
                        </div>
                        <div className="text-xs">14:30</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  Planos e Preços
                </h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Escolha o plano ideal para o tamanho da sua Negócio
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3">
              <div className="flex flex-col rounded-lg border bg-background p-6 shadow-sm">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Starter</h3>
                  <p className="text-muted-foreground">
                    Para Negócios pequenas
                  </p>
                </div>
                <div className="mt-4 flex items-baseline text-3xl font-bold">
                  R$ 49,90
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    /mês
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Até 2 profissionais</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Agendamento online</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Gerenciamento de clientes</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Relatórios básicos</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Link href="/register">
                    <Button className="w-full">Começar teste grátis</Button>
                  </Link>
                </div>
              </div>
              <div className="relative flex flex-col rounded-lg border border-primary bg-background p-6 shadow-sm">
                <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Popular
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Professional</h3>
                  <p className="text-muted-foreground">
                    Para Negócios em crescimento
                  </p>
                </div>
                <div className="mt-4 flex items-baseline text-3xl font-bold">
                  R$ 99,90
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    /mês
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Até 5 profissionais</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Agendamento online</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Gerenciamento de clientes</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Relatórios avançados</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Lembretes por SMS</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Personalização da agenda</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Link href="/register">
                    <Button className="w-full">Começar teste grátis</Button>
                  </Link>
                </div>
              </div>
              <div className="flex flex-col rounded-lg border bg-background p-6 shadow-sm">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Business</h3>
                  <p className="text-muted-foreground">
                    Para redes de Negócios
                  </p>
                </div>
                <div className="mt-4 flex items-baseline text-3xl font-bold">
                  R$ 199,90
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    /mês
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Profissionais ilimitados</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Múltiplas unidades</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Agendamento online</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Gerenciamento de clientes</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Relatórios avançados</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Lembretes por SMS e Email</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Link href="/register">
                    <Button className="w-full">Começar teste grátis</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="testimonials"
          className="w-full bg-muted/50 py-12 md:py-24 lg:py-32"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  Depoimentos
                </h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  O que nossos clientes dizem sobre a plataforma
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col rounded-lg border bg-background p-6 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className="h-4 w-4 fill-current text-primary"
                      />
                    ))}
                  </div>
                  <blockquote className="mt-4">
                    <p className="text-muted-foreground">
                      "A plataforma transformou a gestão da minha Negócio. Agora
                      consigo controlar tudo em um só lugar e meus clientes
                      adoram a facilidade de agendar online."
                    </p>
                  </blockquote>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div>
                      <p className="font-medium">Carlos Silva</p>
                      <p className="text-sm text-muted-foreground">
                        Negócio Silva
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  Pronto para começar?
                </h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Experimente gratuitamente por 7 dias. Sem compromisso.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/register">
                  <Button size="lg" className="gap-1">
                    Comece agora
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/booking">
                  <Button size="lg" variant="outline">
                    Agendar Horário
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    Já tem uma conta? Entrar
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col items-center justify-center gap-4 px-4 md:px-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Negócio. Todos os direitos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

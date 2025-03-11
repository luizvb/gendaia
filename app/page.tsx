"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
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
import Image from "next/image";
import { ThemeImage } from "./components/theme-image";

// Componente BusinessSelector com animações
function BusinessSelector({ selectedBusiness, onSelect }) {
  const businesses = [
    { id: "medical", name: "Médicos e Dentistas" },
    { id: "salon", name: "Barbearias e Salões" },
    { id: "petshop", name: "Petshops" },
    { id: "vet", name: "Veterinária" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-wrap justify-center gap-3 mb-8"
    >
      {businesses.map((business, index) => (
        <motion.div
          key={business.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Button
            variant={selectedBusiness === business.id ? "default" : "outline"}
            onClick={() => onSelect(business.id)}
            className="min-w-[150px] relative overflow-hidden group"
          >
            <span className="relative z-10">{business.name}</span>
            {selectedBusiness === business.id && (
              <motion.div
                layoutId="selectedBusiness"
                className="absolute inset-0 bg-primary opacity-100"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
}

// Componente de seção animada
function AnimatedSection({ children, id, className }) {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.section>
  );
}

// Componente principal com estado para o tipo de negócio selecionado
export default function Home() {
  const [selectedBusiness, setSelectedBusiness] = useState("medical");
  const [scrollY, setScrollY] = useState(0);
  const { scrollYProgress } = useScroll();

  // Efeito de parallax para elementos
  const heroImageY = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.5]);

  // Atualizar posição de scroll para efeitos
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Conteúdo específico para cada tipo de negócio
  const businessContent = {
    medical: {
      title: "Gerencie sua clínica com facilidade",
      description:
        "Plataforma completa para agendamentos, gestão de pacientes e controle financeiro da sua Clínica.",
      features: [
        {
          icon: Calendar,
          title: "Agendamento Online",
          description:
            "Permita que seus pacientes agendem consultas online, 24 horas por dia, 7 dias por semana.",
        },
        {
          icon: Scissors,
          title: "Gestão de Procedimentos",
          description:
            "Cadastre e gerencie todos os procedimentos oferecidos pela sua Clínica.",
        },
        {
          icon: Clock,
          title: "Controle de Horários",
          description:
            "Defina horários de atendimento e disponibilidade dos profissionais.",
        },
      ],
      aiAgentTitle: "Assistente Virtual para Clínicas",
      aiAgentDescription:
        "Ofereça agendamentos inteligentes diretamente pelo WhatsApp com nosso assistente virtual especialista em saúde",
      dashboardTitle: "Sua clínica na palma da mão",
      dashboardDescription:
        "Informações completas de faturamento e agendamento baseado nos procedimentos, tudo em um só lugar.",
      serviceMetrics: [
        { name: "Consultas", value: "R$ 1.250", percentage: "75%" },
        { name: "Exames", value: "R$ 850", percentage: "45%" },
        { name: "Procedimentos", value: "R$ 1.350", percentage: "85%" },
      ],
      plans: [
        {
          title: "Starter",
          price: "R$ 49,90",
          description: "Para clínicas pequenas",
          features: [
            "Até 2 profissionais",
            "Agendamento online",
            "Gerenciamento de pacientes",
            "Relatórios básicos",
          ],
        },
        {
          title: "Professional",
          price: "R$ 99,90",
          description: "Para clínicas em crescimento",
          features: [
            "Até 5 profissionais",
            "Agendamento online",
            "Gerenciamento de pacientes",
            "Relatórios avançados",
            "Lembretes por SMS",
            "Personalização da agenda",
          ],
        },
        {
          title: "Business",
          price: "R$ 199,90",
          description: "Para redes de clínicas",
          features: [
            "Profissionais ilimitados",
            "Múltiplas unidades",
            "Agendamento online",
            "Gerenciamento de pacientes",
            "Relatórios avançados",
            "Lembretes por SMS e Email",
          ],
        },
      ],
    },
    salon: {
      title: "Gerencie seu salão com facilidade",
      description:
        "Plataforma completa para agendamentos, gestão de clientes e controle financeiro do seu Salão ou Barbearia.",
      features: [
        {
          icon: Calendar,
          title: "Agendamento Online",
          description:
            "Permita que seus clientes agendem serviços online, 24 horas por dia, 7 dias por semana.",
        },
        {
          icon: Scissors,
          title: "Gestão de Serviços",
          description:
            "Cadastre e gerencie todos os serviços oferecidos pelo seu Salão.",
        },
        {
          icon: Clock,
          title: "Controle de Horários",
          description:
            "Defina horários de funcionamento e disponibilidade dos profissionais.",
        },
      ],
      aiAgentTitle: "Assistente Virtual para Salões",
      aiAgentDescription:
        "Ofereça agendamentos inteligentes diretamente pelo WhatsApp com nosso assistente virtual especialista em beleza",
      dashboardTitle: "Seu salão na palma da mão",
      dashboardDescription:
        "Informações completas de faturamento e agendamento baseado nos serviços, tudo em um só lugar.",
      serviceMetrics: [
        { name: "Corte de Cabelo", value: "R$ 1.250", percentage: "75%" },
        { name: "Barba", value: "R$ 850", percentage: "45%" },
        { name: "Coloração", value: "R$ 1.350", percentage: "85%" },
      ],
      plans: [
        {
          title: "Starter",
          price: "R$ 49,90",
          description: "Para salões pequenos",
          features: [
            "Até 2 profissionais",
            "Agendamento online",
            "Gerenciamento de clientes",
            "Relatórios básicos",
          ],
        },
        {
          title: "Professional",
          price: "R$ 99,90",
          description: "Para salões em crescimento",
          features: [
            "Até 5 profissionais",
            "Agendamento online",
            "Gerenciamento de clientes",
            "Relatórios avançados",
            "Lembretes por SMS",
            "Personalização da agenda",
          ],
        },
        {
          title: "Business",
          price: "R$ 199,90",
          description: "Para redes de salões",
          features: [
            "Profissionais ilimitados",
            "Múltiplas unidades",
            "Agendamento online",
            "Gerenciamento de clientes",
            "Relatórios avançados",
            "Lembretes por SMS e Email",
          ],
        },
      ],
    },
    petshop: {
      title: "Gerencie seu petshop com facilidade",
      description:
        "Plataforma completa para agendamentos, gestão de clientes e controle financeiro do seu Petshop.",
      features: [
        {
          icon: Calendar,
          title: "Agendamento Online",
          description:
            "Permita que seus clientes agendem serviços para seus pets online, 24 horas por dia, 7 dias por semana.",
        },
        {
          icon: Scissors,
          title: "Gestão de Serviços",
          description:
            "Cadastre e gerencie todos os serviços oferecidos pelo seu Petshop.",
        },
        {
          icon: Clock,
          title: "Controle de Horários",
          description:
            "Defina horários de funcionamento e disponibilidade dos profissionais.",
        },
      ],
      aiAgentTitle: "Assistente Virtual para Petshops",
      aiAgentDescription:
        "Ofereça agendamentos inteligentes diretamente pelo WhatsApp com nosso assistente virtual especialista em pets",
      dashboardTitle: "Seu petshop na palma da mão",
      dashboardDescription:
        "Informações completas de faturamento e agendamento baseado nos serviços, tudo em um só lugar.",
      serviceMetrics: [
        { name: "Banho", value: "R$ 1.250", percentage: "75%" },
        { name: "Tosa", value: "R$ 850", percentage: "45%" },
        { name: "Banho e Tosa", value: "R$ 1.350", percentage: "85%" },
      ],
      plans: [
        {
          title: "Starter",
          price: "R$ 49,90",
          description: "Para petshops pequenos",
          features: [
            "Até 2 profissionais",
            "Agendamento online",
            "Gerenciamento de clientes",
            "Relatórios básicos",
          ],
        },
        {
          title: "Professional",
          price: "R$ 99,90",
          description: "Para petshops em crescimento",
          features: [
            "Até 5 profissionais",
            "Agendamento online",
            "Gerenciamento de clientes",
            "Relatórios avançados",
            "Lembretes por SMS",
            "Personalização da agenda",
          ],
        },
        {
          title: "Business",
          price: "R$ 199,90",
          description: "Para redes de petshops",
          features: [
            "Profissionais ilimitados",
            "Múltiplas unidades",
            "Agendamento online",
            "Gerenciamento de clientes",
            "Relatórios avançados",
            "Lembretes por SMS e Email",
          ],
        },
      ],
    },
    vet: {
      title: "Gerencie sua clínica veterinária com facilidade",
      description:
        "Plataforma completa para agendamentos, gestão de pacientes e controle financeiro da sua Clínica Veterinária.",
      features: [
        {
          icon: Calendar,
          title: "Agendamento Online",
          description:
            "Permita que seus clientes agendem consultas para seus pets online, 24 horas por dia, 7 dias por semana.",
        },
        {
          icon: Scissors,
          title: "Gestão de Procedimentos",
          description:
            "Cadastre e gerencie todos os procedimentos oferecidos pela sua Clínica Veterinária.",
        },
        {
          icon: Clock,
          title: "Controle de Horários",
          description:
            "Defina horários de atendimento e disponibilidade dos veterinários.",
        },
      ],
      aiAgentTitle: "Assistente Virtual para Clínicas Veterinárias",
      aiAgentDescription:
        "Ofereça agendamentos inteligentes diretamente pelo WhatsApp com nosso assistente virtual especialista em saúde animal",
      dashboardTitle: "Sua clínica veterinária na palma da mão",
      dashboardDescription:
        "Informações completas de faturamento e agendamento baseado nos procedimentos, tudo em um só lugar.",
      serviceMetrics: [
        { name: "Consultas", value: "R$ 1.250", percentage: "75%" },
        { name: "Vacinas", value: "R$ 850", percentage: "45%" },
        { name: "Cirurgias", value: "R$ 1.350", percentage: "85%" },
      ],
      plans: [
        {
          title: "Starter",
          price: "R$ 49,90",
          description: "Para clínicas pequenas",
          features: [
            "Até 2 veterinários",
            "Agendamento online",
            "Gerenciamento de pacientes",
            "Relatórios básicos",
          ],
        },
        {
          title: "Professional",
          price: "R$ 99,90",
          description: "Para clínicas em crescimento",
          features: [
            "Até 5 veterinários",
            "Agendamento online",
            "Gerenciamento de pacientes",
            "Relatórios avançados",
            "Lembretes por SMS",
            "Personalização da agenda",
          ],
        },
        {
          title: "Business",
          price: "R$ 199,90",
          description: "Para redes de clínicas",
          features: [
            "Veterinários ilimitados",
            "Múltiplas unidades",
            "Agendamento online",
            "Gerenciamento de pacientes",
            "Relatórios avançados",
            "Lembretes por SMS e Email",
          ],
        },
      ],
    },
  };

  // Obter o conteúdo do negócio selecionado
  const content = businessContent[selectedBusiness];

  // Efeito de transição para mudança de conteúdo
  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      {/* Indicador de progresso de scroll estilo Apple */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-lg md:px-6 max-w-full overflow-x-hidden">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-semibold tracking-tight">
                GENDAIA
              </span>
            </Link>
          </motion.div>
          <nav className="hidden md:flex md:gap-4">
            {[
              "features",
              "ai-agent",
              "dashboard",
              "pricing",
              "testimonials",
            ].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link
                  href={`#${item}`}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {item === "features" && "Recursos"}
                  {item === "ai-agent" && "Agente IA"}
                  {item === "dashboard" && "Dashboard"}
                  {item === "pricing" && "Preços"}
                  {item === "testimonials" && "Depoimentos"}
                </Link>
              </motion.div>
            ))}
          </nav>
        </div>
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/login">
            <Button
              variant="outline"
              className="transition-all hover:scale-105"
            >
              Entrar
            </Button>
          </Link>
          <Link href="/register">
            <Button className="transition-all hover:scale-105">
              Registrar
            </Button>
          </Link>
        </motion.div>
      </header>

      <main className="flex-1">
        <AnimatedSection className="w-full py-12 md:py-24 lg:py-32 relative overflow-hidden">
          <div className="container px-4 md:px-6 relative z-10">
            {/* Seletor de tipo de negócio */}
            <BusinessSelector
              selectedBusiness={selectedBusiness}
              onSelect={setSelectedBusiness}
            />

            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedBusiness}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={contentVariants}
                  className="flex flex-col justify-center space-y-4"
                >
                  <div className="space-y-2">
                    <motion.h1
                      className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      {content.title}
                    </motion.h1>
                    <motion.p
                      className="max-w-[600px] text-muted-foreground md:text-xl"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      {content.description}
                    </motion.p>
                  </div>
                  <motion.div
                    className="flex flex-col gap-2 min-[400px]:flex-row"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <Link href="/register">
                      <Button
                        size="lg"
                        className="gap-1 transition-all hover:scale-105 hover:shadow-lg"
                      >
                        Comece agora
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="#features">
                      <Button
                        size="lg"
                        variant="outline"
                        className="transition-all hover:scale-105"
                      >
                        Saiba mais
                      </Button>
                    </Link>
                  </motion.div>
                  <motion.div
                    className="flex items-center gap-2 text-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>
                      7 dias de teste grátis! sem compromisso, sem a necessidade
                      cartão de crédito!
                    </span>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              <motion.div
                className="flex items-center justify-center"
                style={{ y: heroImageY, opacity }}
              >
                <motion.div
                  className="relative h-[350px] w-full overflow-hidden rounded-xl bg-muted shadow-2xl"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ThemeImage />
                  </div>
                  {/* Elementos decorativos estilo Apple */}
                  <motion.div
                    className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/20 blur-3xl"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                  />
                  <motion.div
                    className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-primary/30 blur-3xl"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0.7, 0.5],
                    }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <motion.div
              className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl"
              animate={{
                x: [0, 50, 0],
                y: [0, 30, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
            <motion.div
              className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-primary/10 blur-3xl"
              animate={{
                x: [0, -50, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          </div>
        </AnimatedSection>

        <AnimatedSection
          id="features"
          className="w-full bg-muted/50 py-12 md:py-24 lg:py-32 relative"
        >
          <div className="container px-4 md:px-6">
            <motion.div
              className="flex flex-col items-center justify-center space-y-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  Recursos Principais
                </h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Tudo o que você precisa para gerenciar seu negócio em um só
                  lugar
                </p>
              </div>
            </motion.div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3">
              <AnimatePresence>
                {content.features.map((feature, index) => (
                  <motion.div
                    key={`${selectedBusiness}-${index}`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                    }}
                    className="flex flex-col items-center space-y-2 rounded-lg border bg-background p-6 shadow-sm"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        delay: 0.1 + index * 0.1,
                      }}
                      className="rounded-full bg-primary/10 p-3"
                    >
                      <feature.icon className="h-8 w-8 text-primary" />
                    </motion.div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="text-center text-muted-foreground">
                      {feature.description}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection
          id="ai-agent"
          className="w-full py-12 md:py-24 lg:py-32 relative"
        >
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <motion.div
                className="flex items-center justify-center"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  className="relative h-[450px] w-full overflow-hidden rounded-xl bg-muted shadow-2xl"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                    <motion.div
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        delay: 0.2,
                      }}
                    >
                      <Bot className="h-8 w-8" />
                    </motion.div>
                    <motion.div
                      className="max-w-md space-y-4 rounded-lg border bg-background p-4 shadow-lg"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <motion.div
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-sm">
                            Olá! Sou a GENDAIA. Como posso ajudar com seu
                            agendamento hoje?
                          </p>
                        </div>
                      </motion.div>
                      <motion.div
                        className="flex items-start gap-3 justify-end"
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                      >
                        <div className="rounded-lg bg-primary p-3">
                          <p className="text-sm text-primary-foreground">
                            {selectedBusiness === "medical" &&
                              "Quero agendar uma consulta para amanhã às 14h"}
                            {selectedBusiness === "salon" &&
                              "Quero agendar um corte de cabelo para amanhã às 14h"}
                            {selectedBusiness === "petshop" &&
                              "Quero agendar um banho para meu cachorro amanhã às 14h"}
                            {selectedBusiness === "vet" &&
                              "Quero agendar uma consulta para meu gato amanhã às 14h"}
                          </p>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                          <Smartphone className="h-4 w-4 text-primary" />
                        </div>
                      </motion.div>
                      <motion.div
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                      >
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
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>

              <AnimatePresence>
                <motion.div
                  key={selectedBusiness}
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex flex-col justify-center space-y-4"
                >
                  <div className="space-y-2">
                    <motion.div
                      className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3 }}
                    >
                      <Zap className="mr-1 h-3 w-3 text-primary" />
                      <span className="text-xs font-medium">Novo Recurso</span>
                    </motion.div>
                    <motion.h2
                      className="text-3xl font-bold tracking-tighter sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      {content.aiAgentTitle}
                    </motion.h2>
                    <motion.p
                      className="max-w-[600px] text-muted-foreground md:text-xl"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      {content.aiAgentDescription}
                    </motion.p>
                  </div>
                  <motion.ul
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    {[
                      {
                        icon: MessageSquare,
                        title: "Atendimento 24/7",
                        description:
                          "Seus clientes podem agendar a qualquer hora, mesmo quando você está ocupado ou fora do horário comercial",
                      },
                      {
                        icon: Bot,
                        title: "Inteligência Humana",
                        description:
                          "Nosso agente de IA entende linguagem natural e responde como um atendente humano, oferecendo uma experiência personalizada",
                      },
                      {
                        icon: Calendar,
                        title: "Integração Automática",
                        description:
                          "Todos os agendamentos são sincronizados instantaneamente com sua agenda, evitando conflitos de horários",
                      },
                    ].map((item, index) => (
                      <motion.li
                        key={index}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                      >
                        <motion.div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"
                          whileHover={{
                            scale: 1.1,
                            backgroundColor: "rgba(var(--primary), 0.2)",
                          }}
                        >
                          <item.icon className="h-5 w-5 text-primary" />
                        </motion.div>
                        <div>
                          <h3 className="font-medium">{item.title}</h3>
                          <p className="text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </motion.li>
                    ))}
                  </motion.ul>
                  <motion.div
                    className="flex flex-col gap-2 min-[400px]:flex-row pt-4 flex-wrap"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <Link href="/register">
                      <Button
                        size="lg"
                        className="gap-1 transition-all hover:scale-105 hover:shadow-lg bg-green-600 hover:bg-green-700 text-white"
                      >
                        Ativar Agente IA
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="#demo">
                      <Button
                        size="lg"
                        variant="outline"
                        className="transition-all hover:scale-105 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                      >
                        Ver demonstração
                      </Button>
                    </Link>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <motion.div
              className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
              animate={{
                x: [0, 30, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          </div>
        </AnimatedSection>

        <AnimatedSection
          id="whatsapp-integration"
          className="w-full bg-gradient-to-b from-background to-background/80 py-12 md:py-24 lg:py-32 relative"
        >
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <AnimatePresence>
                <motion.div
                  key={selectedBusiness}
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex flex-col justify-center space-y-4"
                >
                  <div className="space-y-2">
                    <motion.div
                      className="inline-flex items-center rounded-full border bg-primary/10 px-3 py-1 text-sm"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3 }}
                    >
                      <Zap className="mr-1 h-3 w-3 text-primary" />
                      <span className="text-xs font-medium">
                        Integração Oficial
                      </span>
                    </motion.div>
                    <motion.h2
                      className="text-3xl font-bold tracking-tighter sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      WhatsApp + Inteligência Artificial
                    </motion.h2>
                    <motion.p
                      className="max-w-[600px] text-muted-foreground md:text-xl"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      Conecte seu WhatsApp em segundos e deixe nossa IA
                      gerenciar agendamentos automaticamente, mesmo quando você
                      estiver offline
                    </motion.p>
                  </div>
                  <motion.ul
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    {[
                      {
                        icon: Smartphone,
                        title: "Ativação Simples",
                        description:
                          "Basta escanear um QR code do WhatsApp Web e a IA já estará ativa no seu celular em segundos",
                      },
                      {
                        icon: Bot,
                        title: "Funciona 24/7",
                        description:
                          "Mesmo com seu celular desligado, a IA continua respondendo e agendando para seus clientes",
                      },
                      {
                        icon: MessageSquare,
                        title: "Conversas Naturais",
                        description:
                          "A IA responde como um atendente real, entendendo pedidos complexos e confirmando detalhes importantes",
                      },
                    ].map((item, index) => (
                      <motion.li
                        key={index}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                      >
                        <motion.div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"
                          whileHover={{
                            scale: 1.1,
                            backgroundColor: "rgba(var(--primary), 0.2)",
                          }}
                        >
                          <item.icon className="h-5 w-5 text-primary" />
                        </motion.div>
                        <div>
                          <h3 className="font-medium">{item.title}</h3>
                          <p className="text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </motion.li>
                    ))}
                  </motion.ul>
                  <motion.div
                    className="flex flex-col gap-2 min-[400px]:flex-row pt-4"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <Link href="/register">
                      <Button
                        size="lg"
                        className="gap-1 transition-all hover:scale-105 hover:shadow-lg bg-green-600 hover:bg-green-700 text-white"
                      >
                        Conectar WhatsApp
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="#demo">
                      <Button
                        size="lg"
                        variant="outline"
                        className="transition-all hover:scale-105 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                      >
                        Como funciona
                      </Button>
                    </Link>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              <motion.div
                className="flex items-center justify-center"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  className="relative h-[450px] w-full overflow-hidden rounded-xl bg-muted shadow-2xl"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                    <motion.div
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        delay: 0.2,
                      }}
                    >
                      <Smartphone className="h-8 w-8" />
                    </motion.div>
                    <motion.div
                      className="max-w-md space-y-4 rounded-lg border bg-background p-4 shadow-lg"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <div className="flex flex-col items-center space-y-4">
                        <motion.div
                          className="rounded-lg border bg-card p-4 w-64 h-64 flex items-center justify-center shadow-md"
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.4 }}
                        >
                          <div className="relative w-full h-full">
                            {/* QR Code Frame */}
                            <div className="absolute inset-0 p-2">
                              {/* QR Code Corners */}
                              <div className="absolute top-0 left-0 w-12 h-12 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-green-500 rounded-tl-lg rounded-tr-none rounded-bl-none rounded-br-none"></div>
                              </div>
                              <div className="absolute top-0 right-0 w-12 h-12 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-green-500 rounded-tr-lg rounded-tl-none rounded-bl-none rounded-br-none"></div>
                              </div>
                              <div className="absolute bottom-0 left-0 w-12 h-12 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-green-500 rounded-bl-lg rounded-tr-none rounded-tl-none rounded-br-none"></div>
                              </div>

                              {/* QR Code Center */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-36 h-36 grid grid-cols-7 grid-rows-7 gap-1">
                                  {Array.from({ length: 49 }).map((_, i) => {
                                    // Criar um padrão mais realista de QR code
                                    const isCorner =
                                      (i < 7 && (i < 2 || i > 4)) ||
                                      (i > 41 && (i < 44 || i > 46)) ||
                                      (i % 7 < 2 && (i < 14 || i > 34)) ||
                                      (i % 7 > 4 && (i < 14 || i > 34));
                                    const isCenter =
                                      (i >= 21 && i <= 27) ||
                                      i % 7 === 3 ||
                                      Math.floor(i / 7) === 3;

                                    return (
                                      <motion.div
                                        key={i}
                                        className={`w-full h-full ${
                                          isCorner
                                            ? "bg-green-500"
                                            : isCenter
                                            ? "bg-green-400"
                                            : Math.random() > 0.5
                                            ? "bg-green-500"
                                            : "bg-transparent"
                                        }`}
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{
                                          duration: 0.2,
                                          delay: 0.5 + i * 0.01,
                                          ease: "easeInOut",
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                              </div>

                              {/* WhatsApp Logo in Center */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center shadow-sm">
                                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                    <div className="w-4 h-4 border-2 border-background rounded-full"></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* WhatsApp Text */}
                            <div className="absolute -bottom-2 inset-x-0 text-center">
                              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                                WhatsApp Web
                              </p>
                            </div>
                          </div>
                        </motion.div>
                        <motion.div
                          className="text-center"
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.6 }}
                        >
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            Escaneie o QR code
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Use a câmera do WhatsApp para conectar sua conta
                          </p>
                        </motion.div>
                        <motion.div
                          className="flex items-center gap-2 text-green-600 dark:text-green-400"
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.7 }}
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">
                            Conexão segura e criptografada
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <motion.div
              className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
              animate={{
                x: [0, 30, 0],
                y: [0, 20, 0],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          </div>
        </AnimatedSection>

        <AnimatedSection
          id="dashboard"
          className="w-full bg-gradient-to-b from-background to-muted/30 py-12 md:py-24 lg:py-32 relative"
        >
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <AnimatePresence>
                <motion.div
                  key={selectedBusiness}
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex flex-col justify-center space-y-4"
                >
                  <div className="space-y-2">
                    <motion.div
                      className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-xs font-medium">
                        Dashboard Inteligente
                      </span>
                    </motion.div>
                    <motion.h2
                      className="text-3xl font-bold tracking-tighter sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      {content.dashboardTitle}
                    </motion.h2>
                    <motion.p
                      className="max-w-[600px] text-muted-foreground md:text-xl"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      {content.dashboardDescription}
                    </motion.p>
                  </div>
                  <motion.div
                    className="flex flex-col gap-2 min-[400px]:flex-row"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Link href="/register">
                      <Button
                        size="lg"
                        className="gap-1 transition-all hover:scale-105 hover:shadow-lg"
                      >
                        Experimente agora
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="#features">
                      <Button
                        size="lg"
                        variant="outline"
                        className="transition-all hover:scale-105"
                      >
                        Ver recursos
                      </Button>
                    </Link>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              <motion.div
                className="flex items-center justify-center"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  className="relative h-[450px] w-full overflow-hidden rounded-xl border bg-background p-4 shadow-2xl"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div className="flex h-full flex-col space-y-4">
                    <motion.div
                      className="flex items-center justify-between"
                      initial={{ opacity: 0, y: -10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      <div>
                        <h3 className="text-lg font-semibold">Dashboard</h3>
                        <p className="text-sm text-muted-foreground">
                          Visão geral do seu negócio
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                          whileHover={{ scale: 1.05 }}
                        >
                          Hoje
                        </motion.div>
                        <motion.div
                          className="rounded-md bg-muted px-2 py-1 text-xs font-medium"
                          whileHover={{ scale: 1.05 }}
                        >
                          Semana
                        </motion.div>
                        <motion.div
                          className="rounded-md bg-muted px-2 py-1 text-xs font-medium"
                          whileHover={{ scale: 1.05 }}
                        >
                          Mês
                        </motion.div>
                      </div>
                    </motion.div>

                    <motion.div
                      className="grid grid-cols-3 gap-4"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      {[
                        {
                          label: "Faturamento",
                          value: "R$ 3.450",
                          change: "+12% vs ontem",
                        },
                        {
                          label: "Agendamentos",
                          value: "24",
                          change: "+5% vs ontem",
                        },
                        {
                          label:
                            selectedBusiness === "medical" ||
                            selectedBusiness === "vet"
                              ? "Pacientes"
                              : "Clientes",
                          value: "18",
                          change: "+3 novos",
                        },
                      ].map((item, index) => (
                        <motion.div
                          key={index}
                          className="rounded-lg border bg-card p-3"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.3,
                            delay: 0.2 + index * 0.1,
                          }}
                          whileHover={{
                            scale: 1.05,
                            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                            borderColor: "var(--primary)",
                          }}
                        >
                          <div className="text-sm text-muted-foreground">
                            {item.label}
                          </div>
                          <div className="mt-1 text-2xl font-bold">
                            {item.value}
                          </div>
                          <div className="mt-1 flex items-center text-xs text-green-500">
                            <ArrowRight className="h-3 w-3 rotate-45" />
                            <span>{item.change}</span>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>

                    <motion.div
                      className="flex-1 rounded-lg border bg-card p-4"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-medium">
                          Desempenho por{" "}
                          {selectedBusiness === "medical" ||
                          selectedBusiness === "vet"
                            ? "Procedimento"
                            : "Serviço"}
                        </h4>
                        <div className="text-xs text-muted-foreground">
                          Últimos 30 dias
                        </div>
                      </div>
                      <AnimatePresence>
                        <motion.div
                          className="space-y-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {content.serviceMetrics.map((service, index) => (
                            <motion.div
                              key={index}
                              className="space-y-2"
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{
                                duration: 0.3,
                                delay: 0.5 + index * 0.1,
                              }}
                            >
                              <div className="flex items-center justify-between text-sm">
                                <span>{service.name}</span>
                                <span className="font-medium">
                                  {service.value}
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                <motion.div
                                  className="h-2 rounded-full bg-primary"
                                  initial={{ width: 0 }}
                                  whileInView={{ width: service.percentage }}
                                  viewport={{ once: true }}
                                  transition={{
                                    duration: 1,
                                    delay: 0.6 + index * 0.2,
                                  }}
                                />
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>

                    <motion.div
                      className="rounded-lg border bg-card p-3"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                    >
                      <div className="mb-2 text-sm font-medium">
                        Próximos Agendamentos
                      </div>
                      <motion.div
                        className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm"
                        whileHover={{
                          backgroundColor: "rgba(var(--primary), 0.1)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <motion.div
                            className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"
                            whileHover={{ scale: 1.1 }}
                          >
                            <motion.span
                              className="text-xs font-bold text-primary"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              AS
                            </motion.span>
                          </motion.div>
                          <div>
                            <div className="font-medium">Ana Silva</div>
                            <div className="text-xs text-muted-foreground">
                              {selectedBusiness === "medical" &&
                                "Consulta Geral"}
                              {selectedBusiness === "salon" &&
                                "Corte + Coloração"}
                              {selectedBusiness === "petshop" && "Banho e Tosa"}
                              {selectedBusiness === "vet" &&
                                "Consulta de Rotina"}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs">14:30</div>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <motion.div
              className="absolute bottom-1/3 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl"
              animate={{
                x: [0, -30, 0],
                y: [0, 20, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          </div>
        </AnimatedSection>

        <AnimatedSection
          id="pricing"
          className="w-full py-12 md:py-24 lg:py-32 relative"
        >
          <div className="container px-4 md:px-6">
            <motion.div
              className="flex flex-col items-center justify-center space-y-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  Planos e Preços
                </h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Escolha o plano ideal para o tamanho do seu{" "}
                  {selectedBusiness === "medical"
                    ? "consultório"
                    : selectedBusiness === "salon"
                    ? "salão"
                    : selectedBusiness === "petshop"
                    ? "petshop"
                    : "clínica"}
                </p>
              </div>
            </motion.div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3">
              <AnimatePresence>
                {content.plans.map((plan, index) => (
                  <motion.div
                    key={`${selectedBusiness}-${plan.title}`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{
                      scale: 1.03,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                      borderColor:
                        index === 1
                          ? "var(--primary)"
                          : "rgba(var(--primary), 0.3)",
                    }}
                    className={`flex flex-col rounded-lg border ${
                      index === 1 ? "border-primary" : ""
                    } bg-background p-6 shadow-sm ${
                      index === 1 ? "relative" : ""
                    }`}
                  >
                    {index === 1 && (
                      <motion.div
                        className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 15,
                          delay: 0.3,
                        }}
                      >
                        Popular
                      </motion.div>
                    )}
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
                    >
                      <h3 className="text-2xl font-bold">{plan.title}</h3>
                      <p className="text-muted-foreground">
                        {plan.description}
                      </p>
                    </motion.div>
                    <motion.div
                      className="mt-4 flex items-baseline text-3xl font-bold"
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                    >
                      {plan.price}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        /mês
                      </span>
                    </motion.div>
                    <motion.ul
                      className="mt-6 space-y-3"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    >
                      {plan.features.map((feature, featureIndex) => (
                        <motion.li
                          key={featureIndex}
                          className="flex items-center"
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.3,
                            delay: 0.4 + index * 0.1 + featureIndex * 0.05,
                          }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 360 }}
                            transition={{ duration: 0.3 }}
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                          </motion.div>
                          <span>{feature}</span>
                        </motion.li>
                      ))}
                    </motion.ul>
                    <motion.div
                      className="mt-6"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                    >
                      <Link href="/register">
                        <Button className="w-full transition-all hover:scale-105 hover:shadow-lg">
                          Começar teste grátis
                        </Button>
                      </Link>
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <motion.div
              className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
              animate={{
                x: [0, 40, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          </div>
        </AnimatedSection>

        <AnimatedSection
          id="testimonials"
          className="w-full bg-muted/50 py-12 md:py-24 lg:py-32 relative"
        >
          <div className="container px-4 md:px-6">
            <motion.div
              className="flex flex-col items-center justify-center space-y-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  Depoimentos
                </h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  O que nossos clientes dizem sobre a plataforma
                </p>
              </div>
            </motion.div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3">
              {[
                {
                  name:
                    selectedBusiness === "medical"
                      ? "Dr. Carlos Silva"
                      : selectedBusiness === "salon"
                      ? "Carlos Silva"
                      : selectedBusiness === "petshop"
                      ? "Carlos Silva"
                      : "Dr. Carlos Silva",
                  business:
                    selectedBusiness === "medical"
                      ? "Clínica Silva"
                      : selectedBusiness === "salon"
                      ? "Barbearia Silva"
                      : selectedBusiness === "petshop"
                      ? "Petshop Silva"
                      : "Clínica Veterinária Silva",
                  testimonial:
                    selectedBusiness === "medical"
                      ? "A plataforma transformou a gestão da minha clínica. Agora consigo controlar tudo em um só lugar e meus pacientes adoram a facilidade de agendar online."
                      : selectedBusiness === "salon"
                      ? "A plataforma transformou a gestão do meu salão. Agora consigo controlar tudo em um só lugar e meus clientes adoram a facilidade de agendar online."
                      : selectedBusiness === "petshop"
                      ? "A plataforma transformou a gestão do meu petshop. Agora consigo controlar tudo em um só lugar e meus clientes adoram a facilidade de agendar online."
                      : "A plataforma transformou a gestão da minha clínica veterinária. Agora consigo controlar tudo em um só lugar e meus clientes adoram a facilidade de agendar online.",
                },
                {
                  name:
                    selectedBusiness === "medical"
                      ? "Dra. Ana Oliveira"
                      : selectedBusiness === "salon"
                      ? "Ana Oliveira"
                      : selectedBusiness === "petshop"
                      ? "Ana Oliveira"
                      : "Dra. Ana Oliveira",
                  business:
                    selectedBusiness === "medical"
                      ? "Consultório Saúde"
                      : selectedBusiness === "salon"
                      ? "Salão Beleza"
                      : selectedBusiness === "petshop"
                      ? "Petshop Amigo"
                      : "Clínica Animal",
                  testimonial:
                    selectedBusiness === "medical"
                      ? "O assistente virtual reduziu em 70% as ligações para agendamentos. Minha secretária agora tem tempo para atividades mais importantes."
                      : selectedBusiness === "salon"
                      ? "O assistente virtual reduziu em 70% as ligações para agendamentos. Minha recepcionista agora tem tempo para atividades mais importantes."
                      : selectedBusiness === "petshop"
                      ? "O assistente virtual reduziu em 70% as ligações para agendamentos. Minha equipe agora tem tempo para cuidar melhor dos pets."
                      : "O assistente virtual reduziu em 70% as ligações para agendamentos. Minha recepcionista agora tem tempo para atividades mais importantes.",
                },
                {
                  name:
                    selectedBusiness === "medical"
                      ? "Dr. Marcos Santos"
                      : selectedBusiness === "salon"
                      ? "Marcos Santos"
                      : selectedBusiness === "petshop"
                      ? "Marcos Santos"
                      : "Dr. Marcos Santos",
                  business:
                    selectedBusiness === "medical"
                      ? "Centro Médico Vida"
                      : selectedBusiness === "salon"
                      ? "Barbearia Moderna"
                      : selectedBusiness === "petshop"
                      ? "Petshop Feliz"
                      : "Hospital Veterinário Santos",
                  testimonial:
                    selectedBusiness === "medical"
                      ? "Os relatórios financeiros me ajudam a entender quais procedimentos são mais rentáveis. Aumentei meu faturamento em 30% em apenas 3 meses."
                      : selectedBusiness === "salon"
                      ? "Os relatórios financeiros me ajudam a entender quais serviços são mais rentáveis. Aumentei meu faturamento em 30% em apenas 3 meses."
                      : selectedBusiness === "petshop"
                      ? "Os relatórios financeiros me ajudam a entender quais serviços são mais rentáveis. Aumentei meu faturamento em 30% em apenas 3 meses."
                      : "Os relatórios financeiros me ajudam a entender quais procedimentos são mais rentáveis. Aumentei meu faturamento em 30% em apenas 3 meses.",
                },
              ].map((testimonial, i) => (
                <motion.div
                  key={`${selectedBusiness}-testimonial-${i}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  whileHover={{
                    scale: 1.03,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                    borderColor: "rgba(var(--primary), 0.3)",
                  }}
                  className="flex flex-col rounded-lg border bg-background p-6 shadow-sm"
                >
                  <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.1 }}
                  >
                    {Array.from({ length: 5 }).map((_, j) => (
                      <motion.div
                        key={j}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.3,
                          delay: 0.2 + i * 0.1 + j * 0.05,
                          type: "spring",
                          stiffness: 300,
                        }}
                      >
                        <Star className="h-4 w-4 fill-current text-primary" />
                      </motion.div>
                    ))}
                  </motion.div>
                  <motion.blockquote
                    className="mt-4"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
                  >
                    <p className="text-muted-foreground">
                      "{testimonial.testimonial}"
                    </p>
                  </motion.blockquote>
                  <motion.div
                    className="mt-4 flex items-center gap-4"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                  >
                    <motion.div
                      className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                    >
                      <motion.span
                        className="text-xs font-bold text-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {testimonial.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </motion.span>
                    </motion.div>
                    <div>
                      <p className="font-medium">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.business}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <motion.div
              className="absolute bottom-1/4 right-1/3 w-72 h-72 rounded-full bg-primary/10 blur-3xl"
              animate={{
                x: [0, -30, 0],
                y: [0, 20, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          </div>
        </AnimatedSection>

        <AnimatedSection className="w-full py-12 md:py-24 lg:py-32 relative">
          <div className="container px-4 md:px-6">
            <motion.div
              className="flex flex-col items-center justify-center space-y-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-2">
                <motion.h2
                  className="text-3xl font-bold tracking-tighter sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Pronto para começar?
                </motion.h2>
                <motion.p
                  className="max-w-[600px] text-muted-foreground md:text-xl"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Experimente gratuitamente por 7 dias. Sem compromisso.
                </motion.p>
              </div>
              <motion.div
                className="flex flex-col gap-2 min-[400px]:flex-row"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Link href="/register">
                  <Button
                    size="lg"
                    className="gap-1 transition-all hover:scale-105 hover:shadow-lg"
                    whileHover={{ scale: 1.05 }}
                  >
                    Comece agora
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatType: "loop",
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </Button>
                </Link>

                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="transition-all hover:scale-105"
                  >
                    Já tem uma conta? Entrar
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <motion.div
              className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
              animate={{
                x: [0, 30, 0],
                y: [0, -20, 0],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/3 w-72 h-72 rounded-full bg-primary/10 blur-3xl"
              animate={{
                x: [0, -30, 0],
                y: [0, 20, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          </div>
        </AnimatedSection>
      </main>
      <motion.footer
        className="border-t py-6 md:py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="container flex flex-col items-center justify-center gap-4 px-4 md:px-6">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} GENDAIA. Todos os direitos
              reservados.
            </p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}

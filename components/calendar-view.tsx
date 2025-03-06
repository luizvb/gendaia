"use client";

import { useState, useRef, useEffect } from "react";
import { addDays, addHours, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AppointmentModal } from "./appointment-modal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Professional {
  id: string;
  name: string;
  color: string;
  business_id: string;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface Client {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

interface Appointment {
  id: number;
  start_time: string;
  end_time: string;
  client_id: number;
  professional_id: number;
  service_id: number;
  clients: {
    name: string;
  };
  services: {
    name: string;
  };
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    professionalId: string;
  } | null>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [view, setView] = useState<"day" | "week">("week");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const calendarContainerRef = useRef<HTMLDivElement>(null);

  // Buscar profissionais, serviços e agendamentos
  useEffect(() => {
    fetchProfessionals();
    fetchServices();
    fetchAppointments();
    fetchClients();
  }, [currentDate, view]);

  // Buscar clientes quando o termo de busca mudar
  useEffect(() => {
    if (clientSearchTerm.length >= 2) {
      fetchClients(clientSearchTerm);
    }
  }, [clientSearchTerm]);

  const fetchProfessionals = async () => {
    try {
      const response = await fetch("/api/professionals");
      if (!response.ok) throw new Error("Falha ao carregar profissionais");
      const data = await response.json();
      setProfessionals(data);
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
      toast.error("Não foi possível carregar os profissionais");
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Falha ao carregar serviços");
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      toast.error("Não foi possível carregar os serviços");
    }
  };

  const fetchClients = async (searchTerm = "") => {
    try {
      const url = searchTerm
        ? `/api/clients?name=${encodeURIComponent(searchTerm)}`
        : "/api/clients";

      const response = await fetch(url);
      if (!response.ok) throw new Error("Falha ao carregar clientes");
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast.error("Não foi possível carregar os clientes");
    }
  };

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const startDate =
        view === "day"
          ? format(currentDate, "yyyy-MM-dd")
          : format(startOfWeek(currentDate, { locale: ptBR }), "yyyy-MM-dd");

      const endDate =
        view === "day"
          ? format(addDays(currentDate, 1), "yyyy-MM-dd")
          : format(
              addDays(startOfWeek(currentDate, { locale: ptBR }), 7),
              "yyyy-MM-dd"
            );

      console.log("Fetching appointments:", { startDate, endDate });

      const response = await fetch(
        `/api/appointments?start_date=${startDate}&end_date=${endDate}`
      );
      if (!response.ok) throw new Error("Falha ao carregar agendamentos");
      const data = await response.json();
      console.log("Appointments data:", data);
      setAppointments(data);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      toast.error("Não foi possível carregar os agendamentos");
    } finally {
      setIsLoading(false);
    }
  };

  // Função para criar um novo cliente
  const handleClientCreated = (newClient: Client) => {
    setClients((prevClients) => [...prevClients, newClient]);
    fetchAppointments();
  };

  // Calcular o início da semana (domingo)
  const weekStart = startOfWeek(currentDate, { locale: ptBR });

  // Gerar os dias da semana
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(weekStart, i)
  );

  // Gerar os dias para a visualização atual (dia único ou semana)
  const daysToShow = view === "day" ? [currentDate] : weekDays;

  // Gerar os horários do dia
  const dayHours = Array.from({ length: 10 }).map((_, i) =>
    addHours(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        9
      ),
      i
    )
  );

  // Determinar quantos dias mostrar com base na largura da tela (para mobile)
  const [visibleDays, setVisibleDays] = useState(daysToShow);

  useEffect(() => {
    const handleResize = () => {
      // Em telas pequenas no modo semana, mostrar apenas o dia atual e o próximo
      if (window.innerWidth < 640 && view === "week") {
        const todayIndex = weekDays.findIndex((day) =>
          isSameDay(day, new Date())
        );

        // Se hoje estiver na semana atual, mostrar hoje e amanhã
        if (todayIndex >= 0 && todayIndex < 6) {
          setVisibleDays([weekDays[todayIndex], weekDays[todayIndex + 1]]);
        } else {
          // Caso contrário, mostrar os dois primeiros dias da semana
          setVisibleDays(weekDays.slice(0, 2));
        }
      } else {
        // Em telas maiores ou no modo dia, mostrar todos os dias
        setVisibleDays(daysToShow);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [view, daysToShow, weekDays]);

  // Navegar para o dia/semana anterior
  const prev = () => {
    if (view === "day") {
      setCurrentDate(addDays(currentDate, -1));
    } else {
      setCurrentDate(addDays(currentDate, -7));
    }
  };

  // Navegar para o próximo dia/semana
  const next = () => {
    if (view === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 7));
    }
  };

  // Navegar para hoje
  const today = () => {
    setCurrentDate(new Date());
  };

  // Abrir modal de agendamento
  const openAppointmentModal = (
    date: Date,
    professionalId: string,
    appointment?: Appointment
  ) => {
    if (appointment) {
      setSelectedAppointment(appointment);
      setSelectedSlot(null);
    } else {
      setSelectedSlot({ date, professionalId });
      setSelectedAppointment(null);
    }
    setIsModalOpen(true);
  };

  // Verificar se há agendamento para um horário e profissional específico
  const getAppointment = (date: Date, professionalId: string) => {
    const appointment = appointments.find(
      (appointment) =>
        isSameDay(new Date(appointment.start_time), date) &&
        new Date(appointment.start_time).getHours() === date.getHours() &&
        appointment.professional_id.toString() === professionalId
    );

    // Debug only for the first hour of the day to avoid console spam
    if (date.getHours() === 9 && date.getMinutes() === 0) {
      console.log("Checking appointment:", {
        date: date.toISOString(),
        professionalId,
        found: !!appointment,
        appointmentsCount: appointments.length,
      });
    }

    return appointment;
  };

  // Obter o profissional pelo ID
  const getProfessional = (id: number | string) => {
    const idString = id.toString();
    return professionals.find((professional) => professional.id === idString);
  };

  // Formatar o título da data
  const formatDateTitle = () => {
    if (view === "day") {
      return format(currentDate, "dd 'de' MMMM, yyyy", { locale: ptBR });
    } else {
      return `${format(weekDays[0], "dd 'de' MMMM", {
        locale: ptBR,
      })} - ${format(weekDays[6], "dd 'de' MMMM, yyyy", { locale: ptBR })}`;
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Anterior</span>
          </Button>
          <Button variant="outline" size="icon" onClick={next}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Próximo</span>
          </Button>
          <Button variant="outline" size="sm" onClick={today}>
            Hoje
          </Button>
          <span className="ml-2 text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">
            {formatDateTitle()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "day" | "week")}
            className="flex-shrink-0"
          >
            <TabsList>
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Calendário com layout fixo e scroll único */}
      <div
        ref={calendarContainerRef}
        className="relative rounded-md border overflow-auto max-w-full"
        style={{ height: "calc(100vh - 220px)" }}
      >
        {/* Cabeçalho com os dias - fixo no topo */}
        <div className="sticky top-0 z-10 flex bg-background">
          {/* Célula vazia no canto superior esquerdo */}
          <div className="flex-shrink-0 w-14 sm:w-20 h-12 border-b border-r"></div>

          {/* Cabeçalhos dos dias */}
          <div className={`flex flex-grow ${view === "day" ? "" : "divide-x"}`}>
            {visibleDays.map((day, i) => (
              <div
                key={i}
                className={`flex-1 flex h-12 flex-col items-center justify-center border-b
                  ${isSameDay(day, new Date()) ? "bg-accent" : ""}`}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {format(day, "EEE", { locale: ptBR })}
                </span>
                <span className="text-sm font-semibold">
                  {format(day, "dd")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Conteúdo do calendário com grid */}
        <div className="flex">
          {/* Coluna de horários - fixa à esquerda */}
          <div className="sticky left-0 flex-shrink-0 w-14 sm:w-20 bg-background z-10">
            {/* Cabeçalho vazio acima dos horários */}
            <div className="h-8 border-b border-r hidden sm:block"></div>

            {dayHours.map((hour, i) => (
              <div
                key={i}
                className="flex h-16 items-center justify-center border-b border-r text-xs sm:text-sm text-muted-foreground"
              >
                {format(hour, "HH:mm")}
              </div>
            ))}
          </div>

          {/* Grade principal do calendário */}
          <div className="flex-grow">
            {isLoading ? (
              <div className="flex h-full items-center justify-center min-h-[160px]">
                <div className="text-sm text-muted-foreground">
                  Carregando agendamentos...
                </div>
              </div>
            ) : (
              <>
                {/* Cabeçalho com nomes dos profissionais - visível apenas em telas maiores */}
                <div className="hidden sm:flex border-b">
                  {professionals.map((professional) => (
                    <div
                      key={professional.id}
                      className="h-8 px-2 flex items-center text-xs font-medium"
                      style={{
                        width: `${100 / professionals.length}%`,
                        backgroundColor: `${professional.color}20`,
                      }}
                    >
                      {professional.name}
                    </div>
                  ))}
                </div>

                <div
                  className={`flex w-full ${view === "day" ? "" : "divide-x"}`}
                >
                  {visibleDays.map((day, dayIndex) => (
                    <div key={dayIndex} className="flex-1 min-w-0">
                      {professionals.length > 0 ? (
                        professionals.map((professional) => (
                          <div key={professional.id} className="border-b">
                            <div className="sticky left-0 bg-muted/20 px-2 py-1 text-xs font-medium border-t sm:hidden">
                              {professional.name}
                            </div>
                            {dayHours.map((hour, hourIndex) => {
                              const currentHour = new Date(
                                day.getFullYear(),
                                day.getMonth(),
                                day.getDate(),
                                hour.getHours()
                              );
                              const appointment = getAppointment(
                                currentHour,
                                professional.id
                              );

                              return (
                                <div
                                  key={hourIndex}
                                  className={`group relative h-16 border-t border-dashed border-border first:border-t-0 ${
                                    hourIndex === 0 ? "border-t-0" : ""
                                  }`}
                                  onClick={() =>
                                    openAppointmentModal(
                                      currentHour,
                                      professional.id,
                                      appointment
                                    )
                                  }
                                >
                                  {appointment ? (
                                    <div
                                      className="absolute inset-1 flex flex-col rounded-md p-1 text-xs text-white cursor-pointer"
                                      style={{
                                        backgroundColor: getProfessional(
                                          appointment.professional_id
                                        )?.color,
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openAppointmentModal(
                                          currentHour,
                                          professional.id,
                                          appointment
                                        );
                                      }}
                                    >
                                      <span className="font-medium truncate">
                                        {appointment.clients.name}
                                      </span>
                                      <span className="truncate">
                                        {appointment.services.name}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="absolute inset-0 flex cursor-pointer items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                                      <Plus className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          Nenhum profissional cadastrado
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAppointment(null);
          setSelectedSlot(null);
        }}
        selectedSlot={selectedSlot}
        selectedAppointment={selectedAppointment}
        professionals={professionals}
        services={services}
        clients={clients}
        onClientSearch={setClientSearchTerm}
        onClientCreated={handleClientCreated}
        onAppointmentCreated={fetchAppointments}
        onAppointmentUpdated={fetchAppointments}
      />
    </div>
  );
}

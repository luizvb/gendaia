"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { addDays, addHours, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ClipboardCopy,
  Menu,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AppointmentModal } from "./appointment-modal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [selectedProfessional, setSelectedProfessional] = useState<
    string | null
  >(null);
  const [businessSubdomain, setBusinessSubdomain] = useState<string | null>(
    null
  );
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [professionalsAvailability, setProfessionalsAvailability] = useState<{
    [professionalId: string]: {
      [date: string]: string[];
    };
  }>({});
  const [businessHours, setBusinessHours] = useState<{
    [dayOfWeek: number]: {
      is_open: boolean;
      open_time: string;
      close_time: string;
    };
  }>({});

  const calendarContainerRef = useRef<HTMLDivElement>(null);

  // Wrap fetch functions in useCallback to prevent recreation on every render
  const fetchProfessionals = useCallback(async () => {
    try {
      const response = await fetch("/api/professionals");
      if (!response.ok) throw new Error("Falha ao carregar profissionais");
      const data = await response.json();
      setProfessionals(data);
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
      toast.error("Não foi possível carregar os profissionais");
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Falha ao carregar serviços");
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      toast.error("Não foi possível carregar os serviços");
    }
  }, []);

  const fetchClients = useCallback(async (searchTerm = "") => {
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
  }, []);

  // Buscar clientes quando o termo de busca mudar
  useEffect(() => {
    if (clientSearchTerm.length >= 2) {
      fetchClients(clientSearchTerm);
    }
  }, [clientSearchTerm, fetchClients]);

  const fetchAppointments = useCallback(async () => {
    try {
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
    }
  }, [currentDate, view]);

  // New function to fetch availability for all professionals
  const fetchAllAvailability = useCallback(async () => {
    try {
      const response = await fetch("/api/availability?fetch_all=true");
      if (!response.ok) throw new Error("Falha ao carregar disponibilidades");
      const data = await response.json();

      // Transform the data into a more convenient format for lookup
      const availabilityMap: {
        [professionalId: string]: {
          [date: string]: string[];
        };
      } = {};

      data.professionals_availability.forEach((prof: any) => {
        availabilityMap[prof.id] = prof.availability;
      });

      setProfessionalsAvailability(availabilityMap);
    } catch (error) {
      console.error("Erro ao carregar disponibilidades:", error);
      toast.error("Não foi possível carregar as disponibilidades");
    }
  }, []);

  // Fetch business hours
  const fetchBusinessHours = useCallback(async () => {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok)
        throw new Error("Falha ao carregar horários de funcionamento");
      const data = await response.json();

      // Transform the data into a more convenient format for lookup
      const hoursMap: {
        [dayOfWeek: number]: {
          is_open: boolean;
          open_time: string;
          close_time: string;
        };
      } = {};

      if (data.businessHours && Array.isArray(data.businessHours)) {
        data.businessHours.forEach((hour: any) => {
          hoursMap[hour.day_of_week] = {
            is_open: hour.is_open,
            open_time: hour.open_time,
            close_time: hour.close_time,
          };
        });
      }

      setBusinessHours(hoursMap);

      // Also set business subdomain if available
      if (data.business && data.business.subdomain) {
        setBusinessSubdomain(data.business.subdomain);
      } else if (data.business && data.business.name) {
        // Generate subdomain from name if not set
        const subdomain = `${data.business.name
          .toLowerCase()
          .replace(/\s+/g, "-")}.gendaia.com.br`;
        setBusinessSubdomain(subdomain);
      }
    } catch (error) {
      console.error("Erro ao carregar horários de funcionamento:", error);
      toast.error("Não foi possível carregar os horários de funcionamento");
    }
  }, []);

  // Função para atualizar agendamentos e disponibilidades
  const refreshAppointmentsAndAvailability = useCallback(async () => {
    try {
      // Mostrar loading state
      setIsLoading(true);

      // Executar ambas as chamadas em paralelo
      await Promise.all([fetchAppointments(), fetchAllAvailability()]);

      console.log("Agendamentos e disponibilidades atualizados com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      toast.error("Não foi possível atualizar os dados");
    } finally {
      setIsLoading(false);
    }
  }, [fetchAppointments, fetchAllAvailability]);

  // Função para criar um novo cliente
  const handleClientCreated = useCallback(
    (newClient: Client) => {
      setClients((prevClients) => [...prevClients, newClient]);
      // Call fetchAppointments directly instead of using the callback
      // to avoid potential circular dependencies
      (async () => {
        try {
          const startDate =
            view === "day"
              ? format(currentDate, "yyyy-MM-dd")
              : format(
                  startOfWeek(currentDate, { locale: ptBR }),
                  "yyyy-MM-dd"
                );

          const endDate =
            view === "day"
              ? format(addDays(currentDate, 1), "yyyy-MM-dd")
              : format(
                  addDays(startOfWeek(currentDate, { locale: ptBR }), 7),
                  "yyyy-MM-dd"
                );

          const response = await fetch(
            `/api/appointments?start_date=${startDate}&end_date=${endDate}`
          );
          if (!response.ok) throw new Error("Falha ao carregar agendamentos");
          const data = await response.json();
          setAppointments(data);
        } catch (error) {
          console.error("Erro ao carregar agendamentos:", error);
          toast.error("Não foi possível carregar os agendamentos");
        }
      })();
    },
    [currentDate, view]
  );

  const weekDays = useMemo(() => {
    // Start from today instead of week's start
    return Array.from({ length: 7 }).map((_, i) => addDays(currentDate, i));
  }, [currentDate]); // Só recalcula quando currentDate muda

  const daysToShow = useMemo(
    () => (view === "day" ? [currentDate] : weekDays),
    [view, weekDays, currentDate]
  );

  // Function to check if a day is open based on business hours
  const isDayOpen = useCallback(
    (date: Date) => {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // If we don't have business hours for this day, assume it's open
      if (!businessHours[dayOfWeek]) return true;

      return businessHours[dayOfWeek].is_open;
    },
    [businessHours]
  );

  // Function to get business hours for a specific day
  const getBusinessHoursForDay = useCallback(
    (date: Date) => {
      const dayOfWeek = date.getDay();

      // If we don't have business hours for this day, use default hours
      if (!businessHours[dayOfWeek]) {
        return {
          open_time: "09:00",
          close_time: "19:00",
        };
      }

      return {
        open_time: businessHours[dayOfWeek].open_time || "09:00",
        close_time: businessHours[dayOfWeek].close_time || "19:00",
      };
    },
    [businessHours]
  );

  // Function to check if a specific time slot is within business hours
  const isTimeSlotWithinBusinessHours = useCallback(
    (date: Date) => {
      const dayOfWeek = date.getDay();

      // If the day is closed, the time slot is not within business hours
      if (!isDayOpen(date)) return false;

      // Get business hours for this day
      const { open_time, close_time } = getBusinessHoursForDay(date);

      // Parse open and close times
      const [openHour, openMinute] = open_time.split(":").map(Number);
      const [closeHour, closeMinute] = close_time.split(":").map(Number);

      // Convert to minutes for easier comparison
      const openTimeInMinutes = openHour * 60 + openMinute;
      const closeTimeInMinutes = closeHour * 60 + closeMinute;
      const slotTimeInMinutes = date.getHours() * 60 + date.getMinutes();

      // Check if the time slot is within business hours
      return (
        slotTimeInMinutes >= openTimeInMinutes &&
        slotTimeInMinutes < closeTimeInMinutes
      );
    },
    [isDayOpen, getBusinessHoursForDay]
  );

  // Gerar os horários do dia com base nos horários de funcionamento
  const dayHours = useMemo(() => {
    const slots: Date[] = [];

    // Default business hours if none are configured
    const defaultOpenHour = 8; // Changed from 9 to 8
    const defaultCloseHour = 18; // Changed from 19 to 18

    // For each day in the view
    daysToShow.forEach((day) => {
      // Find the earliest open time and latest close time across all days
      // to determine the full range of hours to display
      let earliestOpenHour = 23;
      let latestCloseHour = 0;

      // Check all days to find the earliest and latest business hours
      Object.values(businessHours).forEach((hours) => {
        if (hours.is_open) {
          const [openHour] = hours.open_time.split(":").map(Number);
          const [closeHour] = hours.close_time.split(":").map(Number);

          earliestOpenHour = Math.min(earliestOpenHour, openHour);
          latestCloseHour = Math.max(latestCloseHour, closeHour);
        }
      });

      // If no business hours are configured or all days are closed, use defaults
      if (earliestOpenHour > latestCloseHour) {
        earliestOpenHour = defaultOpenHour;
        latestCloseHour = defaultCloseHour;
      }

      // Generate slots for the entire day based on the business hours range
      for (let hour = earliestOpenHour; hour < latestCloseHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          slots.push(
            new Date(
              day.getFullYear(),
              day.getMonth(),
              day.getDate(),
              hour,
              minute
            )
          );
        }
      }
    });

    return slots;
  }, [daysToShow, businessHours]);

  // Determinar quantos dias mostrar com base na largura da tela (para mobile)
  const [visibleDays, setVisibleDays] = useState(daysToShow);

  const currentDateTimestamp = currentDate.getTime();

  useEffect(() => {
    // Buscar dados quando currentDate ou view mudarem
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchProfessionals(),
          fetchServices(),
          fetchAppointments(),
          fetchClients(),
          fetchAllAvailability(),
          fetchBusinessHours(),
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    currentDateTimestamp,
    view,
    fetchProfessionals,
    fetchServices,
    fetchAppointments,
    fetchClients,
    fetchAllAvailability,
    fetchBusinessHours,
  ]);

  useEffect(() => {
    // Lidar com resize e atualizar visibleDays conforme necessário
    const handleResize = () => {
      if (window.innerWidth < 640 && view === "week") {
        // Mostrar 4 dias no modo responsivo
        const newVisibleDays = [...weekDays].slice(0, 4);
        setVisibleDays(newVisibleDays);
      } else {
        setVisibleDays(daysToShow);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [view, weekDays, daysToShow]);

  // Manter um estado separado para o índice do primeiro dia visível no modo responsivo
  const [firstVisibleDayIndex, setFirstVisibleDayIndex] = useState(0);

  // Atualizar os dias visíveis quando o índice mudar
  useEffect(() => {
    if (window.innerWidth < 640 && view === "week") {
      // Garantir que o índice não ultrapasse o limite
      const safeIndex = Math.min(firstVisibleDayIndex, 3);
      setVisibleDays(weekDays.slice(safeIndex, safeIndex + 4));
    }
  }, [firstVisibleDayIndex, weekDays, view]);

  const prev = () => {
    if (view === "day") {
      // No modo dia, apenas volta um dia
      setCurrentDate(addDays(currentDate, -1));
    } else if (window.innerWidth < 640) {
      // No modo semana responsivo, navega pelos dias visíveis
      if (firstVisibleDayIndex > 0) {
        // Se ainda há dias anteriores na semana, apenas atualiza o índice
        setFirstVisibleDayIndex(firstVisibleDayIndex - 1);
      } else {
        // Se já estamos no início da semana, vamos para a semana anterior
        setCurrentDate(addDays(currentDate, -7));
        setFirstVisibleDayIndex(3); // Começar do final da nova semana
      }
    } else {
      // No modo semana desktop, volta uma semana inteira
      setCurrentDate(addDays(currentDate, -7));
    }
  };

  const next = () => {
    if (view === "day") {
      // No modo dia, apenas avança um dia
      setCurrentDate(addDays(currentDate, 1));
    } else if (window.innerWidth < 640) {
      // No modo semana responsivo, navega pelos dias visíveis
      if (firstVisibleDayIndex < 3) {
        // Se ainda há dias seguintes na semana, apenas atualiza o índice
        setFirstVisibleDayIndex(firstVisibleDayIndex + 1);
      } else {
        // Se já estamos no final da semana, vamos para a próxima semana
        setCurrentDate(addDays(currentDate, 7));
        setFirstVisibleDayIndex(0); // Começar do início da nova semana
      }
    } else {
      // No modo semana desktop, avança uma semana inteira
      setCurrentDate(addDays(currentDate, 7));
    }
  };

  const today = () => {
    const now = new Date();
    if (!isSameDay(now, currentDate)) {
      setCurrentDate(now);
      // Resetar o índice para mostrar o dia atual
      setFirstVisibleDayIndex(0);
    }
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

  const filteredAppointments = useMemo(() => {
    if (!selectedProfessional) return appointments;
    return appointments.filter(
      (app) => app.professional_id.toString() === selectedProfessional
    );
  }, [appointments, selectedProfessional]);

  // Verificar se há agendamento para um horário e profissional específico
  const getAppointment = useCallback(
    (date: Date, professionalId: string) => {
      return filteredAppointments.find((app) => {
        const appDate = new Date(app.start_time);
        return (
          isSameDay(appDate, date) &&
          appDate.getHours() === date.getHours() &&
          app.professional_id.toString() === professionalId
        );
      });
    },
    [filteredAppointments]
  );

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

  const copyBookingUrl = () => {
    if (businessSubdomain) {
      navigator.clipboard.writeText(`https://${businessSubdomain}`);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 3000);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
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
          <span className="hidden sm:inline-block ml-2 text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">
            {formatDateTitle()}
          </span>
        </div>

        <div className="flex items-center space-x-2">
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

          {/* Desktop view - show avatars and booking button directly */}
          <div className="hidden md:flex md:-space-x-2">
            {/* "All" avatar */}
            <Avatar
              key="all"
              className={cn(
                "h-8 w-8 border-2 border-background cursor-pointer hover:scale-105 transition-transform",
                selectedProfessional === null && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedProfessional(null)}
              style={{
                backgroundColor: "#64748b20", // Neutral color with 20% opacity
              }}
            >
              <AvatarFallback style={{ backgroundColor: "#64748b20" }}>
                All
              </AvatarFallback>
            </Avatar>

            {/* Professional avatars */}
            {professionals.map((professional) => (
              <Avatar
                key={professional.id}
                className={cn(
                  "h-8 w-8 border-2 border-background cursor-pointer hover:scale-105 transition-transform",
                  selectedProfessional === professional.id &&
                    "ring-2 ring-primary"
                )}
                onClick={() =>
                  setSelectedProfessional(
                    selectedProfessional === professional.id
                      ? null
                      : professional.id
                  )
                }
                style={{
                  backgroundColor: `${professional.color}20`,
                }}
              >
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${professional.name}`}
                />
                <AvatarFallback
                  style={{ backgroundColor: `${professional.color}20` }}
                >
                  {professional.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>

          {businessSubdomain && (
            <Button
              className="gap-2 whitespace-nowrap hidden md:flex"
              onClick={copyBookingUrl}
            >
              <ClipboardCopy className="h-4 w-4" />
              URL Agendamento
            </Button>
          )}

          {/* Mobile dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Profissionais</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setSelectedProfessional(null)}
                >
                  <Avatar
                    className={cn(
                      "h-6 w-6 border-2 border-background",
                      selectedProfessional === null && "ring-1 ring-primary"
                    )}
                    style={{ backgroundColor: "#64748b20" }}
                  >
                    <AvatarFallback style={{ backgroundColor: "#64748b20" }}>
                      All
                    </AvatarFallback>
                  </Avatar>
                  <span>Todos</span>
                </DropdownMenuItem>

                {professionals.map((professional) => (
                  <DropdownMenuItem
                    key={professional.id}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() =>
                      setSelectedProfessional(
                        selectedProfessional === professional.id
                          ? null
                          : professional.id
                      )
                    }
                  >
                    <Avatar
                      className={cn(
                        "h-6 w-6 border-2 border-background",
                        selectedProfessional === professional.id &&
                          "ring-1 ring-primary"
                      )}
                      style={{ backgroundColor: `${professional.color}20` }}
                    >
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${professional.name}`}
                      />
                      <AvatarFallback
                        style={{ backgroundColor: `${professional.color}20` }}
                      >
                        {professional.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span>{professional.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>

              {businessSubdomain && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={copyBookingUrl}
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    <span>Copiar URL de Agendamento</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Calendário com layout fixo e scroll único */}
      <div
        ref={calendarContainerRef}
        className="relative rounded-md border overflow-auto max-w-full z-10"
      >
        {/* Cabeçalho com os dias - fixo no topo */}
        <div className="sticky top-0 z-20 flex bg-background border-b">
          {/* Célula vazia no canto superior esquerdo */}
          <div className="flex-shrink-0 w-14 sm:w-20 h-12 border-r bg-background"></div>

          {/* Cabeçalhos dos dias */}
          <div className={`flex flex-grow ${view === "day" ? "" : "divide-x"}`}>
            {visibleDays.map((day, i) => {
              const isOpen = isDayOpen(day);
              return (
                <div
                  key={i}
                  className={`flex-1 flex h-12 flex-col items-center justify-center
                    ${isSameDay(day, new Date()) ? "bg-accent" : ""}
                    ${!isOpen ? "bg-gray-100 text-gray-400" : ""}`}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(day, "EEE", { locale: ptBR })}
                  </span>
                  <span className="text-sm font-semibold">
                    {format(day, "dd")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conteúdo do calendário com grid */}
        <div className="flex relative">
          {/* Coluna de horários - fixa à esquerda */}
          <div className="sticky left-0 flex-shrink-0 w-14 sm:w-20 bg-background z-10">
            {dayHours
              .filter(
                (hour, index, self) =>
                  // Only show each time once in the time column
                  index ===
                  self.findIndex(
                    (h) =>
                      h.getHours() === hour.getHours() &&
                      h.getMinutes() === hour.getMinutes()
                  )
              )
              .sort(
                (a, b) =>
                  a.getHours() * 60 +
                  a.getMinutes() -
                  (b.getHours() * 60 + b.getMinutes())
              )
              .map((hour, i) => (
                <div
                  key={i}
                  className="flex h-12 items-center justify-center border-b border-r text-xs sm:text-sm text-muted-foreground"
                >
                  {format(hour, "HH:mm")}
                </div>
              ))}
          </div>

          {/* Grade principal do calendário */}
          <div className="flex-grow">
            {isLoading ? (
              <div className="flex h-full items-center justify-center min-h-[160px]"></div>
            ) : (
              <>
                <div
                  className={`flex w-full ${view === "day" ? "" : "divide-x"}`}
                >
                  {visibleDays.map((day, dayIndex) => {
                    const isOpen = isDayOpen(day);
                    return (
                      <div
                        key={dayIndex}
                        className={`flex-1 min-w-0 ${
                          !isOpen ? "bg-gray-100" : ""
                        }`}
                      >
                        {isOpen ? (
                          dayHours
                            .filter(
                              (hour) =>
                                hour.getFullYear() === day.getFullYear() &&
                                hour.getMonth() === day.getMonth() &&
                                hour.getDate() === day.getDate()
                            )
                            .map((hour, hourIndex) => {
                              const currentHour = new Date(
                                day.getFullYear(),
                                day.getMonth(),
                                day.getDate(),
                                hour.getHours(),
                                hour.getMinutes()
                              );

                              // Check if this time slot is within business hours
                              const isWithinBusinessHours =
                                isTimeSlotWithinBusinessHours(currentHour);

                              // Get all appointments for this time slot
                              const timeSlotAppointments =
                                filteredAppointments.filter((app) => {
                                  const appDate = new Date(app.start_time);
                                  return (
                                    isSameDay(appDate, currentHour) &&
                                    appDate.getHours() ===
                                      currentHour.getHours() &&
                                    appDate.getMinutes() ===
                                      currentHour.getMinutes()
                                  );
                                });

                              return (
                                <div
                                  key={hourIndex}
                                  className={`group relative h-12 border-b border-dashed border-border ${
                                    !isWithinBusinessHours ? "bg-gray-100" : ""
                                  }`}
                                  onClick={() => {
                                    if (isWithinBusinessHours) {
                                      openAppointmentModal(
                                        currentHour,
                                        selectedProfessional ||
                                          professionals[0]?.id
                                      );
                                    }
                                  }}
                                >
                                  <div className="absolute inset-0 flex flex-col gap-1 p-1">
                                    {timeSlotAppointments.map((appointment) => {
                                      const professional = getProfessional(
                                        appointment.professional_id
                                      );
                                      const startTime = new Date(
                                        appointment.start_time
                                      );
                                      const endTime = new Date(
                                        appointment.end_time
                                      );
                                      const durationInMinutes =
                                        (endTime.getTime() -
                                          startTime.getTime()) /
                                        (1000 * 60);

                                      // Fix the height calculation to account for 15-minute slots
                                      // Each 15-minute slot is 48px tall (h-12 = 48px)
                                      const heightInSlots =
                                        (durationInMinutes / 15) * 48;

                                      // Skip rendering if this isn't the start time slot
                                      if (
                                        startTime.getHours() !==
                                          currentHour.getHours() ||
                                        startTime.getMinutes() !==
                                          currentHour.getMinutes()
                                      ) {
                                        return null;
                                      }

                                      return (
                                        <div
                                          key={appointment.id}
                                          className="absolute left-0 right-0 flex flex-col rounded-md p-1 text-xs text-white cursor-pointer hover:brightness-90 transition-all overflow-hidden"
                                          style={{
                                            backgroundColor:
                                              professional?.color || "#3b82f6",
                                            height: `${heightInSlots}px`,
                                            zIndex: 10,
                                            top: 0,
                                            minHeight: "24px",
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openAppointmentModal(
                                              currentHour,
                                              professional?.id || "",
                                              appointment
                                            );
                                          }}
                                        >
                                          <div className="flex flex-col gap-0.5 min-h-0 h-full">
                                            <div className="flex items-center gap-1 min-w-0">
                                              <span className="font-medium truncate">
                                                {appointment.clients.name}
                                              </span>
                                              <span className="truncate opacity-75">
                                                {appointment.services.name} -{" "}
                                                {format(startTime, "HH:mm")}
                                              </span>
                                            </div>
                                            {heightInSlots >= 32 && (
                                              <>
                                                <span className="text-[10px] opacity-75 whitespace-nowrap">
                                                  {format(startTime, "HH:mm")} -{" "}
                                                  {format(endTime, "HH:mm")}
                                                </span>
                                              </>
                                            )}
                                            {heightInSlots < 32 &&
                                              heightInSlots >= 24 && (
                                                <span className="text-[10px] opacity-75 whitespace-nowrap">
                                                  {format(startTime, "HH:mm")} -{" "}
                                                  {format(endTime, "HH:mm")}
                                                </span>
                                              )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {timeSlotAppointments.length === 0 && (
                                      <div className="absolute inset-0 flex cursor-pointer items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                                        {isWithinBusinessHours && (
                                          <Plus className="h-4 w-4" />
                                        )}
                                        {!isWithinBusinessHours && (
                                          <span className="text-xs text-gray-400">
                                            Fechado
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          <div className="h-24 flex items-center justify-center text-gray-500 text-sm">
                            Fechado
                          </div>
                        )}
                      </div>
                    );
                  })}
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
        onAppointmentCreated={refreshAppointmentsAndAvailability}
        onAppointmentUpdated={refreshAppointmentsAndAvailability}
        professionalsAvailability={professionalsAvailability}
      />

      {showCopyToast && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md">
          URL de agendamento copiado para a área de transferência!
        </div>
      )}
    </div>
  );
}

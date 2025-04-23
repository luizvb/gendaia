"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  addDays,
  format,
  isSameDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  getDay,
  isSameMonth,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ClipboardCopy,
  Menu,
  Calendar,
  Table as TableIcon,
} from "lucide-react";

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
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [displayMode, setDisplayMode] = useState<"calendar" | "grid">(
    "calendar"
  );
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
  // Use useRef to store current services to avoid dependency loops
  const servicesRef = useRef<Service[]>([]);

  // Update servicesRef when services change
  useEffect(() => {
    servicesRef.current = services;
  }, [services]);

  const startOfDay = useCallback((date: Date) => {
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
  }, []);

  // Wrap fetch functions in useCallback to prevent recreation on every render
  const fetchProfessionals = useCallback(async () => {
    try {
      const response = await fetch("/api/professionals");
      if (!response.ok) throw new Error("Falha ao carregar profissionais");
      const data = await response.json();
      setProfessionals(data);
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
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
    }
  }, []);

  const fetchClients = useCallback(async (searchTerm = "") => {
    try {
      let url = "/api/clients";

      if (searchTerm) {
        // If the search term looks like a phone number (contains digits)
        if (/\d/.test(searchTerm)) {
          url = `/api/clients?phone=${encodeURIComponent(searchTerm)}`;
        } else {
          url = `/api/clients?name=${encodeURIComponent(searchTerm)}`;
        }
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Falha ao carregar clientes");
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
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
      // Format dates in UTC for API calls
      let startDate, endDate;

      if (view === "day") {
        startDate = format(startOfDay(currentDate), "yyyy-MM-dd");
        endDate = format(startOfDay(addDays(currentDate, 1)), "yyyy-MM-dd");
      } else if (view === "week") {
        startDate = format(
          startOfDay(startOfWeek(currentDate, { locale: ptBR })),
          "yyyy-MM-dd"
        );
        endDate = format(
          startOfDay(addDays(startOfWeek(currentDate, { locale: ptBR }), 7)),
          "yyyy-MM-dd"
        );
      } else if (view === "month") {
        startDate = format(startOfDay(startOfMonth(currentDate)), "yyyy-MM-dd");
        endDate = format(startOfDay(endOfMonth(currentDate)), "yyyy-MM-dd");
      }

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
    }
  }, [currentDate, view]);

  // New function to fetch availability for all professionals
  const fetchAllAvailability = useCallback(
    async (specificServiceDuration?: number) => {
      try {
        // Use the provided duration or get default from services
        const defaultDuration =
          specificServiceDuration !== undefined
            ? specificServiceDuration
            : servicesRef.current.length > 0
            ? servicesRef.current[0].duration
            : 30;

        // Pass service_duration to the API to properly calculate available time slots
        const response = await fetch(
          `/api/availability?fetch_all=true&service_duration=${defaultDuration}`
        );
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
      }
    },
    []
  );

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
        }
      })();
    },
    [currentDate, view]
  );

  const weekDays = useMemo(() => {
    // Start from Monday of the current week
    const monday = startOfWeek(currentDate, { locale: ptBR, weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(monday, i));
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

  // Filter out closed days from visibleDays
  const filteredDaysToShow = useMemo(() => {
    return daysToShow.filter((day) => isDayOpen(day));
  }, [daysToShow, isDayOpen]);

  // Fix for the appointment display in the calendar
  const renderAppointmentTimes = (appointment: Appointment) => {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);

    return (
      <span className="text-[10px] opacity-75 whitespace-nowrap">
        {format(start, "HH:mm")} - {format(end, "HH:mm")}
      </span>
    );
  };

  // Determinar quantos dias mostrar com base na largura da tela (para mobile)
  const [visibleDays, setVisibleDays] = useState(filteredDaysToShow);

  const currentDateTimestamp = currentDate.getTime();

  // Refresh appointments and availability when date or view changes
  useEffect(() => {
    // Fetch data when currentDate or view change
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
        const newVisibleDays = [...filteredDaysToShow].slice(0, 4);
        setVisibleDays(newVisibleDays);
      } else {
        setVisibleDays(filteredDaysToShow);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [view, weekDays, filteredDaysToShow]);

  // Manter um estado separado para o índice do primeiro dia visível no modo responsivo
  const [firstVisibleDayIndex, setFirstVisibleDayIndex] = useState(0);

  // Atualizar os dias visíveis quando o índice mudar
  useEffect(() => {
    if (window.innerWidth < 640 && view === "week") {
      // Garantir que o índice não ultrapasse o limite
      const maxIndex = Math.max(0, filteredDaysToShow.length - 4);
      const safeIndex = Math.min(firstVisibleDayIndex, maxIndex);
      setVisibleDays(filteredDaysToShow.slice(safeIndex, safeIndex + 4));
    }
  }, [firstVisibleDayIndex, filteredDaysToShow, view]);

  const prev = () => {
    if (view === "day") {
      // No modo dia, encontrar o dia anterior que está aberto
      let prevDay = addDays(currentDate, -1);
      while (!isDayOpen(prevDay)) {
        prevDay = addDays(prevDay, -1);
      }
      setCurrentDate(prevDay);
    } else if (view === "month") {
      // No modo mês, volta um mês inteiro
      setCurrentDate(addMonths(currentDate, -1));
    } else if (window.innerWidth < 640) {
      // No modo semana responsivo, navega pelos dias visíveis
      if (firstVisibleDayIndex > 0) {
        // Se ainda há dias anteriores na semana, apenas atualiza o índice
        setFirstVisibleDayIndex(firstVisibleDayIndex - 1);
      } else {
        // Se já estamos no início da semana, vamos para a semana anterior
        setCurrentDate(addDays(currentDate, -7));
        setFirstVisibleDayIndex(Math.max(0, filteredDaysToShow.length - 4));
      }
    } else {
      // No modo semana desktop, volta uma semana inteira
      setCurrentDate(addDays(currentDate, -7));
    }
  };

  const next = () => {
    if (view === "day") {
      // No modo dia, encontrar o próximo dia que está aberto
      let nextDay = addDays(currentDate, 1);
      while (!isDayOpen(nextDay)) {
        nextDay = addDays(nextDay, 1);
      }
      setCurrentDate(nextDay);
    } else if (view === "month") {
      // No modo mês, avança um mês inteiro
      setCurrentDate(addMonths(currentDate, 1));
    } else if (window.innerWidth < 640) {
      // No modo semana responsivo, navega pelos dias visíveis
      if (firstVisibleDayIndex < Math.max(0, filteredDaysToShow.length - 4)) {
        // Se ainda há dias seguintes na semana, apenas atualiza o índice
        setFirstVisibleDayIndex(firstVisibleDayIndex + 1);
      } else {
        // Se já estamos no final da semana, vamos para a próxima semana
        setCurrentDate(addDays(currentDate, 7));
        setFirstVisibleDayIndex(0);
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

  // Filter appointments based on selected professional
  const filteredAppointments = useMemo(() => {
    if (!selectedProfessional) return appointments;
    return appointments.filter(
      (app) => app.professional_id.toString() === selectedProfessional
    );
  }, [appointments, selectedProfessional]);

  // Check if a time slot has any appointments that overlap with it
  const getTimeSlotAppointments = useCallback(
    (currentHour: Date) => {
      return filteredAppointments.filter((app) => {
        // Convert appointment time to local time representation
        const appStartTime = new Date(app.start_time);
        const appEndTime = new Date(app.end_time);

        // Um slot tem um agendamento se:
        // 1. O slot começa no mesmo horário que o agendamento
        // 2. O slot está dentro do período de um agendamento (excluindo exatamente o horário final)
        return (
          isSameDay(appStartTime, currentHour) &&
          // É o início do agendamento
          ((appStartTime.getHours() === currentHour.getHours() &&
            appStartTime.getMinutes() === currentHour.getMinutes()) ||
            // Está dentro do período do agendamento (mas não exatamente no final)
            (appStartTime < currentHour && appEndTime > currentHour))
        );
      });
    },
    [filteredAppointments]
  );

  // Gerar os horários do dia com base nos horários de funcionamento
  const dayHours = useMemo(() => {
    const slots: Date[] = [];

    // Default business hours if none are configured
    const defaultOpenHour = 9;
    const defaultCloseHour = 19;

    // For each day in the view
    daysToShow.forEach((day) => {
      // Find the earliest open time and latest close time across all days
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

  // Check if a slot is unavailable for the selected professional(s)
  const isSlotUnavailable = useCallback(
    (date: Date, professionalId: string | null) => {
      // Check if the date is in the past
      const isPastDate = date < startOfDay(new Date());

      // If there are appointments for this slot, don't mark as unavailable even if it's past
      const existingAppointments = getTimeSlotAppointments(date);
      if (existingAppointments.length > 0) {
        return false;
      }

      // Mark past dates without appointments as unavailable
      if (isPastDate) {
        return true;
      }

      const formattedDate = format(date, "yyyy-MM-dd");
      const formattedTime = format(date, "HH:mm");

      if (professionalId) {
        // Check for specific professional
        return (
          professionalsAvailability[professionalId] &&
          professionalsAvailability[professionalId][formattedDate] &&
          !professionalsAvailability[professionalId][formattedDate].includes(
            formattedTime
          )
        );
      } else if (professionals.length > 0) {
        // No professional selected, check if unavailable for all professionals
        return professionals.every((prof) => {
          const profId = prof.id;
          return (
            professionalsAvailability[profId] &&
            professionalsAvailability[profId][formattedDate] &&
            !professionalsAvailability[profId][formattedDate].includes(
              formattedTime
            )
          );
        });
      }

      return false;
    },
    [professionalsAvailability, professionals, getTimeSlotAppointments]
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
    } else if (view === "month") {
      return format(currentDate, "MMMM yyyy", { locale: ptBR });
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

  // Generate days for month view
  const monthDays = useMemo(() => {
    if (view !== "month") return [];

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: ptBR });

    const days = [];
    let day = startDate;

    while (day <= monthEnd || days.length % 7 !== 0) {
      days.push(day);
      day = addDays(day, 1);

      // Ensure we don't generate too many days
      if (days.length > 42) break;
    }

    return days;
  }, [currentDate, view]);

  // Get appointments for a specific day in month view
  const getDayAppointments = useCallback(
    (date: Date) => {
      return appointments.filter((app) => {
        const appStart = new Date(app.start_time);
        return isSameDay(date, appStart);
      });
    },
    [appointments]
  );

  // Get appointments for the selected period formatted for the grid view
  const gridViewAppointments = useMemo(() => {
    if (displayMode !== "grid") return [];

    let filteredApps = appointments;

    // Filter by professional if one is selected
    if (selectedProfessional) {
      filteredApps = filteredApps.filter(
        (app) => app.professional_id.toString() === selectedProfessional
      );
    }

    // Filter by current view (day, week, month)
    filteredApps = filteredApps.filter((app) => {
      const appDate = new Date(app.start_time);

      if (view === "day") {
        return isSameDay(appDate, currentDate);
      } else if (view === "week") {
        // Check if the appointment is within the current week
        const startOfCurrentWeek = startOfWeek(currentDate, { locale: ptBR });
        const endOfCurrentWeek = addDays(startOfCurrentWeek, 6);
        return appDate >= startOfCurrentWeek && appDate <= endOfCurrentWeek;
      } else if (view === "month") {
        // Check if the appointment is within the current month
        const startOfCurrentMonth = startOfMonth(currentDate);
        const endOfCurrentMonth = endOfMonth(currentDate);
        return appDate >= startOfCurrentMonth && appDate <= endOfCurrentMonth;
      }

      return true;
    });

    // Sort by date and time
    return filteredApps.sort((a, b) => {
      const aDate = new Date(a.start_time);
      const bDate = new Date(b.start_time);
      return aDate.getTime() - bDate.getTime();
    });
  }, [appointments, selectedProfessional, displayMode, view, currentDate]);

  // Group appointments for the weekly grid view in client-centric approach
  const weeklyGridAppointments = useMemo(() => {
    if (displayMode !== "grid" || view !== "week")
      return {
        clients: [] as {
          id: number;
          name: string;
          appointments: Record<number, Appointment[]>; // dayIdx -> appointments
        }[],
        weekDates: [] as Date[],
      };

    // Get the start of the week (Monday)
    const weekStart = startOfWeek(currentDate, {
      locale: ptBR,
      weekStartsOn: 1,
    });

    // Generate dates for the 7 days of the week (Monday to Sunday)
    const weekDates = Array.from({ length: 7 }).map((_, i) =>
      addDays(weekStart, i)
    );

    // Filter days based on business hours
    const openDays = weekDates.filter((date) => isDayOpen(date));

    // Filter appointments based on selected professional
    let filteredAppointments = appointments;
    if (selectedProfessional) {
      filteredAppointments = appointments.filter(
        (app) => app.professional_id.toString() === selectedProfessional
      );
    }

    // Filter appointments to only those within the current week
    filteredAppointments = filteredAppointments.filter((app) => {
      const appDate = new Date(app.start_time);
      // Check if appointment is within any of our open days
      return openDays.some((date) => isSameDay(date, appDate));
    });

    // Group appointments by client
    const clientMap = new Map<
      number,
      {
        id: number;
        name: string;
        appointments: Record<number, Appointment[]>;
      }
    >();

    // Process each appointment
    filteredAppointments.forEach((app) => {
      const appDate = new Date(app.start_time);

      // Find which day of the week this appointment is for
      const dayIdx = openDays.findIndex((date) => isSameDay(date, appDate));

      if (dayIdx >= 0) {
        // Get or create client entry
        const clientId = app.client_id;
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            id: clientId,
            name: app.clients.name,
            appointments: {},
          });
        }

        // Add appointment to client's record
        const clientData = clientMap.get(clientId)!;
        if (!clientData.appointments[dayIdx]) {
          clientData.appointments[dayIdx] = [];
        }
        clientData.appointments[dayIdx].push(app);
      }
    });

    // Convert map to array and sort by client name
    const clientsArray = Array.from(clientMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return {
      clients: clientsArray,
      weekDates: openDays,
    };
  }, [
    appointments,
    currentDate,
    displayMode,
    view,
    isDayOpen,
    selectedProfessional,
  ]);

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
            onValueChange={(v) => setView(v as "day" | "week" | "month")}
            className="flex-shrink-0"
          >
            <TabsList>
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex border rounded-md bg-muted p-1 md:flex hidden">
            <Button
              variant="ghost"
              size="sm"
              className={`px-2.5 py-1.5 h-8 ${
                displayMode === "calendar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => setDisplayMode("calendar")}
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`px-2.5 py-1.5 h-8 ${
                displayMode === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => setDisplayMode("grid")}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>

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

      {/* Grid View */}
      {displayMode === "grid" ? (
        <div className="relative rounded-md border overflow-auto max-w-full z-10">
          {view === "week" ? (
            // Weekly grid view with client-centric approach
            <table className="w-full caption-bottom text-sm border-collapse">
              <thead className="bg-background sticky top-0 z-10">
                <tr className="border-b transition-colors">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground border">
                    Cliente
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground border">
                    Serviço
                  </th>
                  {weeklyGridAppointments.weekDates.map(
                    (date: Date, index: number) => (
                      <th
                        key={index}
                        className="h-12 px-4 text-left align-middle font-medium text-muted-foreground border"
                      >
                        <div className="flex flex-col items-center">
                          <span>{format(date, "EEEE", { locale: ptBR })}</span>
                          <span className="text-xs">
                            {format(date, "dd", { locale: ptBR })}
                          </span>
                        </div>
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {weeklyGridAppointments.clients.length === 0 ? (
                  <tr className="border-b transition-colors">
                    <td
                      className="p-4 align-middle text-center border"
                      colSpan={2 + weeklyGridAppointments.weekDates.length}
                    >
                      Nenhum agendamento encontrado para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  weeklyGridAppointments.clients.map((client) => {
                    // Determine unique services and times for this client
                    const allAppointments: Appointment[] = [];
                    Object.values(client.appointments).forEach((dayApps) => {
                      allAppointments.push(...dayApps);
                    });

                    // Sort appointments by time for consistent display
                    allAppointments.sort((a, b) => {
                      return (
                        new Date(a.start_time).getTime() -
                        new Date(b.start_time).getTime()
                      );
                    });

                    // Get first appointment's service for display
                    const firstApp = allAppointments[0];
                    const serviceName = firstApp?.services.name || "";

                    return (
                      <tr
                        key={client.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="p-4 align-middle border font-medium">
                          {client.name}
                        </td>
                        <td className="p-4 align-middle border">
                          {serviceName}
                        </td>

                        {weeklyGridAppointments.weekDates.map(
                          (date: Date, dayIdx: number) => {
                            const dayApps = client.appointments[dayIdx] || [];

                            return (
                              <td
                                key={dayIdx}
                                className="p-0 align-middle border"
                              >
                                {dayApps.map((app, index) => {
                                  const professional = getProfessional(
                                    app.professional_id
                                  );
                                  const appTime = format(
                                    new Date(app.start_time),
                                    "HH:mm"
                                  );

                                  return (
                                    <div
                                      key={app.id}
                                      className={`flex items-center gap-2 p-3 cursor-pointer hover:bg-muted transition-colors ${
                                        index < dayApps.length - 1
                                          ? "border-b"
                                          : ""
                                      }`}
                                      onClick={() =>
                                        openAppointmentModal(
                                          new Date(app.start_time),
                                          professional?.id || "",
                                          app
                                        )
                                      }
                                    >
                                      <div className="flex items-center gap-2">
                                        <Avatar
                                          className="h-6 w-6"
                                          style={{
                                            backgroundColor: `${
                                              professional?.color || "#3b82f6"
                                            }20`,
                                          }}
                                        >
                                          <AvatarFallback
                                            style={{
                                              backgroundColor: `${
                                                professional?.color || "#3b82f6"
                                              }20`,
                                            }}
                                          >
                                            {professional?.name
                                              ? professional.name
                                                  .split(" ")
                                                  .map((n) => n[0])
                                                  .join("")
                                              : ""}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div>{professional?.name}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {appTime}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </td>
                            );
                          }
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            // Standard list view for day and month views
            <table className="w-full caption-bottom text-sm">
              <thead className="bg-background sticky top-0 z-10">
                <tr className="border-b transition-colors">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Cliente
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Serviço
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Horário
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Profissional
                  </th>
                </tr>
              </thead>
              <tbody>
                {gridViewAppointments.length === 0 ? (
                  <tr className="border-b transition-colors">
                    <td className="p-4 align-middle text-center" colSpan={5}>
                      Nenhum agendamento encontrado para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  gridViewAppointments.map((appointment) => {
                    const professional = getProfessional(
                      appointment.professional_id
                    );
                    const startTime = new Date(appointment.start_time);
                    const endTime = new Date(appointment.end_time);
                    const service = services.find(
                      (s) => s.id === appointment.service_id.toString()
                    );

                    return (
                      <tr
                        key={appointment.id}
                        className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                        onClick={() =>
                          openAppointmentModal(
                            startTime,
                            professional?.id || "",
                            appointment
                          )
                        }
                      >
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {appointment.clients.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          {appointment.services.name}
                        </td>
                        <td className="p-4 align-middle whitespace-nowrap">
                          {format(startTime, "HH:mm")} -{" "}
                          {format(endTime, "HH:mm")}
                        </td>
                        <td className="p-4 align-middle whitespace-nowrap">
                          {format(startTime, "dd/MM/yyyy")}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <Avatar
                              className="h-8 w-8"
                              style={{
                                backgroundColor: `${
                                  professional?.color || "#3b82f6"
                                }20`,
                              }}
                            >
                              <AvatarImage
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${
                                  professional?.name || ""
                                }`}
                              />
                              <AvatarFallback
                                style={{
                                  backgroundColor: `${
                                    professional?.color || "#3b82f6"
                                  }20`,
                                }}
                              >
                                {professional?.name
                                  ? professional.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                  : ""}
                              </AvatarFallback>
                            </Avatar>
                            <span>{professional?.name}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <>
          {/* Calendário com layout fixo e scroll único */}
          <div
            ref={calendarContainerRef}
            className="relative rounded-md border overflow-auto max-w-full z-10"
          >
            {view === "month" ? (
              <div className="bg-background">
                {/* Month view */}
                <div className="grid grid-cols-7 border-b">
                  {/* Weekday headers */}
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                    (day, i) => (
                      <div
                        key={i}
                        className="h-10 flex items-center justify-center text-xs font-medium text-muted-foreground"
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>

                <div className="grid grid-cols-7 divide-y divide-x">
                  {monthDays.map((day, i) => {
                    const dayAppointments = getDayAppointments(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentDate);

                    return (
                      <div
                        key={i}
                        className={cn(
                          "min-h-[100px] p-1 relative cursor-pointer",
                          isToday && "bg-accent",
                          !isCurrentMonth && "opacity-40",
                          isCurrentMonth && "hover:bg-accent/50"
                        )}
                        onClick={() => {
                          setCurrentDate(day);
                          setView("day");
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isToday && "text-primary"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                        </div>
                        <div className="mt-1 max-h-[80px] overflow-y-auto space-y-1 text-xs">
                          {dayAppointments.slice(0, 3).map((app) => {
                            const professional = getProfessional(
                              app.professional_id
                            );
                            return (
                              <div
                                key={app.id}
                                className="px-1 py-0.5 rounded text-white text-xs truncate flex items-center"
                                style={{
                                  backgroundColor:
                                    professional?.color || "#3b82f6",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAppointmentModal(
                                    new Date(app.start_time),
                                    professional?.id || "",
                                    app
                                  );
                                }}
                              >
                                <span className="truncate">
                                  {format(new Date(app.start_time), "HH:mm")} -{" "}
                                  {app.clients.name}
                                </span>
                              </div>
                            );
                          })}
                          {dayAppointments.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{dayAppointments.length - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Cabeçalho com os dias - fixo no topo */}
                <div className="sticky top-0 z-20 flex bg-background border-b">
                  {/* Célula vazia no canto superior esquerdo */}
                  <div className="flex-shrink-0 w-14 sm:w-20 h-12 border-r bg-background"></div>

                  {/* Cabeçalhos dos dias */}
                  <div
                    className={`flex flex-grow ${
                      view === "day" ? "" : "divide-x"
                    }`}
                  >
                    {visibleDays.map((day, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 flex h-12 flex-col items-center justify-center",
                          isSameDay(day, new Date()) && "bg-accent"
                        )}
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
                          className={`flex w-full ${
                            view === "day" ? "" : "divide-x"
                          }`}
                        >
                          {visibleDays.map((day, dayIndex) => (
                            <div key={dayIndex} className="flex-1 min-w-0">
                              {dayHours
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

                                  // Get all appointments for this time slot
                                  const timeSlotAppointments =
                                    getTimeSlotAppointments(currentHour);

                                  return (
                                    <div
                                      key={hourIndex}
                                      className="group relative h-12 border-b border-dashed border-border cursor-pointer"
                                      onClick={() => {
                                        // Only open modal if slot is available
                                        if (
                                          !isSlotUnavailable(
                                            currentHour,
                                            selectedProfessional
                                          )
                                        ) {
                                          openAppointmentModal(
                                            currentHour,
                                            selectedProfessional ||
                                              professionals[0]?.id
                                          );
                                        }
                                      }}
                                    >
                                      {/* Show unavailable overlay if the slot is unavailable */}
                                      {isSlotUnavailable(
                                        currentHour,
                                        selectedProfessional
                                      ) && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200/30 text-black/20 text-xs font-medium z-30">
                                          {/* Horário indisponível */}
                                        </div>
                                      )}

                                      {/* Remover o debug de tempo para produção */}
                                      <div className="absolute inset-0 flex flex-col gap-1 p-1">
                                        {(() => {
                                          // Group appointments by professional to handle overlaps
                                          const appointmentsByProfessional =
                                            timeSlotAppointments.reduce(
                                              (acc, appointment) => {
                                                const profId =
                                                  appointment.professional_id.toString();
                                                if (!acc[profId])
                                                  acc[profId] = [];
                                                acc[profId].push(appointment);
                                                return acc;
                                              },
                                              {} as Record<
                                                string,
                                                Appointment[]
                                              >
                                            );

                                          const professionalIds = Object.keys(
                                            appointmentsByProfessional
                                          );
                                          const totalProfessionals =
                                            professionalIds.length;

                                          return timeSlotAppointments.map(
                                            (appointment, index) => {
                                              const professional =
                                                getProfessional(
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

                                              // Calculate height based on duration
                                              const heightInSlots =
                                                (durationInMinutes / 15) * 48;

                                              // Only render the appointment at its start time slot
                                              if (
                                                startTime.getHours() !==
                                                  currentHour.getHours() ||
                                                startTime.getMinutes() !==
                                                  currentHour.getMinutes()
                                              ) {
                                                return null;
                                              }

                                              // Calculate position for side-by-side display
                                              const profIndex =
                                                professionalIds.findIndex(
                                                  (id) =>
                                                    id ===
                                                    appointment.professional_id.toString()
                                                );
                                              const width =
                                                totalProfessionals > 1
                                                  ? `${
                                                      100 / totalProfessionals
                                                    }%`
                                                  : "100%";
                                              const left =
                                                totalProfessionals > 1
                                                  ? `${
                                                      (profIndex * 100) /
                                                      totalProfessionals
                                                    }%`
                                                  : "0";

                                              return (
                                                <div
                                                  key={appointment.id}
                                                  className="absolute flex flex-col rounded-md p-1 text-xs text-white cursor-pointer hover:brightness-90 transition-all overflow-hidden"
                                                  style={{
                                                    backgroundColor:
                                                      professional?.color ||
                                                      "#3b82f6",
                                                    height: `${heightInSlots}px`,
                                                    zIndex: 10,
                                                    top: 0,
                                                    minHeight: "24px",
                                                    width,
                                                    left,
                                                    right:
                                                      totalProfessionals > 1
                                                        ? "auto"
                                                        : 0,
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
                                                  <div className="flex flex-col justify-between min-h-0 h-full">
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                      <div className="flex items-center justify-between">
                                                        <span className="font-medium truncate">
                                                          {
                                                            appointment.clients
                                                              .name
                                                          }
                                                        </span>
                                                        {renderAppointmentTimes(
                                                          appointment
                                                        )}
                                                      </div>

                                                      {/* Show service name if height allows */}
                                                      {heightInSlots >= 30 && (
                                                        <div className="flex items-center gap-1">
                                                          <span className="truncate font-medium opacity-90">
                                                            {
                                                              appointment
                                                                .services.name
                                                            }
                                                          </span>
                                                        </div>
                                                      )}

                                                      {/* Show professional name if height allows */}
                                                      {heightInSlots >= 45 &&
                                                        professional && (
                                                          <div className="flex items-center gap-1 mt-1 text-[10px]">
                                                            <span className="opacity-80">
                                                              Profissional:{" "}
                                                              {
                                                                professional.name
                                                              }
                                                            </span>
                                                          </div>
                                                        )}

                                                      {/* Show client phone if we have it and height allows */}
                                                      {heightInSlots >= 60 && (
                                                        <div className="flex items-center gap-1 text-[10px]">
                                                          {clients.find(
                                                            (c) =>
                                                              c.id ===
                                                              appointment.client_id
                                                          )?.phone && (
                                                            <span className="opacity-80">
                                                              Celular:{" "}
                                                              {
                                                                clients.find(
                                                                  (c) =>
                                                                    c.id ===
                                                                    appointment.client_id
                                                                )?.phone
                                                              }
                                                            </span>
                                                          )}
                                                        </div>
                                                      )}

                                                      {/* Show service details if height allows */}
                                                      {heightInSlots >= 75 && (
                                                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                                                          {services.find(
                                                            (s) =>
                                                              s.id ===
                                                              appointment.service_id.toString()
                                                          )?.duration && (
                                                            <span className="opacity-80">
                                                              Duração:{" "}
                                                              {
                                                                services.find(
                                                                  (s) =>
                                                                    s.id ===
                                                                    appointment.service_id.toString()
                                                                )?.duration
                                                              }
                                                              min
                                                            </span>
                                                          )}
                                                          {services.find(
                                                            (s) =>
                                                              s.id ===
                                                              appointment.service_id.toString()
                                                          )?.price && (
                                                            <span className="opacity-80">
                                                              R${" "}
                                                              {services
                                                                .find(
                                                                  (s) =>
                                                                    s.id ===
                                                                    appointment.service_id.toString()
                                                                )
                                                                ?.price.toFixed(
                                                                  2
                                                                )}
                                                            </span>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            }
                                          );
                                        })()}
                                        {timeSlotAppointments.length === 0 && (
                                          <div className="absolute inset-0 flex cursor-pointer items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                                            <Plus className="h-4 w-4" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAppointment(null);
          setSelectedSlot(null);

          // Reset to default service duration when modal closes
          fetchAllAvailability(30);
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
        onServiceSelected={(duration) => fetchAllAvailability(duration)}
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

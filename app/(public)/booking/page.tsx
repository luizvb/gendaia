"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Phone, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/utils";

// Constante para o nome da chave no localStorage
const PHONE_STORAGE_KEY = "barbershop_user_phone";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface Professional {
  id: string;
  name: string;
  color: string;
  business_id: string;
}

export default function BookingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("new");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string>("");
  const [service, setService] = useState<string>("");
  const [professional, setProfessional] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [professionalsAvailability, setProfessionalsAvailability] = useState<{
    [professionalId: string]: {
      [date: string]: string[];
    };
  }>({});

  // Helper function to create headers with businessId
  const createHeaders = () => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (business?.id) {
      headers["X-Business-ID"] = business.id;
    }

    return headers;
  };

  // Carregar telefone do localStorage ao iniciar
  useEffect(() => {
    const savedPhone = localStorage.getItem(PHONE_STORAGE_KEY);
    if (savedPhone) {
      setPhone(formatPhoneNumber(savedPhone));
      if (activeTab === "view" && business?.id) {
        fetchAppointments(normalizePhoneNumber(savedPhone));
      }
    }
  }, [activeTab, business]);

  // Fetch all availability data
  const fetchAllAvailability = async () => {
    if (!business?.id) return;

    try {
      const response = await fetch("/api/availability?fetch_all=true", {
        headers: createHeaders(),
      });
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
      setError("Não foi possível carregar os horários disponíveis");
    }
  };

  // Gerar horários disponíveis
  useEffect(() => {
    if (professional && date && service && business?.id) {
      generateTimeSlots();
    } else {
      setTimeSlots([]);
    }
  }, [date, professional, service, business]);

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        setIsLoading(true);

        // Get full hostname and extract subdomain
        const hostname = window.location.hostname;
        console.log("Hostname:", hostname);

        // Check URL params first
        const urlParams = new URLSearchParams(window.location.search);
        const businessParam = urlParams.get("business");

        // Use business param from URL if available, otherwise use hostname
        const queryParam = businessParam || hostname;
        console.log("Using query param:", queryParam);

        // Fetch business data by hostname
        const response = await fetch(
          `/api/businesses/by-subdomain?subdomain=${encodeURIComponent(
            queryParam
          )}`
        );

        if (!response.ok) {
          throw new Error("Failed to load business data");
        }

        const businessData = await response.json();
        setBusiness(businessData);

        // Now fetch other data needed for booking using the business ID
        await fetchData(businessData.id);

        // After business data and initial data are loaded, fetch availability
        await fetchAllAvailability();

        // Check if we need to load appointments
        const savedPhone = localStorage.getItem(PHONE_STORAGE_KEY);
        if (savedPhone && activeTab === "view") {
          fetchAppointments(normalizePhoneNumber(savedPhone));
        }
      } catch (err) {
        console.error("Error fetching business:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessData();
  }, []);

  const fetchData = async (businessId: string) => {
    try {
      // Set business ID in headers
      const headers = {
        "Content-Type": "application/json",
        "X-Business-ID": businessId,
      };

      // Fetch professionals
      const professionalsResponse = await fetch("/api/professionals", {
        headers,
      });
      if (!professionalsResponse.ok)
        throw new Error("Failed to load professionals");
      const professionalsData = await professionalsResponse.json();
      setProfessionals(professionalsData);

      // Fetch services
      const servicesResponse = await fetch("/api/services", { headers });
      if (!servicesResponse.ok) throw new Error("Failed to load services");
      const servicesData = await servicesResponse.json();
      setServices(servicesData);

      // Set initial professional if available
      if (professionalsData.length > 0) {
        setProfessional(professionalsData[0].id);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const generateTimeSlots = async () => {
    if (!date || !professional || !service) {
      setTimeSlots([]);
      return;
    }

    try {
      const selectedService = services.find((s) => s.id === service);
      if (!selectedService) {
        setTimeSlots([]);
        return;
      }

      // Format date for lookup in the availability map
      const formattedDate = format(date, "yyyy-MM-dd");

      // Check if we have availability data for this professional and date
      if (
        !professionalsAvailability[professional] ||
        !professionalsAvailability[professional][formattedDate]
      ) {
        // If we don't have data, fetch it
        await fetchAllAvailability();

        // If still no data, return empty slots
        if (
          !professionalsAvailability[professional] ||
          !professionalsAvailability[professional][formattedDate]
        ) {
          setTimeSlots([]);
          return;
        }
      }

      // Get available slots directly from the map without timezone conversion
      const availableSlots =
        professionalsAvailability[professional][formattedDate];

      // Sort slots by time
      const sortedSlots = [...availableSlots].sort();

      setTimeSlots(sortedSlots);
    } catch (error) {
      console.error("Erro ao buscar horários disponíveis:", error);
      setError("Não foi possível carregar os horários disponíveis");
      setTimeSlots([]);
    }
  };

  const fetchAppointments = async (phoneNumber: string) => {
    if (!phoneNumber || !business?.id) return;

    // Ensure the phone number is normalized
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    setLoadingAppointments(true);
    try {
      const response = await fetch(
        `/api/appointments?phone=${encodeURIComponent(normalizedPhone)}`,
        { headers: createHeaders() }
      );
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      setError(
        "Não foi possível carregar seus agendamentos. Tente novamente mais tarde."
      );
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Normalize phone before saving to storage
    const normalizedPhone = normalizePhoneNumber(phone);

    // Salvar telefone no localStorage
    localStorage.setItem(PHONE_STORAGE_KEY, normalizedPhone);

    try {
      // Verificar se todos os campos estão preenchidos
      if (!name || !phone || !date || !time || !service || !professional) {
        throw new Error("Por favor, preencha todos os campos.");
      }

      // Criar objeto de data/hora para o agendamento
      const selectedService = services.find((s) => s.id === service);
      const duration = selectedService?.duration || 30;

      // Parse the selected time
      const [hours, minutes] = time.split(":").map(Number);

      // Create a date with the selected time in local timezone
      const localDate = new Date(date);
      localDate.setHours(hours, minutes, 0, 0);

      // Format in ISO
      const startTimeISO = localDate.toISOString();

      // Calculate end time by adding duration
      const endTime = new Date(localDate);
      endTime.setMinutes(endTime.getMinutes() + duration);
      const endTimeISO = endTime.toISOString();

      // Enviar agendamento para a API
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: createHeaders(),
        body: JSON.stringify({
          client_name: name,
          client_phone: normalizedPhone,
          start_time: startTimeISO,
          end_time: endTimeISO,
          professional_id: professional,
          service_id: service,
          status: "scheduled",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar agendamento");
      }

      setSuccess("Agendamento realizado com sucesso!");

      // Limpar formulário
      setDate(new Date());
      setTime("");
      setService("");
      setProfessional("");

      // Mudar para a aba de visualização após alguns segundos
      setTimeout(() => {
        setActiveTab("view");
        fetchAppointments(normalizedPhone);
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao agendar:", error);
      setError(
        error.message ||
          "Erro ao criar agendamento. Tente novamente mais tarde."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewAppointments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError(
        "Por favor, informe seu telefone para visualizar os agendamentos."
      );
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    localStorage.setItem(PHONE_STORAGE_KEY, normalizedPhone);
    fetchAppointments(normalizedPhone);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) {
      return;
    }

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
        headers: createHeaders(),
      });

      if (!response.ok) {
        throw new Error("Erro ao cancelar agendamento");
      }

      // Atualizar lista de agendamentos
      fetchAppointments(phone);
      setSuccess("Agendamento cancelado com sucesso!");
    } catch (error) {
      console.error("Erro ao cancelar agendamento:", error);
      setError(
        "Não foi possível cancelar o agendamento. Tente novamente mais tarde."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-destructive/10 p-4 rounded-md">
          <h2 className="text-lg font-semibold text-destructive">Erro</h2>
          <p>{error || "Negócio não encontrado"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{business.name} - Agendamento</h1>
        <p className="text-muted-foreground">
          Agende seu horário ou consulte seus agendamentos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new">Novo Agendamento</TabsTrigger>
          <TabsTrigger value="view">Meus Agendamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Agendar Horário</CardTitle>
              <CardDescription>
                Preencha os dados abaixo para agendar seu horário
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <div className="flex items-center rounded-md border px-3">
                      <User className="mr-2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="flex items-center rounded-md border px-3">
                      <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) =>
                          setPhone(formatPhoneNumber(e.target.value))
                        }
                        placeholder="+55 (11) 99999-9999"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">Serviço</Label>
                  <Select value={service} onValueChange={setService}>
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - {service.duration} min - R${" "}
                          {service.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="professional">Profissional</Label>
                  <Select value={professional} onValueChange={setProfessional}>
                    <SelectTrigger id="professional">
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map((professional) => (
                        <SelectItem
                          key={professional.id}
                          value={professional.id}
                        >
                          {professional.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {date
                            ? format(date, "dd 'de' MMMM, yyyy", {
                                locale: ptBR,
                              })
                            : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          locale={ptBR}
                          disabled={(date) =>
                            date < new Date() || date > addDays(new Date(), 30)
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Horário</Label>
                    <Select
                      value={time}
                      onValueChange={setTime}
                      disabled={!timeSlots.length}
                    >
                      <SelectTrigger id="time">
                        <SelectValue
                          placeholder={
                            timeSlots.length
                              ? "Selecione um horário"
                              : "Selecione data, serviço e profissional"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Agendando..." : "Agendar Horário"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>Meus Agendamentos</CardTitle>
              <CardDescription>
                Visualize e gerencie seus agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center rounded-md border px-3">
                      <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={phone}
                        onChange={(e) =>
                          setPhone(formatPhoneNumber(e.target.value))
                        }
                        placeholder="+55 (11) 99999-9999"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleViewAppointments}
                    disabled={loadingAppointments}
                  >
                    {loadingAppointments ? "Buscando..." : "Buscar"}
                  </Button>
                </div>

                {appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <Card key={appointment.id} className="overflow-hidden">
                        <div className="bg-primary/10 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                {appointment.services.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {format(
                                  new Date(appointment.start_time),
                                  "dd 'de' MMMM, yyyy",
                                  { locale: ptBR }
                                )}{" "}
                                às{" "}
                                {format(
                                  new Date(appointment.start_time),
                                  "HH:mm"
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                {appointment.status === "scheduled"
                                  ? "Agendado"
                                  : appointment.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm">
                                <span className="font-medium">
                                  Profissional:
                                </span>{" "}
                                {appointment.professionals.name}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Duração:</span>{" "}
                                {appointment.services.duration} minutos
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() =>
                                handleCancelAppointment(appointment.id)
                              }
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <h3 className="font-medium">
                      Nenhum agendamento encontrado
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {phone
                        ? "Você não possui agendamentos com este telefone."
                        : "Informe seu telefone para visualizar seus agendamentos."}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setActiveTab("new")}
                    >
                      Fazer um agendamento
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

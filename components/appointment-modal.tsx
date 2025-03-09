"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Client {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

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

interface Appointment {
  id: number;
  start_time: string;
  end_time: string;
  client_id: number;
  professional_id: number;
  service_id: number;
  clients: {
    name: string;
    phone?: string;
  };
  services: {
    name: string;
  };
  notes?: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: {
    date: Date;
    professionalId: string;
  } | null;
  selectedAppointment: Appointment | null;
  professionals: Professional[];
  services: Service[];
  clients: Client[];
  onClientSearch: (searchTerm: string) => void;
  onClientCreated?: (client: Client) => void;
  onAppointmentCreated?: () => void;
  onAppointmentUpdated?: () => void;
}

export function AppointmentModal({
  isOpen,
  onClose,
  selectedSlot,
  selectedAppointment,
  professionals,
  services = [],
  clients = [],
  onClientSearch,
  onClientCreated,
  onAppointmentCreated,
  onAppointmentUpdated,
}: AppointmentModalProps) {
  const [date, setDate] = useState<Date | undefined>(
    selectedSlot ? selectedSlot.date : new Date()
  );
  const [time, setTime] = useState(
    selectedSlot ? format(selectedSlot.date, "HH:mm") : "09:00"
  );
  const [professionalId, setProfessionalId] = useState<string>(
    selectedSlot ? selectedSlot.professionalId : ""
  );
  const [serviceId, setServiceId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Client search state
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");

  // Update client search when term changes
  useEffect(() => {
    if (clientSearchTerm.length >= 2) {
      onClientSearch(clientSearchTerm);
    }
  }, [clientSearchTerm, onClientSearch]);

  // Update state when props change
  useEffect(() => {
    if (selectedAppointment) {
      // Edit mode
      setIsEditMode(true);
      const startTime = new Date(selectedAppointment.start_time);
      setDate(startTime);
      setTime(format(startTime, "HH:mm"));
      setProfessionalId(selectedAppointment.professional_id.toString());
      setServiceId(selectedAppointment.service_id.toString());
      setClientName(selectedAppointment.clients.name);
      setClientPhone(selectedAppointment.clients.phone || "");
      setSelectedClientId(selectedAppointment.client_id);
      setNotes(selectedAppointment.notes || "");
    } else if (selectedSlot) {
      // Create mode
      setIsEditMode(false);
      setDate(selectedSlot.date);
      setTime(format(selectedSlot.date, "HH:mm"));
      setProfessionalId(selectedSlot.professionalId);
      // Set first service as default if available
      setServiceId(services.length > 0 ? services[0].id : "");
      setClientName("");
      setClientPhone("");
      setSelectedClientId(null);
      setNotes("");
    } else {
      // Reset form
      setIsEditMode(false);
      setDate(new Date());
      setTime("09:00");
      setProfessionalId("");
      // Set first service as default if available
      setServiceId(services.length > 0 ? services[0].id : "");
      setClientName("");
      setClientPhone("");
      setSelectedClientId(null);
      setNotes("");
    }
  }, [selectedSlot, selectedAppointment, services]);

  // Select first service when services are loaded and no service is selected
  useEffect(() => {
    if (services.length > 0 && !serviceId && !isEditMode) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId, isEditMode]);

  // Verificar disponibilidade quando mudar o profissional
  useEffect(() => {
    if (professionalId && date && serviceId) {
      checkAvailability();
    }
  }, [professionalId]);

  const checkAvailability = async () => {
    if (!date || !professionalId || !serviceId) return;

    try {
      const selectedService = services.find((s) => s.id === serviceId);
      if (!selectedService) return;

      const formattedDate = format(date, "yyyy-MM-dd");
      const response = await fetch(
        `/api/availability?professional_id=${professionalId}&date=${formattedDate}&service_duration=${selectedService.duration}`
      );

      if (!response.ok) {
        throw new Error("Falha ao verificar disponibilidade");
      }

      const data = await response.json();
      const timeStr = time || format(selectedSlot?.date || new Date(), "HH:mm");

      // Se o horário atual não estiver disponível, limpar a seleção
      if (!data.available_slots.includes(timeStr)) {
        setTime("");
        toast.error(
          "O horário selecionado não está mais disponível com este profissional"
        );
      }
    } catch (error) {
      console.error("Erro ao verificar disponibilidade:", error);
      toast.error("Não foi possível verificar a disponibilidade do horário");
    }
  };

  const handleClientSelect = (client: Client) => {
    setClientName(client.name);
    setClientPhone(client.phone || "");
    setSelectedClientId(client.id);
    setIsClientPopoverOpen(false);
  };

  const handleCreateClient = async () => {
    if (!clientName || !clientPhone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    try {
      setIsLoading(true);

      const selectedProfessional = professionals.find(
        (p) => p.id === professionalId
      );

      if (!selectedProfessional) {
        toast.error("Selecione um profissional primeiro");
        return;
      }

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: clientName,
          phone: clientPhone,
          email: newClientEmail || undefined,
          business_id: selectedProfessional.business_id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao criar cliente");
      }

      const newClient = await response.json();
      const createdClient = {
        id: newClient[0].id,
        name: clientName,
        phone: clientPhone,
        email: newClientEmail || undefined,
      };

      setSelectedClientId(createdClient.id);
      setIsCreatingClient(false);
      toast.success("Cliente criado com sucesso!");

      // Notify parent component about the new client
      onClientCreated?.(createdClient);
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      toast.error("Não foi possível criar o cliente");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (
        !date ||
        !time ||
        !professionalId ||
        !serviceId ||
        !clientName ||
        !clientPhone
      ) {
        toast.error("Por favor, preencha todos os campos obrigatórios");
        return;
      }

      const selectedService = services.find((s) => s.id === serviceId);
      if (!selectedService) {
        toast.error("Serviço inválido");
        return;
      }

      const [hours, minutes] = time.split(":");
      const startTime = new Date(date);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + selectedService.duration);

      const selectedProfessional = professionals.find(
        (p) => p.id === professionalId
      );
      if (!selectedProfessional) {
        toast.error("Profissional inválido");
        return;
      }

      // Verificar disponibilidade antes de criar/atualizar
      const formattedDate = format(startTime, "yyyy-MM-dd");
      const availabilityResponse = await fetch(
        `/api/availability?professional_id=${professionalId}&date=${formattedDate}&service_duration=${selectedService.duration}`
      );

      if (!availabilityResponse.ok) {
        throw new Error("Falha ao verificar disponibilidade");
      }

      const availabilityData = await availabilityResponse.json();
      const timeStr = format(startTime, "HH:mm");

      // Se for edição, permitir o mesmo horário
      if (!isEditMode && !availabilityData.available_slots.includes(timeStr)) {
        toast.error("Este horário não está mais disponível");
        return;
      }

      let clientId = selectedClientId;

      // Se não tiver um cliente selecionado, criar um novo
      if (!clientId) {
        const clientResponse = await fetch("/api/clients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: clientName,
            phone: clientPhone,
            email: newClientEmail || undefined,
            business_id: selectedProfessional.business_id,
          }),
        });

        if (!clientResponse.ok) {
          const error = await clientResponse.json();
          throw new Error(error.error || "Falha ao criar/buscar cliente");
        }

        const client = await clientResponse.json();
        clientId = client[0].id;

        // Notify parent component about the new client
        onClientCreated?.({
          id: client[0].id,
          name: clientName,
          phone: clientPhone,
          email: newClientEmail || undefined,
        });
      }

      if (isEditMode && selectedAppointment) {
        // Atualizar agendamento existente
        const response = await fetch("/api/appointments", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: selectedAppointment.id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            professional_id: professionalId,
            service_id: serviceId,
            client_id: String(clientId || 0),
            notes,
            status: "scheduled",
            business_id: selectedProfessional.business_id,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Falha ao atualizar agendamento");
        }

        toast.success("Agendamento atualizado com sucesso!");
        onAppointmentUpdated?.();
      } else {
        // Criar novo agendamento
        const response = await fetch("/api/appointments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            professional_id: professionalId,
            service_id: serviceId,
            client_id: String(clientId || 0),
            notes,
            status: "scheduled",
            business_id: selectedProfessional.business_id,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Falha ao criar agendamento");
        }

        toast.success("Agendamento criado com sucesso!");
        onAppointmentCreated?.();
      }

      onClose();
    } catch (error) {
      console.error("Erro ao processar agendamento:", error);
      toast.error(
        `Não foi possível ${isEditMode ? "atualizar" : "criar"} o agendamento`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;

    try {
      setIsDeleting(true);

      const response = await fetch(
        `/api/appointments?id=${selectedAppointment.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao excluir agendamento");
      }

      toast.success("Agendamento excluído com sucesso!");
      onAppointmentUpdated?.();
      onClose();
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      toast.error("Não foi possível excluir o agendamento");
    } finally {
      setIsDeleting(false);
    }
  };

  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);

  // Buscar horários disponíveis quando mudar profissional, serviço ou data
  useEffect(() => {
    if (professionalId && date && serviceId) {
      fetchAvailableTimeSlots();
    } else {
      setTimeSlots([]);
    }
  }, [professionalId, date, serviceId]);

  const fetchAvailableTimeSlots = async () => {
    if (!date || !professionalId || !serviceId) return;

    try {
      setIsLoadingTimeSlots(true);
      const selectedService = services.find((s) => s.id === serviceId);
      if (!selectedService) return;

      const formattedDate = format(date, "yyyy-MM-dd");
      const response = await fetch(
        `/api/availability?professional_id=${professionalId}&date=${formattedDate}&service_duration=${selectedService.duration}`
      );

      if (!response.ok) {
        throw new Error("Falha ao buscar horários disponíveis");
      }

      const data = await response.json();
      setTimeSlots(data.available_slots);

      // Se estiver em modo de edição, manter o horário atual se ainda estiver disponível
      if (isEditMode && time && !data.available_slots.includes(time)) {
        setTime("");
        toast.error("O horário selecionado não está mais disponível");
      }
    } catch (error) {
      console.error("Erro ao buscar horários disponíveis:", error);
      toast.error("Não foi possível carregar os horários disponíveis");
      setTimeSlots([]);
    } finally {
      setIsLoadingTimeSlots(false);
    }
  };

  // Filtrar clientes com base no termo de busca local
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm || clientSearchTerm.length < 2) return clients;

    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        client.phone.includes(clientSearchTerm)
    );
  }, [clients, clientSearchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-background/80 border border-border/50">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Edite os dados do agendamento existente."
              : "Preencha os dados para agendar um novo atendimento."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="professional">Profissional</Label>
            <Select
              value={professionalId}
              onValueChange={(value) => {
                setProfessionalId(value);
                setTime(""); // Limpar horário ao mudar de profissional
              }}
            >
              <SelectTrigger id="professional">
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="service">Serviço</Label>
            <Select
              value={serviceId}
              onValueChange={(value) => {
                setServiceId(value);
                setTime(""); // Limpar horário ao mudar de serviço
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={String(service.id)}>
                    {service.name} - {service.duration} min - R${" "}
                    {service.price.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date
                      ? format(date, "dd 'de' MMMM, yyyy", { locale: ptBR })
                      : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Horário</Label>
              <Select
                value={time}
                onValueChange={setTime}
                disabled={!timeSlots.length || isLoadingTimeSlots}
              >
                <SelectTrigger id="time">
                  <SelectValue
                    placeholder={
                      isLoadingTimeSlots
                        ? "Carregando horários..."
                        : timeSlots.length
                        ? "Selecione um horário"
                        : "Selecione profissional, serviço e data"
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

          <div className="grid gap-2">
            <Label htmlFor="client">Cliente</Label>
            <div className="flex gap-2">
              <Popover
                open={isClientPopoverOpen}
                onOpenChange={setIsClientPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isClientPopoverOpen}
                    className="w-full justify-between"
                  >
                    {clientName || "Buscar cliente..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Buscar cliente..."
                      value={clientSearchTerm}
                      onValueChange={setClientSearchTerm}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {clientSearchTerm.length > 0 ? (
                          <div className="py-3 px-4 text-center">
                            <p className="text-sm text-muted-foreground">
                              Nenhum cliente encontrado
                            </p>
                            <Button
                              variant="outline"
                              className="mt-2"
                              onClick={() => {
                                setIsClientPopoverOpen(false);
                                setIsCreatingClient(true);
                              }}
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Criar novo cliente
                            </Button>
                          </div>
                        ) : (
                          <p className="py-3 px-4 text-center text-sm text-muted-foreground">
                            Digite para buscar clientes
                          </p>
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => handleClientSelect(client)}
                          >
                            <div className="flex flex-col">
                              <span>{client.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {client.phone}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsCreatingClient(true)}
                title="Criar novo cliente"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isCreatingClient ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="client-name">Nome do Cliente</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-phone">Telefone</Label>
                <Input
                  id="client-phone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-email">Email (opcional)</Label>
                <Input
                  id="client-email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreatingClient(false);
                    if (!selectedClientId) {
                      setClientName("");
                      setClientPhone("");
                      setNewClientEmail("");
                    }
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateClient} disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar Cliente"}
                </Button>
              </div>
            </>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          {isEditMode && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading || isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || isDeleting}>
              {isLoading ? (
                <>Salvando...</>
              ) : isEditMode ? (
                <>Atualizar</>
              ) : (
                <>Agendar</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

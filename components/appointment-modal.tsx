"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/utils";

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
  onServiceSelected?: (serviceDuration: number) => void;
  professionalsAvailability?: {
    [professionalId: string]: {
      [date: string]: string[];
    };
  };
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
  onServiceSelected,
  professionalsAvailability = {},
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
  const [clientPhone, setClientPhone] = useState("+55 ");
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
      // If the search term looks like a phone number (contains digits)
      if (/\d/.test(clientSearchTerm)) {
        // Search by phone
        onClientSearch(clientSearchTerm);
      } else {
        // Search by name
        onClientSearch(clientSearchTerm);
      }
    }
  }, [clientSearchTerm, onClientSearch]);

  // Wrap onClose to reset isCreatingClient
  const handleClose = () => {
    setIsCreatingClient(false);
    onClose();
  };

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
      setClientPhone(
        formatPhoneNumber(selectedAppointment.clients.phone || "")
      );
      setSelectedClientId(selectedAppointment.client_id);
      setNotes(selectedAppointment.notes || "");
      setIsCreatingClient(false);
    } else if (selectedSlot) {
      // Create mode
      setIsEditMode(false);
      setDate(selectedSlot.date);
      setTime(format(selectedSlot.date, "HH:mm"));
      setProfessionalId(selectedSlot.professionalId);
      // Set first service as default if available
      setServiceId(services.length > 0 ? services[0].id : "");
      setClientName("");
      setClientPhone("+55 ");
      setSelectedClientId(null);
      setNotes("");
      setIsCreatingClient(false);
    } else {
      // Reset form
      setIsEditMode(false);
      setDate(new Date());
      setTime("09:00");
      setProfessionalId("");
      // Set first service as default if available
      setServiceId(services.length > 0 ? services[0].id : "");
      setClientName("");
      setClientPhone("+55 ");
      setSelectedClientId(null);
      setNotes("");
      setIsCreatingClient(false);
    }
  }, [selectedSlot, selectedAppointment, services]);

  // Define fetchAvailableTimeSlots with useCallback
  const fetchAvailableTimeSlots = useCallback(async () => {
    if (!date || !professionalId || !serviceId) return;

    try {
      setIsLoadingTimeSlots(true);
      const selectedService = services.find((s) => s.id === serviceId);
      if (!selectedService) return;

      const formattedDate = format(date, "yyyy-MM-dd");

      // If we're in edit mode and modifying an existing appointment, always include the current time
      let originalTimeSlot = "";
      if (isEditMode && selectedAppointment) {
        originalTimeSlot = format(
          new Date(selectedAppointment.start_time),
          "HH:mm"
        );
      }

      // Check if we have pre-fetched availability data
      if (
        professionalsAvailability &&
        Object.keys(professionalsAvailability).length > 0
      ) {
        // Get all available slots for the selected professional and date
        const availableSlots =
          professionalsAvailability[professionalId]?.[formattedDate] || [];

        // Always include the original time slot for existing appointments
        const updatedSlots = [
          ...new Set([
            ...availableSlots,
            ...(originalTimeSlot ? [originalTimeSlot] : []),
          ]),
        ].sort();
        setTimeSlots(updatedSlots);

        // If in edit mode and the current time is the original appointment time,
        // we should always keep it valid regardless of availability
        if (
          isEditMode &&
          time &&
          !availableSlots.includes(time) &&
          time !== originalTimeSlot
        ) {
          // If this isn't the original appointment time and it's not available, clear it
          setTime("");
        }

        setIsLoadingTimeSlots(false);
        return;
      }

      // Fall back to API call if pre-fetched data is not available
      const response = await fetch(
        `/api/availability?professional_id=${professionalId}&date=${formattedDate}&service_duration=${selectedService.duration}`
      );

      if (!response.ok) {
        throw new Error("Falha ao buscar horários disponíveis");
      }

      const data = await response.json();

      // Always include the original time slot for existing appointments
      const updatedSlots = [
        ...new Set([
          ...data.available_slots,
          ...(originalTimeSlot ? [originalTimeSlot] : []),
        ]),
      ].sort();
      setTimeSlots(updatedSlots);

      // Check if the current time is still available in edit mode
      if (
        isEditMode &&
        time &&
        !data.available_slots.includes(time) &&
        time !== originalTimeSlot
      ) {
        // If this isn't the original appointment time and it's not available, clear it
        setTime("");
      }
    } catch (error) {
      console.error("Erro ao buscar horários disponíveis:", error);
      toast.error("Não foi possível carregar os horários disponíveis");
      setTimeSlots([]);
    } finally {
      setIsLoadingTimeSlots(false);
    }
  }, [
    date,
    professionalId,
    serviceId,
    services,
    isEditMode,
    time,
    selectedAppointment,
    professionalsAvailability,
  ]);

  // Define checkAvailability with useCallback - just call fetchAvailableTimeSlots
  const checkAvailability = useCallback(() => {
    fetchAvailableTimeSlots();
  }, [fetchAvailableTimeSlots]);

  // Select first service when services are loaded and no service is selected
  useEffect(() => {
    if (services.length > 0 && !serviceId && !isEditMode) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId, isEditMode]);

  // Update the useEffect that fetches available time slots when service changes
  useEffect(() => {
    if (serviceId && professionalId && date) {
      // When service changes, we need to recalculate availability based on the new duration
      const selectedService = services.find((s) => s.id === serviceId);
      if (selectedService) {
        // If we're using pre-fetched data, we need to refetch with the new duration
        // This is because the pre-fetched data is based on a default duration
        fetchAvailableTimeSlots();
      }
    }
  }, [serviceId, professionalId, date, services, fetchAvailableTimeSlots]);

  // Verificar disponibilidade quando mudar o profissional
  useEffect(() => {
    if (professionalId && date && serviceId) {
      checkAvailability();
    }
  }, [professionalId, date, serviceId, checkAvailability]);

  const handleClientSelect = (client: Client) => {
    setClientName(client.name);
    setClientPhone(formatPhoneNumber(client.phone || ""));
    setSelectedClientId(client.id);
    setIsClientPopoverOpen(false);
    // Cancela o modo de criação de cliente se estiver ativo
    if (isCreatingClient) {
      setIsCreatingClient(false);
    }
  };

  const handleSubmit = async () => {
    console.log("Iniciando handleSubmit");
    try {
      setIsLoading(true);
      console.log("Validando campos...");

      if (
        !date ||
        !time ||
        !professionalId ||
        !serviceId ||
        !clientName ||
        !clientPhone
      ) {
        console.log("Campos obrigatórios faltando:", {
          date,
          time,
          professionalId,
          serviceId,
          clientName,
          clientPhone,
        });
        toast.error("Por favor, preencha todos os campos obrigatórios");
        return;
      }

      // Normalize phone number
      const normalizedPhone = normalizePhoneNumber(clientPhone);

      console.log("Todos os campos preenchidos, buscando serviço...");
      const selectedService = services.find((s) => s.id === serviceId);
      if (!selectedService) {
        console.log("Serviço não encontrado para ID:", serviceId);
        toast.error("Serviço inválido");
        return;
      }

      console.log("Serviço encontrado:", selectedService);
      const [hours, minutes] = time.split(":");
      const startTime = new Date(date);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + selectedService.duration);
      console.log("Horários calculados:", { startTime, endTime });

      console.log("Buscando profissional...");
      const selectedProfessional = professionals.find(
        (p) => p.id === professionalId
      );
      if (!selectedProfessional) {
        console.log("Profissional não encontrado para ID:", professionalId);
        toast.error("Profissional inválido");
        return;
      }
      console.log("Profissional encontrado:", selectedProfessional);

      // Verify availability before creating/updating only if we're not in edit mode
      // or if we've changed the professional or time in edit mode
      if (
        !isEditMode ||
        (isEditMode &&
          selectedAppointment &&
          (selectedAppointment.professional_id.toString() !== professionalId ||
            format(new Date(selectedAppointment.start_time), "HH:mm") !== time))
      ) {
        // Simple time format match check - no extra availability check needed
        // since the API already filtered out unavailable times
        const formattedDate = format(startTime, "yyyy-MM-dd");
        const timeStr = format(startTime, "HH:mm");

        // In edit mode, if we're using the same time as the original appointment,
        // we should always consider it available
        const originalTimeSlot = selectedAppointment
          ? format(new Date(selectedAppointment.start_time), "HH:mm")
          : "";

        // Check if the time exists in our timeslots list
        if (!timeSlots.includes(timeStr) && timeStr !== originalTimeSlot) {
          console.log("Horário não disponível");
          toast.error("Este horário não está mais disponível");
          return;
        }
      }

      let clientId = selectedClientId;
      console.log("Estado inicial do cliente:", {
        clientId,
        isCreatingClient,
        clientName,
        clientPhone: normalizedPhone,
      });

      // Se não tiver um cliente selecionado ou estiver criando um novo, criar um novo
      if (!clientId || isCreatingClient) {
        console.log("Criando novo cliente...");
        const clientResponse = await fetch("/api/clients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: clientName,
            phone: normalizedPhone,
            email: newClientEmail || undefined,
            business_id: selectedProfessional.business_id,
          }),
        });

        console.log("Resposta da API de cliente recebida");
        if (!clientResponse.ok) {
          const errorText = await clientResponse.text();
          console.log("Erro na resposta da API de cliente:", errorText);
          const error = JSON.parse(errorText);
          throw new Error(error.error || "Falha ao criar/buscar cliente");
        }

        const client = await clientResponse.json();
        console.log("Cliente criado com sucesso, resposta:", client);

        // Corrigir acesso ao ID do cliente - a API está retornando o objeto diretamente, não um array
        clientId = client.id; // Antes era client[0].id
        console.log("Cliente criado com ID:", clientId);

        // Notify parent component about the new client
        onClientCreated?.({
          id: client.id, // Antes era client[0].id
          name: clientName,
          phone: normalizedPhone,
          email: newClientEmail || undefined,
        });

        // Não precisamos mais do modo de criação de cliente
        setIsCreatingClient(false);
      }

      // Garantir que temos um ID de cliente válido
      if (!clientId) {
        console.log("ID de cliente inválido após criação/seleção");
        toast.error(
          "Erro ao identificar o cliente. Por favor, tente novamente."
        );
        return;
      }

      console.log(
        "Prosseguindo para criar/atualizar agendamento com cliente ID:",
        clientId
      );

      try {
        if (isEditMode && selectedAppointment) {
          // Atualizar agendamento existente
          console.log("Atualizando agendamento existente...");
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
              client_id: String(clientId),
              notes,
              status: "scheduled",
              business_id: selectedProfessional.business_id,
            }),
          });

          console.log("Resposta da API de atualização recebida");
          if (!response.ok) {
            const errorText = await response.text();
            console.log("Erro na resposta da API de atualização:", errorText);
            throw new Error("Falha ao atualizar agendamento");
          }

          console.log("Agendamento atualizado com sucesso");
          toast.success("Agendamento atualizado com sucesso!");

          // Remove the unnecessary fetchAvailableTimeSlots call
          onAppointmentUpdated?.();
        } else {
          // Criar novo agendamento
          console.log("Criando novo agendamento...");
          console.log("Dados do agendamento:", {
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            professional_id: professionalId,
            service_id: serviceId,
            client_id: String(clientId),
            business_id: selectedProfessional.business_id,
          });

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
              client_id: String(clientId),
              notes,
              status: "scheduled",
              business_id: selectedProfessional.business_id,
            }),
          });

          console.log("Resposta da API de criação recebida");
          if (!response.ok) {
            const errorText = await response.text();
            console.log("Erro na resposta da API de criação:", errorText);
            throw new Error("Falha ao criar agendamento");
          }

          const result = await response.json();
          console.log("Agendamento criado com sucesso:", result);

          toast.success("Agendamento criado com sucesso!");

          // Remove the unnecessary fetchAvailableTimeSlots call
          onAppointmentCreated?.();
        }
      } catch (appointmentError) {
        console.error(
          "Erro específico na criação/atualização do agendamento:",
          appointmentError
        );
        throw appointmentError;
      }

      console.log("Processo completo, fechando modal");
      handleClose();
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

      // Remove the unnecessary fetchAvailableTimeSlots call
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

  // Filtrar clientes com base no termo de busca local
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm || clientSearchTerm.length < 2) return clients;

    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        normalizePhoneNumber(client.phone).includes(
          normalizePhoneNumber(clientSearchTerm)
        )
    );
  }, [clients, clientSearchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-background/80 border border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-3">
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

                // Notificar sobre a mudança de serviço com a duração
                const selectedService = services.find((s) => s.id === value);
                if (selectedService && onServiceSelected) {
                  onServiceSelected(selectedService.duration);
                }
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
              <Input
                id="date"
                type="date"
                value={date ? format(date, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setDate(parseISO(e.target.value));
                  } else {
                    setDate(undefined);
                  }
                }}
                className="w-full"
              />
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
                                {formatPhoneNumber(client.phone)}
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
                  onChange={(e) =>
                    setClientPhone(formatPhoneNumber(e.target.value))
                  }
                  placeholder="+55 (11) 99999-9999"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Digite o número com código do país e DDD
                </p>
              </div>
            </>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais"
            />
          </div>
        </div>
        <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 sm:gap-0">
          <div>
            {isEditMode && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading || isDeleting}
                className="w-full sm:w-auto"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </Button>
            )}
          </div>
          <div className="flex gap-2 sm:flex-row flex-col sm:flex-row-reverse">
            <Button
              onClick={handleSubmit}
              disabled={isLoading || isDeleting}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>Salvando...</>
              ) : isEditMode ? (
                <>Atualizar</>
              ) : (
                <>Agendar</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

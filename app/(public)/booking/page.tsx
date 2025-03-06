"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar, Phone, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Constante para o nome da chave no localStorage
const PHONE_STORAGE_KEY = "barbershop_user_phone"

export default function BookingPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("new")
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [time, setTime] = useState<string>("")
  const [service, setService] = useState<string>("")
  const [professional, setProfessional] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)

  // Carregar telefone do localStorage ao iniciar
  useEffect(() => {
    const savedPhone = localStorage.getItem(PHONE_STORAGE_KEY)
    if (savedPhone) {
      setPhone(savedPhone)
      if (activeTab === "view") {
        fetchAppointments(savedPhone)
      }
    }
  }, [activeTab])

  // Carregar serviços e profissionais
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar serviços
        const servicesResponse = await fetch("/api/services")
        const servicesData = await servicesResponse.json()
        setServices(servicesData)

        // Buscar profissionais
        const professionalsResponse = await fetch("/api/professionals")
        const professionalsData = await professionalsResponse.json()
        setProfessionals(professionalsData)
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        setError("Não foi possível carregar os dados. Tente novamente mais tarde.")
      }
    }

    fetchData()
  }, [])

  // Gerar horários disponíveis
  useEffect(() => {
    if (date && professional && service) {
      generateTimeSlots()
    }
  }, [date, professional, service])

  const generateTimeSlots = async () => {
    // Em um sistema real, você buscaria os horários disponíveis da API
    // Aqui estamos gerando horários de exemplo
    const slots = []
    const startHour = 9
    const endHour = 18
    const selectedService = services.find((s) => s.id === service)
    const duration = selectedService?.duration || 30
    const interval = Math.max(30, duration)

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const formattedHour = hour.toString().padStart(2, "0")
        const formattedMinute = minute.toString().padStart(2, "0")
        slots.push(`${formattedHour}:${formattedMinute}`)
      }
    }

    setTimeSlots(slots)
  }

  const fetchAppointments = async (phoneNumber: string) => {
    if (!phoneNumber) return

    setLoadingAppointments(true)
    try {
      const response = await fetch(`/api/appointments?phone=${encodeURIComponent(phoneNumber)}`)
      const data = await response.json()
      setAppointments(data)
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error)
      setError("Não foi possível carregar seus agendamentos. Tente novamente mais tarde.")
    } finally {
      setLoadingAppointments(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Salvar telefone no localStorage
    localStorage.setItem(PHONE_STORAGE_KEY, phone)

    try {
      // Verificar se todos os campos estão preenchidos
      if (!name || !phone || !date || !time || !service || !professional) {
        throw new Error("Por favor, preencha todos os campos.")
      }

      // Criar objeto de data/hora para o agendamento
      const selectedService = services.find((s) => s.id === service)
      const duration = selectedService?.duration || 30

      const [hours, minutes] = time.split(":").map(Number)
      const startTime = new Date(date)
      startTime.setHours(hours, minutes, 0, 0)

      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + duration)

      // Enviar agendamento para a API
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: name,
          client_phone: phone,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          professional_id: professional,
          service_id: service,
          business_id: "1", // Em um sistema real, você obteria o ID do negócio de alguma forma
          status: "scheduled",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao criar agendamento")
      }

      setSuccess("Agendamento realizado com sucesso!")

      // Limpar formulário
      setDate(new Date())
      setTime("")
      setService("")
      setProfessional("")

      // Mudar para a aba de visualização após alguns segundos
      setTimeout(() => {
        setActiveTab("view")
        fetchAppointments(phone)
      }, 2000)
    } catch (error: any) {
      console.error("Erro ao agendar:", error)
      setError(error.message || "Erro ao criar agendamento. Tente novamente mais tarde.")
    } finally {
      setLoading(false)
    }
  }

  const handleViewAppointments = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) {
      setError("Por favor, informe seu telefone para visualizar os agendamentos.")
      return
    }

    localStorage.setItem(PHONE_STORAGE_KEY, phone)
    fetchAppointments(phone)
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) {
      return
    }

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erro ao cancelar agendamento")
      }

      // Atualizar lista de agendamentos
      fetchAppointments(phone)
      setSuccess("Agendamento cancelado com sucesso!")
    } catch (error) {
      console.error("Erro ao cancelar agendamento:", error)
      setError("Não foi possível cancelar o agendamento. Tente novamente mais tarde.")
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Agendamento Online</h1>
        <p className="text-muted-foreground">Agende seu horário ou consulte seus agendamentos</p>
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
              <CardDescription>Preencha os dados abaixo para agendar seu horário</CardDescription>
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
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
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
                          {service.name} - {service.duration} min - R$ {service.price.toFixed(2)}
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
                        <SelectItem key={professional.id} value={professional.id}>
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
                        <Button id="date" variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {date ? format(date, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          locale={ptBR}
                          disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Horário</Label>
                    <Select value={time} onValueChange={setTime} disabled={!timeSlots.length}>
                      <SelectTrigger id="time">
                        <SelectValue
                          placeholder={
                            timeSlots.length ? "Selecione um horário" : "Selecione data, serviço e profissional"
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
              <CardDescription>Visualize e gerencie seus agendamentos</CardDescription>
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
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                  <Button onClick={handleViewAppointments} disabled={loadingAppointments}>
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
                              <h3 className="font-medium">{appointment.services.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(appointment.start_time), "dd 'de' MMMM, yyyy", { locale: ptBR })} às{" "}
                                {format(new Date(appointment.start_time), "HH:mm")}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                {appointment.status === "scheduled" ? "Agendado" : appointment.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm">
                                <span className="font-medium">Profissional:</span> {appointment.professionals.name}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Duração:</span> {appointment.services.duration} minutos
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleCancelAppointment(appointment.id)}
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
                    <h3 className="font-medium">Nenhum agendamento encontrado</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {phone
                        ? "Você não possui agendamentos com este telefone."
                        : "Informe seu telefone para visualizar seus agendamentos."}
                    </p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab("new")}>
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
  )
}


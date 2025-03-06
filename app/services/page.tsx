"use client"

import type React from "react"

import { useState } from "react"
import { Clock, Pencil, Plus, Scissors, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/page-header"
import { Textarea } from "@/components/ui/textarea"

// Dados de exemplo
const initialServices = [
  { id: 1, name: "Corte de Cabelo", description: "Corte moderno com tesoura ou máquina", duration: 30, price: 35 },
  { id: 2, name: "Barba", description: "Modelagem e acabamento com navalha", duration: 20, price: 25 },
  { id: 3, name: "Corte e Barba", description: "Combo de corte de cabelo e barba", duration: 50, price: 55 },
  { id: 4, name: "Tratamento Capilar", description: "Hidratação e tratamento para cabelos", duration: 40, price: 45 },
]

export default function ServicesPage() {
  const [services, setServices] = useState(initialServices)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<(typeof initialServices)[0] | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "",
    price: "",
  })

  const openNewServiceModal = () => {
    setEditingService(null)
    setFormData({
      name: "",
      description: "",
      duration: "",
      price: "",
    })
    setIsModalOpen(true)
  }

  const openEditServiceModal = (service: (typeof initialServices)[0]) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description,
      duration: String(service.duration),
      price: String(service.price),
    })
    setIsModalOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = () => {
    if (editingService) {
      // Editar serviço existente
      setServices((prev) =>
        prev.map((service) =>
          service.id === editingService.id
            ? {
                ...service,
                name: formData.name,
                description: formData.description,
                duration: Number.parseInt(formData.duration),
                price: Number.parseFloat(formData.price),
              }
            : service,
        ),
      )
    } else {
      // Adicionar novo serviço
      const newService = {
        id: services.length > 0 ? Math.max(...services.map((s) => s.id)) + 1 : 1,
        name: formData.name,
        description: formData.description,
        duration: Number.parseInt(formData.duration),
        price: Number.parseFloat(formData.price),
      }
      setServices((prev) => [...prev, newService])
    }
    setIsModalOpen(false)
  }

  const deleteService = (id: number) => {
    setServices((prev) => prev.filter((service) => service.id !== id))
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
          <Button onClick={openNewServiceModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Serviço
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-primary" />
                  {service.name}
                </CardTitle>
                <CardDescription>R$ {service.price.toFixed(2)}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{service.description}</p>
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{service.duration} minutos</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t bg-muted/30 px-6 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground"
                  onClick={() => openEditServiceModal(service)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={() => deleteService(service.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-background/80 border border-border/50">
            <DialogHeader>
              <DialogTitle>{editingService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
              <DialogDescription>
                {editingService
                  ? "Edite as informações do serviço abaixo."
                  : "Preencha as informações para adicionar um novo serviço."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do Serviço</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Corte de Cabelo"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descreva o serviço"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    value={formData.duration}
                    onChange={handleInputChange}
                    placeholder="Ex: 30"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="Ex: 35.00"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>{editingService ? "Salvar" : "Adicionar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}


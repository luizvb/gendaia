"use client"

import type React from "react"

import { useState } from "react"
import { Pencil, Plus, Trash2, Users } from "lucide-react"

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

// Dados de exemplo
const initialProfessionals = [
  { id: 1, name: "Carlos Silva", specialty: "Corte Masculino", color: "#3b82f6" },
  { id: 2, name: "André Santos", specialty: "Barba", color: "#10b981" },
  { id: 3, name: "Marcos Oliveira", specialty: "Corte e Barba", color: "#f59e0b" },
]

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState(initialProfessionals)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProfessional, setEditingProfessional] = useState<(typeof initialProfessionals)[0] | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    color: "#3b82f6",
  })

  const openNewProfessionalModal = () => {
    setEditingProfessional(null)
    setFormData({
      name: "",
      specialty: "",
      color: "#3b82f6",
    })
    setIsModalOpen(true)
  }

  const openEditProfessionalModal = (professional: (typeof initialProfessionals)[0]) => {
    setEditingProfessional(professional)
    setFormData({
      name: professional.name,
      specialty: professional.specialty,
      color: professional.color,
    })
    setIsModalOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = () => {
    if (editingProfessional) {
      // Editar profissional existente
      setProfessionals((prev) =>
        prev.map((professional) =>
          professional.id === editingProfessional.id
            ? {
                ...professional,
                name: formData.name,
                specialty: formData.specialty,
                color: formData.color,
              }
            : professional,
        ),
      )
    } else {
      // Adicionar novo profissional
      const newProfessional = {
        id: professionals.length > 0 ? Math.max(...professionals.map((p) => p.id)) + 1 : 1,
        name: formData.name,
        specialty: formData.specialty,
        color: formData.color,
      }
      setProfessionals((prev) => [...prev, newProfessional])
    }
    setIsModalOpen(false)
  }

  const deleteProfessional = (id: number) => {
    setProfessionals((prev) => prev.filter((professional) => professional.id !== id))
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Profissionais</h1>
          <Button onClick={openNewProfessionalModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Profissional
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {professionals.map((professional) => (
            <Card key={professional.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full" style={{ backgroundColor: professional.color }}></div>
                  {professional.name}
                </CardTitle>
                <CardDescription>{professional.specialty}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Especialista</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t bg-muted/30 px-6 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground"
                  onClick={() => openEditProfessionalModal(professional)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={() => deleteProfessional(professional.id)}
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
              <DialogTitle>{editingProfessional ? "Editar Profissional" : "Novo Profissional"}</DialogTitle>
              <DialogDescription>
                {editingProfessional
                  ? "Edite as informações do profissional abaixo."
                  : "Preencha as informações para adicionar um novo profissional."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do Profissional</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Carlos Silva"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="specialty">Especialidade</Label>
                <Input
                  id="specialty"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  placeholder="Ex: Corte Masculino"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">Cor no Calendário</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="h-10 w-20 cursor-pointer"
                  />
                  <div className="text-sm text-muted-foreground">
                    Escolha uma cor para identificar o profissional no calendário
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>{editingProfessional ? "Salvar" : "Adicionar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}


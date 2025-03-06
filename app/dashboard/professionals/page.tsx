"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toast } from "sonner";

interface Professional {
  id: number;
  name: string;
  specialty: string;
  color: string;
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] =
    useState<Professional | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    color: "#3b82f6",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    try {
      const response = await fetch("/api/professionals");
      if (!response.ok) throw new Error("Failed to fetch professionals");
      const data = await response.json();
      setProfessionals(data);
    } catch (error) {
      toast.error("Erro ao carregar profissionais");
      console.error(error);
    }
  };

  const openNewProfessionalModal = () => {
    setEditingProfessional(null);
    setFormData({
      name: "",
      specialty: "",
      color: "#3b82f6",
    });
    setIsModalOpen(true);
  };

  const openEditProfessionalModal = (professional: Professional) => {
    setEditingProfessional(professional);
    setFormData({
      name: professional.name,
      specialty: professional.specialty,
      color: professional.color,
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const professionalData = {
        name: formData.name,
        specialty: formData.specialty,
        color: formData.color,
      };

      const url = editingProfessional
        ? "/api/professionals"
        : "/api/professionals";
      const method = editingProfessional ? "PUT" : "POST";
      const body = editingProfessional
        ? { id: editingProfessional.id, ...professionalData }
        : professionalData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save professional");

      toast.success(
        editingProfessional
          ? "Profissional atualizado com sucesso"
          : "Profissional criado com sucesso"
      );
      setIsModalOpen(false);
      fetchProfessionals();
    } catch (error) {
      toast.error("Erro ao salvar profissional");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este profissional?")) return;

    try {
      const response = await fetch(`/api/professionals?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete professional");

      toast.success("Profissional excluído com sucesso");
      fetchProfessionals();
    } catch (error) {
      toast.error("Erro ao excluir profissional");
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profissionais</h1>
          <p className="text-muted-foreground">Gerencie os profissionais</p>
        </div>
        <Button onClick={openNewProfessionalModal}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Profissional
        </Button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {professionals.map((professional) => (
          <Card key={professional.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: professional.color }}
                  aria-hidden="true"
                />
                {professional.name}
              </CardTitle>
              <CardDescription>{professional.specialty}</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => openEditProfessionalModal(professional)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDelete(professional.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProfessional
                ? "Editar Profissional"
                : "Novo Profissional"}
            </DialogTitle>
            <DialogDescription>
              {editingProfessional
                ? "Edite as informações do profissional abaixo"
                : "Preencha as informações do novo profissional abaixo"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="specialty">Especialidade</Label>
              <Input
                id="specialty"
                name="specialty"
                value={formData.specialty}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="color">Cor de identificação</Label>
              <Input
                id="color"
                name="color"
                type="color"
                value={formData.color}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading
                ? "Salvando..."
                : editingProfessional
                ? "Salvar"
                : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

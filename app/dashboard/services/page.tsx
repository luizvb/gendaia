"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Clock, Pencil, Plus, Scissors, Trash2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "",
    price: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Failed to fetch services");
      const data = await response.json();
      setServices(data);
    } catch (error) {
      toast.error("Erro ao carregar serviços");
      console.error(error);
    }
  };

  const openNewServiceModal = () => {
    setEditingService(null);
    setFormData({
      name: "",
      description: "",
      duration: "",
      price: "",
    });
    setIsModalOpen(true);
  };

  const openEditServiceModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      duration: String(service.duration),
      price: String(service.price),
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const serviceData = {
        name: formData.name,
        description: formData.description,
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
      };

      const url = editingService ? "/api/services" : "/api/services";
      const method = editingService ? "PUT" : "POST";
      const body = editingService
        ? { id: editingService.id, ...serviceData }
        : serviceData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save service");

      toast.success(
        editingService
          ? "Serviço atualizado com sucesso"
          : "Serviço criado com sucesso"
      );
      setIsModalOpen(false);
      fetchServices();
    } catch (error) {
      toast.error("Erro ao salvar serviço");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;

    try {
      const response = await fetch(`/api/services?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete service");

      toast.success("Serviço excluído com sucesso");
      fetchServices();
    } catch (error) {
      toast.error("Erro ao excluir serviço");
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Serviços</h1>
          <p className="text-muted-foreground">
            Gerencie os serviços oferecidos
          </p>
        </div>
        <Button onClick={openNewServiceModal}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                {service.name}
              </CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{service.duration} minutos</span>
              </div>
              <div className="mt-2">
                <span className="text-lg font-bold">
                  R$ {service.price.toFixed(2)}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => openEditServiceModal(service)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDelete(service.id)}
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
              {editingService ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? "Edite as informações do serviço abaixo"
                : "Preencha as informações do novo serviço abaixo"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Nome do Serviço</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                value={formData.duration}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="price">Preço</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
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
                : editingService
                ? "Salvar"
                : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/utils";

interface Client {
  id: number;
  name: string;
  phone: string;
  lastVisit?: string;
  lastMessage?: {
    content: string;
    date: string;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients");
      if (!response.ok) throw new Error("Failed to fetch clients");
      const data = await response.json();
      setClients(data);
    } catch (error) {
      toast.error("Erro ao carregar clientes");
      console.error(error);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(normalizePhoneNumber(searchTerm))
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      setFormData((prev) => ({
        ...prev,
        [name]: formatPhoneNumber(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      // Normalize phone before sending to API
      const normalizedPhone = normalizePhoneNumber(formData.phone);

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: normalizedPhone,
        }),
      });

      if (!response.ok) throw new Error("Failed to create client");

      toast.success("Cliente criado com sucesso");
      setIsModalOpen(false);
      setFormData({
        name: "",
        phone: "",
      });
      fetchClients();
    } catch (error) {
      toast.error("Erro ao criar cliente");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      const response = await fetch(`/api/clients?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete client");

      toast.success("Cliente excluído com sucesso");
      fetchClients();
    } catch (error) {
      toast.error("Erro ao excluir cliente");
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Card className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Última Visita</TableHead>
                <TableHead>Última Conversa</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{formatPhoneNumber(client.phone)}</TableCell>
                  <TableCell>
                    {client.lastVisit
                      ? new Date(client.lastVisit).toLocaleDateString("pt-BR")
                      : "Nunca"}
                  </TableCell>
                  <TableCell>
                    {client.lastMessage ? (
                      <div className="max-w-[200px]">
                        <p className="truncate text-sm">
                          {client.lastMessage.content}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(client.lastMessage.date).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                    ) : (
                      "Nenhuma"
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha as informações do novo cliente abaixo
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
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+55 (11) 99999-9999"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Digite o número com código do país e DDD
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

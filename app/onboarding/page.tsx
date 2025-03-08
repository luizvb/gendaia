"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingSteps } from "@/components/onboarding-steps";

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar organização");
      }

      // Redirecionar para a próxima etapa
      router.push("/onboarding/plan");
    } catch (error) {
      console.error("Erro ao criar organização:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar organização"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <OnboardingSteps currentStep={1} />

      <Card className="mt-8">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            Criar sua Organização
          </CardTitle>
          <CardDescription>
            Vamos configurar sua GENDAIA na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da GENDAIA</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: GENDAIA Modelo"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                name="description"
                placeholder="Ex: GENDAIA especializada em cortes modernos"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                name="address"
                placeholder="Ex: Rua Exemplo, 123 - Centro"
                value={formData.address}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="Ex: (11) 99999-9999"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Ex: contato@GENDAIA.com"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/login")}>
            Voltar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Criando..." : "Continuar"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

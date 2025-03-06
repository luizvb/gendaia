"use client";

import type React from "react";

import { useState } from "react";
import { Clock, Save } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TimeInput } from "@/components/time-input";

export default function SettingsPage() {
  const [businessInfo, setBusinessInfo] = useState({
    name: "GendaIA",
    address: "Rua Exemplo, 123 - Centro",
    phone: "(11) 99999-9999",
    email: "contato@gendaia.com",
    description:
      "GendaIA especializada em cortes masculinos modernos e tradicionais.",
  });

  const [businessHours, setBusinessHours] = useState({
    monday: { open: "09:00", close: "19:00", isOpen: true },
    tuesday: { open: "09:00", close: "19:00", isOpen: true },
    wednesday: { open: "09:00", close: "19:00", isOpen: true },
    thursday: { open: "09:00", close: "19:00", isOpen: true },
    friday: { open: "09:00", close: "19:00", isOpen: true },
    saturday: { open: "09:00", close: "16:00", isOpen: true },
    sunday: { open: "09:00", close: "13:00", isOpen: false },
  });

  const handleBusinessInfoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setBusinessInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTimeChange = (
    day: keyof typeof businessHours,
    field: "open" | "close",
    value: string
  ) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleToggleDay = (day: keyof typeof businessHours) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen,
      },
    }));
  };

  const handleSave = () => {
    // Aqui você implementaria a lógica para salvar as configurações
    console.log({ businessInfo, businessHours });
    alert("Configurações salvas com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Configure as informações da sua GendaIA
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Informações da GendaIA</CardTitle>
              <CardDescription>
                Configure as informações básicas da sua GendaIA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome da GendaIA</Label>
                  <Input
                    id="name"
                    name="name"
                    value={businessInfo.name}
                    onChange={handleBusinessInfoChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={businessInfo.phone}
                    onChange={handleBusinessInfoChange}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  name="address"
                  value={businessInfo.address}
                  onChange={handleBusinessInfoChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={businessInfo.email}
                  onChange={handleBusinessInfoChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={businessInfo.description}
                  onChange={handleBusinessInfoChange}
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="logo">Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-md border bg-muted flex items-center justify-center text-muted-foreground">
                    Logo
                  </div>
                  <Button variant="outline">Alterar Logo</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>Horários de Funcionamento</CardTitle>
              <CardDescription>
                Configure os horários de funcionamento da sua GendaIA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                Object.keys(businessHours) as Array<keyof typeof businessHours>
              ).map((day, index) => (
                <div key={day}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-base capitalize">{day}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`${day}-toggle`}
                        className="text-sm text-muted-foreground"
                      >
                        {businessHours[day].isOpen ? "Aberto" : "Fechado"}
                      </Label>
                      <Button
                        id={`${day}-toggle`}
                        variant={
                          businessHours[day].isOpen ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handleToggleDay(day)}
                      >
                        {businessHours[day].isOpen ? "Aberto" : "Fechado"}
                      </Button>
                    </div>
                  </div>
                  {businessHours[day].isOpen && (
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor={`${day}-open`}>Abertura</Label>
                        <TimeInput
                          id={`${day}-open`}
                          value={businessHours[day].open}
                          onChange={(value) =>
                            handleTimeChange(day, "open", value)
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`${day}-close`}>Fechamento</Label>
                        <TimeInput
                          id={`${day}-close`}
                          value={businessHours[day].close}
                          onChange={(value) =>
                            handleTimeChange(day, "close", value)
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

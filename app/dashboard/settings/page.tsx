"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Clock, CreditCard, Save, Upload } from "lucide-react";
import { toast } from "sonner";

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
import { formatPrice } from "@/app/lib/stripe";

const PLANS = [
  {
    name: "Basic",
    description: "Perfect for small businesses",
    price: 9900, // R$99.00
    features: [
      "Up to 100 appointments/month",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    name: "Pro",
    description: "For growing businesses",
    price: 19900, // R$199.00
    features: [
      "Unlimited appointments",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
    ],
  },
  {
    name: "Enterprise",
    description: "For large organizations",
    price: 39900, // R$399.00
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [businessInfo, setBusinessInfo] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    logo: "",
  });
  const [subscription, setSubscription] = useState<any>(null);

  // Mapeamento dos dias da semana em inglês para português
  const dayNamesPtBR: Record<string, string> = {
    sunday: "Domingo",
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
  };

  // Ordem dos dias da semana no padrão brasileiro
  const daysOrder = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const [businessHours, setBusinessHours] = useState({
    sunday: { open: "09:00", close: "13:00", isOpen: false },
    monday: { open: "09:00", close: "19:00", isOpen: true },
    tuesday: { open: "09:00", close: "19:00", isOpen: true },
    wednesday: { open: "09:00", close: "19:00", isOpen: true },
    thursday: { open: "09:00", close: "19:00", isOpen: true },
    friday: { open: "09:00", close: "19:00", isOpen: true },
    saturday: { open: "09:00", close: "16:00", isOpen: true },
  });

  // Fetch business settings on page load
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }

        const data = await response.json();

        // Update business info
        if (data.business) {
          setBusinessInfo({
            name: data.business.name || "",
            address: data.business.address || "",
            phone: data.business.phone || "",
            email: data.business.email || "",
            description: data.business.description || "",
            logo: data.business.logo || "",
          });
        }

        // Update business hours
        if (data.businessHours && data.businessHours.length > 0) {
          const daysMap: Record<number, string> = {
            0: "sunday",
            1: "monday",
            2: "tuesday",
            3: "wednesday",
            4: "thursday",
            5: "friday",
            6: "saturday",
          };

          // Inicializa com os valores padrão
          const updatedHours = { ...businessHours };

          // Atualiza com os valores do servidor
          data.businessHours.forEach((hour: any) => {
            const day = daysMap[hour.day_of_week];
            if (day) {
              updatedHours[day as keyof typeof businessHours] = {
                open: hour.open_time,
                close: hour.close_time,
                isOpen: hour.is_open,
              };
            }
          });

          setBusinessHours(updatedHours);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Failed to load settings");
      }
    }

    fetchSettings();
  }, []);

  // Fetch subscription data
  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch("/api/subscriptions");
        if (!response.ok) throw new Error("Failed to fetch subscription");
        const data = await response.json();
        setSubscription(data);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      }
    }

    fetchSubscription();
  }, []);

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

  const handleSave = async () => {
    try {
      setLoading(true);

      // Convert business hours to the format expected by the API
      const daysMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      const businessHoursArray = Object.entries(businessHours).map(
        ([day, hours]) => ({
          day_of_week: daysMap[day],
          open_time: hours.open,
          close_time: hours.close,
          is_open: hours.isOpen,
        })
      );

      // Prepare data for API
      const data = {
        business: {
          ...businessInfo,
          // Make sure logo is included
          logo: businessInfo.logo,
        },
        businessHours: businessHoursArray,
      };

      // Send data to API
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save settings");
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("O arquivo deve ser uma imagem");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    try {
      setUploadingLogo(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao fazer upload do logo");
      }

      const data = await response.json();

      // Update business info with new logo URL
      setBusinessInfo((prev) => ({
        ...prev,
        logo: data.url,
      }));

      toast.success("Logo atualizado com sucesso!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLogoButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePlanSelect = async (planName: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planName }),
      });

      if (!response.ok) throw new Error("Failed to create checkout session");

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to process subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;

    try {
      setLoading(true);
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to cancel subscription");

      const data = await response.json();
      setSubscription(data);
      toast.success("Subscription canceled successfully");
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error("Failed to cancel subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Configure as informações da sua GENDAIA
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="gap-2">
          {loading ? (
            "Salvando..."
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
          <TabsTrigger value="subscription">Assinatura</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Informações da GENDAIA</CardTitle>
              <CardDescription>
                Configure as informações básicas da sua GENDAIA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome da GENDAIA</Label>
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
                  <div className="h-20 w-20 rounded-md border bg-muted flex items-center justify-center text-muted-foreground overflow-hidden">
                    {businessInfo.logo ? (
                      <img
                        src={businessInfo.logo}
                        alt="Logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "Logo"
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={handleLogoButtonClick}
                      disabled={uploadingLogo}
                      className="gap-2"
                    >
                      {uploadingLogo ? (
                        "Enviando..."
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Alterar Logo
                        </>
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="logo"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    {businessInfo.logo && (
                      <p className="text-xs text-muted-foreground">
                        Tamanho recomendado: 512x512px
                      </p>
                    )}
                  </div>
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
                Configure os horários de funcionamento da sua GENDAIA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {daysOrder.map((day, index) => (
                <div key={day}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-base">{dayNamesPtBR[day]}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`${day}-toggle`}
                        className="text-sm text-muted-foreground"
                      >
                        {businessHours[day as keyof typeof businessHours].isOpen
                          ? "Aberto"
                          : "Fechado"}
                      </Label>
                      <Button
                        id={`${day}-toggle`}
                        variant={
                          businessHours[day as keyof typeof businessHours]
                            .isOpen
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          handleToggleDay(day as keyof typeof businessHours)
                        }
                      >
                        {businessHours[day as keyof typeof businessHours].isOpen
                          ? "Aberto"
                          : "Fechado"}
                      </Button>
                    </div>
                  </div>
                  {businessHours[day as keyof typeof businessHours].isOpen && (
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor={`${day}-open`}>Abertura</Label>
                        <TimeInput
                          id={`${day}-open`}
                          value={
                            businessHours[day as keyof typeof businessHours]
                              .open
                          }
                          onChange={(value) =>
                            handleTimeChange(
                              day as keyof typeof businessHours,
                              "open",
                              value
                            )
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`${day}-close`}>Fechamento</Label>
                        <TimeInput
                          id={`${day}-close`}
                          value={
                            businessHours[day as keyof typeof businessHours]
                              .close
                          }
                          onChange={(value) =>
                            handleTimeChange(
                              day as keyof typeof businessHours,
                              "close",
                              value
                            )
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
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Plano e Assinatura</CardTitle>
              <CardDescription>
                Gerencie seu plano e informações de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscription?.status === "trialing" && (
                <div className="mb-6 p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                  <p className="font-medium">Período de teste</p>
                  <p className="text-sm">
                    Seu período de teste termina em{" "}
                    {new Date(subscription.trial_end_date).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-3">
                {PLANS.map((plan) => (
                  <Card key={plan.name} className="relative">
                    {subscription?.plan === plan.name.toLowerCase() && (
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                        Atual
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold mb-4">
                        {formatPrice(plan.price)}/mês
                      </p>
                      <ul className="space-y-2">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardContent className="pt-0">
                      <Button
                        className="w-full gap-2"
                        variant={
                          subscription?.plan === plan.name.toLowerCase()
                            ? "outline"
                            : "default"
                        }
                        disabled={loading}
                        onClick={() =>
                          handlePlanSelect(plan.name.toLowerCase())
                        }
                      >
                        <CreditCard className="h-4 w-4" />
                        {subscription?.plan === plan.name.toLowerCase()
                          ? "Gerenciar"
                          : "Selecionar"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {subscription?.status === "active" && (
                <div className="mt-6">
                  <Separator className="my-6" />
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Cancelar assinatura</h3>
                      <p className="text-sm text-muted-foreground">
                        Você pode usar o serviço até o fim do período pago
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      disabled={loading}
                      onClick={handleCancelSubscription}
                    >
                      Cancelar assinatura
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

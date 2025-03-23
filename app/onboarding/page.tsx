"use client";

import type React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { OnboardingSteps } from "@/components/onboarding-steps";
import { formatPhoneNumber } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessCheck } from "@/components/dashboard/business-check";
import { ArrowRight, Building, PlusCircle } from "lucide-react";

const businessSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  address: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres"),
  phone: z
    .string()
    .min(5, "Telefone inválido")
    .regex(
      /^\+\d{2}\s\(\d{2}\)/,
      "Formato inválido. Use o formato brasileiro com código do país"
    ),
  email: z.string().email("Email inválido").optional(),
});

type BusinessForm = z.infer<typeof businessSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("join");
  const [hasLinkedBusinesses, setHasLinkedBusinesses] =
    useState<boolean>(false);

  const form = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  useEffect(() => {
    const checkBusinesses = async () => {
      try {
        const response = await fetch("/api/business-check");
        if (response.ok) {
          const data = await response.json();
          setHasLinkedBusinesses(
            data.linkedBusinesses && data.linkedBusinesses.length > 0
          );

          if (!data.linkedBusinesses || data.linkedBusinesses.length === 0) {
            setActiveTab("create");
          }
        }
      } catch (error) {
        console.error("Erro ao verificar negócios vinculados:", error);
      }
    };

    checkBusinesses();
  }, []);

  const onSubmit = async (data: BusinessForm) => {
    try {
      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar organização");
      }

      router.push("/onboarding/plan");
    } catch (error) {
      console.error("Erro ao criar organização:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar organização"
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <OnboardingSteps currentStep={1} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger
            value="join"
            disabled={!hasLinkedBusinesses}
            className="flex items-center gap-2"
          >
            <Building className="h-4 w-4" />
            Entrar em um Negócio
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Criar Novo Negócio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="join" className="mt-0">
          {hasLinkedBusinesses ? (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">
                Vincular-se a um Negócio Existente
              </h2>
              <p className="text-muted-foreground mb-6">
                Encontramos negócios associados ao seu email. Selecione um para
                se vincular:
              </p>
              <BusinessCheck redirectTo="/dashboard/calendar" />
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Nenhum negócio encontrado para se vincular. Crie um novo
                    negócio.
                  </p>
                  <Button
                    onClick={() => setActiveTab("create")}
                    className="mt-2"
                  >
                    Criar Negócio <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create" className="mt-0">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                Criar seu Negócio
              </CardTitle>
              <CardDescription>
                Vamos configurar seu negócio na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do negócio</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Dr. João da Silva, Estética, Barbearia"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Especialidade em atendimento ao cliente"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Rua Exemplo, 123 - Centro"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: +55 (11) 99999-9999"
                            {...field}
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(formatPhoneNumber(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Ex: contato@gendaia.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => router.push("/login")}>
                Voltar
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Criando..." : "Continuar"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

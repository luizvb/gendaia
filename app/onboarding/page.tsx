"use client";

import type React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

      <Card className="mt-8">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            Criar sua Organização
          </CardTitle>
          <CardDescription>
            Vamos configurar seu negócio na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
    </div>
  );
}

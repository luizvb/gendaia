"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Info, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OnboardingSteps } from "@/components/onboarding-steps"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PaymentPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("credit-card")
  const [formData, setFormData] = useState({
    cardNumber: "",
    cardName: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      // Simulação de processamento de pagamento
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Redirecionar para a próxima etapa
      router.push("/onboarding/success")
    } catch (error) {
      console.error("Erro ao processar pagamento:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <OnboardingSteps currentStep={3} />

      <Card className="mt-8">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Informações de Pagamento</CardTitle>
          <CardDescription>Adicione um método de pagamento para sua assinatura</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-lg bg-primary/10 p-4 text-sm">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <p className="font-medium text-primary">Período de teste gratuito</p>
            </div>
            <p className="mt-1 text-muted-foreground">
              Você não será cobrado pelos próximos 7 dias. Você pode cancelar a qualquer momento durante o período de
              teste.
            </p>
          </div>

          <Tabs defaultValue="credit-card" onValueChange={setPaymentMethod}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credit-card">Cartão de Crédito</TabsTrigger>
              <TabsTrigger value="pix">PIX</TabsTrigger>
            </TabsList>
            <TabsContent value="credit-card" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Número do Cartão</Label>
                <Input
                  id="cardNumber"
                  name="cardNumber"
                  placeholder="0000 0000 0000 0000"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardName">Nome no Cartão</Label>
                <Input
                  id="cardName"
                  name="cardName"
                  placeholder="Nome como aparece no cartão"
                  value={formData.cardName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryMonth">Mês</Label>
                  <Select
                    value={formData.expiryMonth}
                    onValueChange={(value) => handleSelectChange("expiryMonth", value)}
                  >
                    <SelectTrigger id="expiryMonth">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = (i + 1).toString().padStart(2, "0")
                        return (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryYear">Ano</Label>
                  <Select
                    value={formData.expiryYear}
                    onValueChange={(value) => handleSelectChange("expiryYear", value)}
                  >
                    <SelectTrigger id="expiryYear">
                      <SelectValue placeholder="AA" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = (new Date().getFullYear() + i).toString().slice(-2)
                        return (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    name="cvv"
                    placeholder="123"
                    value={formData.cvv}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Seus dados de pagamento são criptografados e seguros.</span>
              </div>
            </TabsContent>
            <TabsContent value="pix" className="pt-4">
              <div className="flex flex-col items-center justify-center space-y-4 py-6">
                <div className="rounded-lg border bg-muted p-2">
                  <div className="h-48 w-48 bg-white p-2">
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <span className="text-sm text-muted-foreground">Código QR PIX</span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Escaneie o código QR com seu aplicativo bancário ou copie o código PIX abaixo
                  </p>
                </div>
                <div className="flex w-full items-center space-x-2">
                  <Input
                    readOnly
                    value="00020126580014br.gov.bcb.pix0136a629532e-7693-4846-852d-1bbff817b5a8520400005303986540510.005802BR5909BARBEARIA6008SAOPAULO62090505123456304E2CA"
                  />
                  <Button variant="outline" className="shrink-0">
                    Copiar
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/onboarding/plan")}>
            Voltar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Processando..." : "Iniciar período de teste"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}


"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Building2, CheckCircle, InfoIcon, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface Business {
  id: string;
  name: string;
  description: string | null;
}

interface BusinessLinkProps {
  id: string;
  name: string;
  email: string;
  businesses: Business;
}

interface BusinessCheckProps {
  redirectTo?: string;
}

export function BusinessCheck({ redirectTo }: BusinessCheckProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [linkedBusinesses, setLinkedBusinesses] = useState<BusinessLinkProps[]>(
    []
  );
  const [hasExistingBusiness, setHasExistingBusiness] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkBusinessLinks();
  }, []);

  const checkBusinessLinks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/business-check");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check business links");
      }

      const data = await response.json();
      console.log("Business check response:", data); // Debug log
      setLinkedBusinesses(data.linkedBusinesses || []);
      setHasExistingBusiness(data.hasExistingBusiness || false);
    } catch (error) {
      console.error("Error checking business links:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao verificar negócios"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinBusiness = async (businessId: string) => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/business-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to join business");
      }

      toast.success("Vinculado ao negócio com sucesso");

      // Redirecionar para a rota especificada ou apenas atualizar
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Error joining business:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to join business"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewBusiness = () => {
    router.push("/onboarding");
  };

  // Don't show anything if user already has a business or there are no links
  if (hasExistingBusiness || (!isLoading && linkedBusinesses.length === 0)) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="bg-muted/50 pb-4">
        <CardTitle className="flex items-center text-xl">
          <Building2 className="h-5 w-5 mr-2 text-primary" />
          Negócios Vinculados
        </CardTitle>
        <CardDescription>
          Você foi convidado para os seguintes negócios:
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : linkedBusinesses.length > 0 ? (
          <div className="space-y-3">
            {linkedBusinesses.map((link) => (
              <Card key={link.id} className="border border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {link.businesses.name}
                  </CardTitle>
                  {link.businesses.description && (
                    <CardDescription>
                      {link.businesses.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardFooter className="border-t bg-muted/30 pt-3 flex justify-between">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <InfoIcon className="h-4 w-4 mr-1" />
                    Baseado no seu email: {link.email}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleJoinBusiness(link.businesses.id)}
                    disabled={isLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Entrar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            Nenhum negócio vinculado encontrado
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t bg-muted/50 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleCreateNewBusiness}
          disabled={isLoading}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Criar Novo Negócio
        </Button>
      </CardFooter>
    </Card>
  );
}

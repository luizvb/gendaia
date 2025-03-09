"use client";

import { useState, useEffect } from "react";
import { X, Share2, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface IOSPWAPromptProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export function IOSPWAPrompt({
  forceShow = false,
  onClose,
}: IOSPWAPromptProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Check if device is iOS
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if app is already in standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;
    setIsStandalone(standalone);

    // Check if we've already prompted the user
    const hasShownPrompt = localStorage.getItem("pwa-prompt-shown");
    setHasPrompted(!!hasShownPrompt);

    // Show prompt if iOS, not standalone, and not already prompted
    if (iOS && !standalone && !hasShownPrompt) {
      // Delay prompt to avoid showing immediately on page load
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (forceShow) {
      setShowPrompt(true);
      setStep(1);
    }
  }, [forceShow]);

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-shown", "true");
    if (onClose) onClose();
  };

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (!isIOS && !forceShow) {
    return null;
  }

  if (isStandalone && !forceShow) {
    return null;
  }

  if (hasPrompted && !showPrompt && !forceShow) {
    return null;
  }

  return (
    <Dialog
      open={showPrompt}
      onOpenChange={(open) => {
        setShowPrompt(open);
        if (!open && onClose) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Experimente em tela cheia!
          </DialogTitle>
          <DialogDescription>
            Adicione o GENDAIA à sua tela inicial para uma experiência completa
            sem a barra de endereço.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <div className="bg-primary text-primary-foreground p-2 rounded-full">
                  <Share2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Passo 1</h3>
                  <p className="text-sm text-muted-foreground">
                    Toque no botão de compartilhamento no Safari
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative border-8 border-gray-800 rounded-3xl w-64 h-auto p-2 bg-gray-200">
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gray-500 rounded-full"></div>
                  <div className="mt-4 bg-white rounded-lg p-2 h-32 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <div className="w-full flex justify-end mb-4">
                        <div className="bg-blue-500 text-white p-1 rounded">
                          <Share2 className="h-6 w-6" />
                        </div>
                      </div>
                      <div className="w-32 h-4 bg-gray-300 rounded mb-2"></div>
                      <div className="w-24 h-4 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <div className="bg-primary text-primary-foreground p-2 rounded-full">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Passo 2</h3>
                  <p className="text-sm text-muted-foreground">
                    Role para baixo e toque em "Adicionar à Tela de Início"
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative border-8 border-gray-800 rounded-3xl w-64 h-auto p-2 bg-gray-200">
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gray-500 rounded-full"></div>
                  <div className="mt-4 bg-white rounded-lg p-2 h-32 overflow-hidden">
                    <div className="flex flex-col space-y-3 p-2">
                      <div className="w-full h-8 bg-gray-200 rounded flex items-center px-2">
                        <div className="w-6 h-6 bg-gray-400 rounded mr-2"></div>
                        <div className="w-24 h-3 bg-gray-300 rounded"></div>
                      </div>
                      <div className="w-full h-8 bg-gray-200 rounded flex items-center px-2">
                        <div className="w-6 h-6 bg-gray-400 rounded mr-2"></div>
                        <div className="w-24 h-3 bg-gray-300 rounded"></div>
                      </div>
                      <div className="w-full h-8 bg-blue-100 rounded flex items-center px-2">
                        <div className="w-6 h-6 bg-blue-400 rounded mr-2 flex items-center justify-center">
                          <Plus className="h-4 w-4 text-white" />
                        </div>
                        <div className="w-40 h-3 bg-blue-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <div className="bg-primary text-primary-foreground p-2 rounded-full">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Passo 3</h3>
                  <p className="text-sm text-muted-foreground">
                    Toque em "Adicionar" no canto superior direito
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative border-8 border-gray-800 rounded-3xl w-64 h-auto p-2 bg-gray-200">
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gray-500 rounded-full"></div>
                  <div className="mt-4 bg-white rounded-lg p-2 h-32">
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-center p-1 border-b">
                        <div className="w-12 h-3 bg-gray-300 rounded"></div>
                        <div className="w-16 h-4 bg-blue-500 rounded text-white text-xs flex items-center justify-center">
                          Adicionar
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-gray-300 rounded-xl mb-2"></div>
                        <div className="w-24 h-3 bg-gray-300 rounded mb-1"></div>
                        <div className="w-32 h-2 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={prevStep}>
              Voltar
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Agora não
            </Button>
          )}

          <div className="flex items-center gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  step === i ? "bg-primary w-4" : "bg-gray-300"
                )}
              />
            ))}
          </div>

          <Button onClick={nextStep}>{step < 3 ? "Próximo" : "Entendi"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

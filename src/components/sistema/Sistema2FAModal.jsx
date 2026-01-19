import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  X
} from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Sistema2FAModal({ open, onVerified }) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutos em segundos
  const [canResend, setCanResend] = useState(false);
  const [codeGenerated, setCodeGenerated] = useState(false);

  // Gerar código ao abrir o modal
  useEffect(() => {
    if (open && !codeGenerated) {
      generateCode();
    }
  }, [open, codeGenerated]);

  // Countdown timer
  useEffect(() => {
    if (!open || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, timeRemaining]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateCode = async () => {
    setIsGenerating(true);
    setError("");
    setSuccess("");

    try {
      const response = await base44.functions.invoke('generateSistema2FACode', {});
      
      if (response.data.success) {
        setSuccess("Código enviado por e-mail para todos os administradores!");
        setTimeRemaining(300);
        setCanResend(false);
        setCodeGenerated(true);
      } else {
        setError(response.data.error || "Erro ao gerar código");
      }
    } catch (err) {
      console.error("Erro ao gerar código:", err);
      setError("Erro ao gerar código. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Digite um código de 6 caracteres");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await base44.functions.invoke('verifySistema2FACode', {
        code: code.toUpperCase()
      });

      if (response.data.success) {
        setSuccess("Código verificado! Acessando sistema...");
        setTimeout(() => {
          onVerified();
        }, 1000);
      } else {
        setError(response.data.error || "Código incorreto");
        setCode("");
      }
    } catch (err) {
      console.error("Erro ao verificar código:", err);
      setError(err.response?.data?.error || "Erro ao verificar código");
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setCode(value);
      setError("");
    }
  };

  const handleResend = () => {
    setCode("");
    setError("");
    setSuccess("");
    setCodeGenerated(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-lg rounded-3xl p-0 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Autenticação de 2 Fatores
                </DialogTitle>
                <p className="text-sm text-gray-600">
                  Área Restrita do Sistema
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info Alert */}
          <Alert className="rounded-2xl border-blue-200 bg-blue-50">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              Um código de 6 dígitos foi enviado por e-mail para todos os administradores do sistema.
            </AlertDescription>
          </Alert>

          {/* Timer */}
          {!canResend && timeRemaining > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
              <Clock className="w-4 h-4" />
              <span>Código expira em: <strong>{formatTime(timeRemaining)}</strong></span>
            </div>
          )}

          {/* Code Input */}
          <div className="space-y-2">
            <Label htmlFor="code" className="text-sm font-medium">Digite o código</Label>
            <Input
              id="code"
              value={code}
              onChange={handleCodeChange}
              placeholder="ABC123"
              className="text-center text-2xl font-bold tracking-widest rounded-xl h-14 border-gray-200"
              maxLength={6}
              disabled={isVerifying || isGenerating}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && code.length === 6) {
                  handleVerify();
                }
              }}
            />
            <p className="text-xs text-gray-500 text-center">
              Letras e números (6 caracteres)
            </p>
          </div>

          {/* Error */}
          {error && (
            <Alert className="rounded-2xl border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {success && (
            <Alert className="rounded-2xl border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || isVerifying || isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl h-12"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Código'
              )}
            </Button>

            <Button
              onClick={handleResend}
              disabled={!canResend || isGenerating || isVerifying}
              variant="outline"
              className="w-full rounded-xl h-12"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : canResend ? (
                'Reenviar Código'
              ) : (
                `Reenviar (${formatTime(timeRemaining)})`
              )}
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 text-center pt-2">
            O código expira em 5 minutos. Você tem 3 tentativas para digitar o código correto.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
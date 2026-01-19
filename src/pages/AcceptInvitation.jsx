import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User } from "@/entities/User";
import { acceptInvitation } from "@/functions/acceptInvitation"; // Updated function
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, LogIn, UserPlus } from "lucide-react";

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("loading"); // loading, success, error, authenticating
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const handleInvitation = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get("invite");

      if (!token) {
        setError("Token de convite inválido ou ausente.");
        setStatus("error");
        return;
      }

      try {
        const user = await User.me();
        setCurrentUser(user);
        setStatus("processing");

        const response = await acceptInvitation({ token });
        
        if (response.data.success) {
          setStatus("success");
          // CRÍTICO: Fazer logout primeiro para limpar token JWT antigo
          // Depois forçar novo login para gerar token com company_id atualizado
          setTimeout(async () => {
            await User.logout();
            window.location.href = "/";
          }, 2000);
        } else {
          throw new Error(response.data.error || "Falha ao aceitar o convite.");
        }
      } catch (authError) {
        console.error("Erro ao processar convite:", authError);
        
        // Se o erro for de autenticação, redirecionar para login
        if (authError.message?.includes('not authenticated') || authError.message?.includes('401')) {
          setStatus("authenticating");
          await User.loginWithRedirect(window.location.href);
        } else {
          // Erro ao aceitar o convite
          setError(authError.message || "Erro ao aceitar o convite. Por favor, tente novamente.");
          setStatus("error");
        }
      }
    };

    handleInvitation();
  }, [location, navigate]);

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Validando seu convite...</p>
          </div>
        );
      case "authenticating":
        return (
          <div className="text-center">
            <LogIn className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Redirecionando para o login. Você voltará em breve!</p>
          </div>
        );
      case "processing":
         return (
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Processando sua entrada na equipe...</p>
          </div>
        );
      case "success":
        return (
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">Bem-vindo(a) à equipe!</CardTitle>
            <CardDescription className="mt-2">
              Você foi adicionado com sucesso. Redirecionando para o painel...
            </CardDescription>
          </div>
        );
      case "error":
        return (
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">Ocorreu um erro</CardTitle>
            <Alert variant="destructive" className="mt-4 text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="mt-6">
              Ir para o Painel
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl shadow-xl">
        <CardContent className="p-8">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
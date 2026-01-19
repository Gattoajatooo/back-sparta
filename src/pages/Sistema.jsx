import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Shield,
  Database,
  Key,
  Globe,
  AlertCircle,
  Lock,
  Bell
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Sistema2FAModal from "@/components/sistema/Sistema2FAModal";
import DatabaseSection from "@/components/sistema/DatabaseSection";
import APISection from "@/components/sistema/APISection";
import SecuritySection from "@/components/sistema/SecuritySection";
import KeysSection from "@/components/sistema/KeysSection";
import NotificationsSection from "@/components/sistema/NotificationsSection";

export default function Sistema() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [activeTab, setActiveTab] = useState("database");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        // Verificar se é admin
        if (currentUser.role !== 'admin') {
          navigate(createPageUrl("Dashboard"), { replace: true });
          return;
        }

        // Verificar se já está autenticado (cache de 1 hora)
        const cached2FA = localStorage.getItem('sistema_2fa_verified');
        if (cached2FA) {
          try {
            const { timestamp, userId } = JSON.parse(cached2FA);
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            
            // Se foi verificado há menos de 1 hora e é o mesmo usuário
            if (timestamp > oneHourAgo && userId === currentUser.id) {
              setIsVerified(true);
              setIsLoading(false);
              return;
            } else {
              // Expirou ou usuário diferente, limpar cache
              localStorage.removeItem('sistema_2fa_verified');
            }
          } catch (e) {
            localStorage.removeItem('sistema_2fa_verified');
          }
        }

        // Não está autenticado, mostrar modal 2FA
        setShow2FAModal(true);
        
      } catch (error) {
        console.error("Error loading user:", error);
        navigate(createPageUrl("Dashboard"), { replace: true });
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  const handle2FAVerified = () => {
    // Armazenar verificação por 1 hora
    const verificationData = {
      timestamp: Date.now(),
      userId: user.id
    };
    localStorage.setItem('sistema_2fa_verified', JSON.stringify(verificationData));
    
    setShow2FAModal(false);
    setIsVerified(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Alert className="max-w-md rounded-2xl border-red-200 bg-red-50">
          <Lock className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Acesso negado. Esta página é restrita a administradores.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Se ainda não verificou 2FA, não mostrar conteúdo
  if (!isVerified) {
    return (
      <>
        <Sistema2FAModal 
          open={show2FAModal} 
          onVerified={handle2FAVerified}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Autenticação Necessária</h2>
            <p className="text-gray-600">Verificando autenticação de 2 fatores...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sistema</h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
              Configurações avançadas e gerenciamento do sistema
            </p>
          </div>
        </div>
      </div>

      {/* Admin Only Badge */}
      <Alert className="rounded-2xl border-purple-200 bg-purple-50">
        <Shield className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          Área restrita a administradores do sistema - Autenticação 2FA verificada
        </AlertDescription>
      </Alert>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-2xl bg-gray-100 p-1 text-muted-foreground">
          <TabsTrigger value="database" className="rounded-xl px-3">
            <Database className="w-4 h-4 mr-2" />
            Banco de Dados
          </TabsTrigger>
          <TabsTrigger value="api" className="rounded-xl px-3">
            <Globe className="w-4 h-4 mr-2" />
            API & Webhooks
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl px-3">
            <Shield className="w-4 h-4 mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="keys" className="rounded-xl px-3">
            <Key className="w-4 h-4 mr-2" />
            Chaves & Secrets
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl px-3">
            <Bell className="w-4 h-4 mr-2" />
            Notificações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-4">
          <DatabaseSection />
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <APISection />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecuritySection />
        </TabsContent>

        <TabsContent value="keys" className="space-y-4">
          <KeysSection />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
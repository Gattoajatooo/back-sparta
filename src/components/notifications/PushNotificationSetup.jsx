import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PushNotificationSetup({ user }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [preferences, setPreferences] = useState({
    enabled: true,
    campaignCompleted: true,
    campaignFailed: true,
    batchApprovalNeeded: true,
    messageReceived: false
  });

  useEffect(() => {
    checkSubscriptionStatus();
    loadPreferences();
  }, [user]);

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 5000);
  };

  const loadPreferences = async () => {
    if (user?.notificationPreferences) {
      setPreferences(user.notificationPreferences);
    }
  };

  const checkSubscriptionStatus = async () => {
    setIsLoading(true);
    try {
      if (!('Notification' in window)) {
        console.log('Browser não suporta notificações');
        setIsSubscribed(false);
        return;
      }

      if (!('serviceWorker' in navigator)) {
        console.log('Service Worker não suportado');
        setIsSubscribed(false);
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        console.log('Nenhum Service Worker registrado');
        setIsSubscribed(false);
        return;
      }

      const subscription = await registration.pushManager.getSubscription();

      if (subscription && user?.pushSubscription?.endpoint) {
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Erro ao verificar status de notificação:', error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    setIsSaving(true);
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        showNotification('error', 'Você precisa permitir notificações para continuar.');
        setIsSaving(false);
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        showNotification('error', 'Service Worker não está registrado. Recarregue a página e tente novamente.');
        setIsSaving(false);
        return;
      }

      await navigator.serviceWorker.ready;

      const vapidPublicKey = 'BFojeVSFRuS7-jQrepm6RAJyQI9CxVm4F4pwHrPmAdUweAbN8t9uq1lWNek3OCV0lyyclQ_f7Asdv9BuLZlmIE4';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      await base44.auth.updateMe({
        pushSubscription: subscription.toJSON()
      });

      setIsSubscribed(true);
      showNotification('success', 'Notificações ativadas com sucesso!');

    } catch (error) {
      console.error('Erro ao se inscrever em notificações:', error);
      showNotification('error', `Erro ao ativar notificações: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsSaving(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      await base44.auth.updateMe({
        pushSubscription: null
      });

      setIsSubscribed(false);
      showNotification('success', 'Notificações desativadas.');

    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      showNotification('error', `Erro ao desativar notificações: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreferences = async (newPreferences) => {
    try {
      await base44.auth.updateMe({
        notificationPreferences: newPreferences
      });
      setPreferences(newPreferences);
      showNotification('success', 'Preferências atualizadas!');
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
      showNotification('error', 'Erro ao salvar preferências.');
    }
  };

  if (!('Notification' in window)) {
    return (
      <Alert className="rounded-2xl">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Seu navegador não suporta notificações push.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {notification.show && (
        <Alert className={`rounded-2xl ${notification.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Receba notificações em tempo real sobre suas campanhas e atividades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <BellOff className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Notificações Push Desativadas
                    </p>
                    <p className="text-sm text-gray-500">
                      Recurso temporariamente indisponível
                    </p>
                  </div>
                </div>
                <Button
                  disabled={true}
                  className="rounded-xl bg-gray-300 cursor-not-allowed"
                >
                  Desabilitado
                </Button>
              </div>

              {isSubscribed && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold text-gray-900">Tipos de Notificação</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="campaignCompleted" className="flex-1 cursor-pointer">
                        Campanhas Concluídas
                        <p className="text-sm text-gray-500 font-normal">Notificar quando uma campanha terminar</p>
                      </Label>
                      <Switch
                        id="campaignCompleted"
                        checked={preferences.campaignCompleted}
                        onCheckedChange={(checked) => 
                          updatePreferences({ ...preferences, campaignCompleted: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="campaignFailed" className="flex-1 cursor-pointer">
                        Falhas em Campanhas
                        <p className="text-sm text-gray-500 font-normal">Notificar quando uma campanha falhar</p>
                      </Label>
                      <Switch
                        id="campaignFailed"
                        checked={preferences.campaignFailed}
                        onCheckedChange={(checked) => 
                          updatePreferences({ ...preferences, campaignFailed: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="batchApprovalNeeded" className="flex-1 cursor-pointer">
                        Aprovações Pendentes
                        <p className="text-sm text-gray-500 font-normal">Notificar quando lotes precisarem de aprovação</p>
                      </Label>
                      <Switch
                        id="batchApprovalNeeded"
                        checked={preferences.batchApprovalNeeded}
                        onCheckedChange={(checked) => 
                          updatePreferences({ ...preferences, batchApprovalNeeded: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="messageReceived" className="flex-1 cursor-pointer">
                        Mensagens Recebidas
                        <p className="text-sm text-gray-500 font-normal">Notificar quando receber uma mensagem nova</p>
                      </Label>
                      <Switch
                        id="messageReceived"
                        checked={preferences.messageReceived}
                        onCheckedChange={(checked) => 
                          updatePreferences({ ...preferences, messageReceived: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
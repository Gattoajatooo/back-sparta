import React, { useState, useCallback, useRef } from "react";
import { User } from "@/entities/User";
import { Session } from "@/entities/Session";
import { Plan } from "@/entities/Plan";
import { Company } from "@/entities/Company";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Hash,
  Building2
} from "lucide-react";

import { createWhatsAppSession } from "@/functions/createWhatsAppSession";
import { getSessionQR } from "@/functions/getSessionQR";
import { requestPairingCode } from "@/functions/requestPairingCode";
import { checkExistsContact } from "@/functions/checkExistsContact";
import { getSubscriptionStatus } from "@/functions/getSubscriptionStatus";
import { base44 } from "@/api/base44Client"; // Added import
import { useWebSocket } from "../hooks/useWebSocket";

export default function ConnectSessionModal({ open, onClose, onSessionCreated }) {
  const [user, setUser] = useState(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('ready');
  const [connectionMethod, setConnectionMethod] = useState(null); // 'qr' or 'code'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [sessionLimit, setSessionLimit] = useState(null);
  const [activeSessions, setActiveSessions] = useState(0);

  const sessionNameRef = useRef('');
  const onSessionCreatedRef = useRef(onSessionCreated);

  React.useEffect(() => {
    sessionNameRef.current = sessionName;
  }, [sessionName]);

  React.useEffect(() => {
    onSessionCreatedRef.current = onSessionCreated;
  }, [onSessionCreated]);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        await loadSessionLimits(currentUser);
      } catch (error) {
        console.error('[ConnectSessionModal] Erro ao carregar usuário:', error);
      }
    };
    if (open) {
      loadUser();
    }
  }, [open]);

  const loadSessionLimits = async (currentUser) => {
    try {
      const { data } = await getSubscriptionStatus();
      if (data?.success && data.has_active_subscription) {
        const planId = data.subscription.metadata?.plan_id;
        if (planId) {
          try {
            const currentPlan = await Plan.get(planId);
            setSessionLimit(currentPlan.active_sessions);

            const sessions = await Session.filter({
              company_id: currentUser.company_id,
              is_deleted: { '$ne': true },
              status: { '$in': ['WORKING', 'SCAN_QR_CODE', 'STARTING'] }
            });
            setActiveSessions(sessions.length);
          } catch (planError) {
            console.warn('Plano não encontrado:', planId);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar limites:", error);
    }
  };

  const fetchQRCode = useCallback(async (sessionNameParam) => {
    if (!sessionNameParam) return;
    
    try {
      console.log(`[ConnectSessionModal] 🔍 Buscando QR Code: ${sessionNameParam}`);
      
      const response = await getSessionQR({ sessionName: sessionNameParam });

      if (response.data && response.data.success) {
        const qrCodeData = response.data.qr_code;
        let qrDataUrl;

        if (qrCodeData && typeof qrCodeData === 'object' && qrCodeData.data) {
          qrDataUrl = `data:${qrCodeData.mimetype || 'image/png'};base64,${qrCodeData.data}`;
        } else if (typeof qrCodeData === 'string') {
          qrDataUrl = qrCodeData.startsWith('data:image') ? qrCodeData : `data:image/png;base64,${qrCodeData}`;
        } else {
          throw new Error('Invalid QR Code format received.');
        }

        setQrCode(qrDataUrl);
        console.log('[ConnectSessionModal] ✅ QR obtido');
      } else {
        throw new Error(response.data?.error || 'Erro ao buscar QR Code');
      }
    } catch (error) {
      console.error('[ConnectSessionModal] ❌ Erro QR:', error.message);
      setError(`Erro ao buscar QR Code: ${error.message}`);
    }
  }, []);

  const fetchSessionProfile = useCallback(async (sessionNameParam) => {
    try {
      console.log(`[ConnectSessionModal] 🔍 Buscando perfil da sessão: ${sessionNameParam}`);
      
      const response = await base44.functions.invoke('getSessionStatus', { 
        sessionName: sessionNameParam 
      });

      if (response.data?.success && response.data.session?.me) {
        const { me } = response.data.session;
        const phone = me.id?.split('@')[0] || null;
        const pushName = me.pushName || null;

        console.log(`[ConnectSessionModal] ✅ Perfil obtido - Nome: ${pushName}, Phone: ${phone}`);

        if (user?.company_id) {
          const sessions = await Session.filter({
            company_id: user.company_id,
            session_name: sessionNameParam
          });

          if (sessions && sessions.length > 0) {
            const sessionId = sessions[0].id;
            
            // Atualizar dados básicos
            await Session.update(sessionId, {
              phone: phone,
              push_name: pushName
            });
            console.log(`[ConnectSessionModal] ✅ Sessão atualizada no banco`);

            // Buscar foto do perfil via getWaProfile
            try {
              console.log(`[ConnectSessionModal] 📸 Buscando foto do perfil...`);
              const profileResponse = await base44.functions.invoke('getWaProfile', {
                sessionName: sessionNameParam
              });

              if (profileResponse.data?.success && profileResponse.data.profile?.picture) {
                await Session.update(sessionId, {
                  avatar_url: profileResponse.data.profile.picture
                });
                console.log(`[ConnectSessionModal] ✅ Foto do perfil salva`);
              }
            } catch (profileError) {
              console.warn('[ConnectSessionModal] ⚠️ Não foi possível buscar foto:', profileError.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('[ConnectSessionModal] ❌ Erro ao buscar perfil:', error.message);
    }
  }, [user]);

  const handleWebSocketMessage = useCallback((wsData) => {
    console.log('[ConnectSessionModal] 📡 WebSocket Raw Data:', JSON.stringify(wsData, null, 2));
    
    if (wsData.type === 'session_updated') {
      const receivedSessionName = wsData.session_name || wsData.data?.session_name;
      const status = wsData.status || wsData.data?.status;
      
      console.log(`[ConnectSessionModal] 📡 Received Session: ${receivedSessionName}, Current Expected: ${sessionNameRef.current}, Status: ${status}, Company_id: ${wsData.company_id}`);
      
      if (!sessionNameRef.current || receivedSessionName !== sessionNameRef.current) {
        console.log(`[ConnectSessionModal] 📡 Ignoring update for session ${receivedSessionName} (not matching current ${sessionNameRef.current})`);
        return;
      }
      
      console.log(`[ConnectSessionModal] 📡 Processing Status: ${status}`);
      
      if (status === 'SCAN_QR_CODE') {
        console.log('[ConnectSessionModal] 📡 Setting status to choose_method');
        setConnectionStatus('choose_method');
      } 
      else if (status === 'WORKING') {
        console.log('[ConnectSessionModal] ✅ Conectado!');
        setConnectionStatus('connected');
        setSuccessMessage('Sessão conectada com sucesso!');
        
        fetchSessionProfile(sessionNameRef.current);
        
        setTimeout(() => {
          if (onSessionCreatedRef.current) onSessionCreatedRef.current();
          handleClose();
        }, 2000);
      }
      else if (status === 'FAILED') {
        console.log('[ConnectSessionModal] ❌ Session FAILED');
        setConnectionStatus('ready');
        setError('A sessão falhou. Tente criar uma nova.');
        setSessionName('');
        sessionNameRef.current = '';
      }
    } else {
      console.log(`[ConnectSessionModal] 📡 Ignoring WebSocket type: ${wsData.type}`);
    }
  }, [fetchSessionProfile]);

  useWebSocket(
    open && user?.company_id ? user.company_id : null,
    handleWebSocketMessage,
    ['session_updated']
  );

  const createSession = async () => {
    try {
      setError('');
      setSuccessMessage('');
      setIsCreatingSession(true);

      console.log('[ConnectSessionModal] ⏳ Criando sessão...');
      
      const response = await createWhatsAppSession({});
      
      if (response.data && response.data.success) {
        const { session } = response.data;
        console.log(`[ConnectSessionModal] ✅ Criada: ${session.name}`);
        
        setSessionName(session.name);
        sessionNameRef.current = session.name;
        setConnectionStatus('waiting');
        setSuccessMessage(`Sessão criada! Preparando conexão...`);
        
      } else {
        throw new Error(response.data?.error || 'Falha ao criar sessão');
      }
    } catch (error) {
      console.error("[ConnectSessionModal] ❌ Erro:", error);
      
      if (error.response?.status === 403) {
        const errorMsg = error.response?.data?.error || error.message;
        setError(errorMsg);
      } else {
        setError(`Falha ao criar sessão: ${error.message || error}`);
      }
      setConnectionStatus('ready');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleChooseQRCode = async () => {
    setConnectionMethod('qr');
    setConnectionStatus('qr_ready');
    await fetchQRCode(sessionName);
  };

  const handleChooseCode = () => {
    setConnectionMethod('code');
    setConnectionStatus('code_input');
  };

  const handleRequestCode = async () => {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      setError('Digite um número de telefone');
      return;
    }

    setError('');
    setIsCheckingPhone(true);

    try {
      // Verificar se o número existe
      console.log('[ConnectSessionModal] 🔍 Verificando número...');
      const checkResponse = await checkExistsContact({ phones: [phoneNumber] });

      if (!checkResponse.data?.success || !checkResponse.data.results || checkResponse.data.results.length === 0) {
        setError('Erro ao verificar número');
        return;
      }

      const result = checkResponse.data.results[0];

      if (!result.exists) {
        setError('❌ Este número não existe no WhatsApp');
        return;
      }

      console.log('[ConnectSessionModal] ✅ Número verificado. Solicitando código...');
      setIsCheckingPhone(false);
      setIsRequestingCode(true);

      // Solicitar código de pareamento
      const codeResponse = await requestPairingCode({
        sessionName: sessionName,
        phoneNumber: phoneNumber
      });

      if (codeResponse.data?.success && codeResponse.data.code) {
        setPairingCode(codeResponse.data.code);
        setConnectionStatus('code_ready');
        console.log('[ConnectSessionModal] ✅ Código gerado:', codeResponse.data.code);
      } else {
        throw new Error(codeResponse.data?.error || 'Erro ao solicitar código');
      }

    } catch (error) {
      console.error('[ConnectSessionModal] ❌ Erro:', error);
      setError(`Erro: ${error.message || error}`);
    } finally {
      setIsCheckingPhone(false);
      setIsRequestingCode(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccessMessage('');
    setIsCreatingSession(false);
    setSessionName('');
    sessionNameRef.current = '';
    setQrCode('');
    setPairingCode('');
    setConnectionStatus('ready');
    setConnectionMethod(null);
    setPhoneNumber('');
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 bg-white rounded-[2.5rem] border-gray-200 overflow-y-auto [&>button]:hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Nova Sessão WhatsApp</h2>
                <p className="text-sm text-gray-600">Conecte uma nova conta do WhatsApp</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <Alert variant="destructive" className="rounded-2xl border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
                {sessionLimit !== null && error.includes('Limite') && (
                  <div className="mt-2 p-3 bg-red-100 rounded-xl border border-red-200">
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      📊 Status das Sessões
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-800">Sessões Ativas:</span>
                      <span className="font-bold text-red-900">{activeSessions}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-800">Limite do Plano:</span>
                      <span className="font-bold text-red-900">
                        {sessionLimit === -1 ? '∞' : sessionLimit}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-red-300">
                      <p className="text-xs text-red-800">
                        💡 Dica: Pause ou exclua uma sessão inativa para liberar espaço, ou faça upgrade do seu plano.
                      </p>
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="rounded-2xl border-blue-200 bg-blue-50">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Estado: Ready */}
          {connectionStatus === 'ready' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Como Funciona</h3>
                <div className="grid gap-3">
                  {[
                    { step: "1", title: "Criar Sessão", desc: "Clique para iniciar uma nova conexão" },
                    { step: "2", title: "Aguardar Preparação", desc: "Sistema prepara a sessão automaticamente" },
                    { step: "3", title: "Escolher Método", desc: "QR Code ou Código de Pareamento" },
                    { step: "4", title: "Conectar", desc: "Use o WhatsApp do seu celular" }
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                        <p className="text-sm text-gray-600 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="rounded-2xl border-gray-200">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                    <Smartphone className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Pronto para Conectar</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Crie uma nova sessão e aguarde a inicialização automática
                  </p>
                  {sessionLimit !== null && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Sessões Ativas:</span>
                        <span className="font-bold text-gray-900">
                          {activeSessions} / {sessionLimit === -1 ? '∞' : sessionLimit}
                        </span>
                      </div>
                    </div>
                  )}
                  <Button 
                    onClick={createSession} 
                    disabled={isCreatingSession}
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isCreatingSession ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando Sessão...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Sessão
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Estado: Waiting */}
          {connectionStatus === 'waiting' && (
            <Card className="rounded-2xl border-blue-200 bg-blue-50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Preparando Conexão...</h4>
                <p className="text-sm text-gray-600 mb-3">
                  ID: <code className="bg-white px-2 py-1 rounded text-xs font-mono border border-gray-200">{sessionName}</code>
                </p>
                <p className="text-sm text-gray-600">
                  Estamos configurando sua sessão. Em breve você poderá escolher como conectar.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Estado: Choose Method */}
          {connectionStatus === 'choose_method' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 text-center">Escolha o Método de Conexão</h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono border border-gray-200">{sessionName}</code>
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <Card className="rounded-2xl border-gray-200 hover:border-blue-500 transition-colors cursor-pointer" onClick={handleChooseQRCode}>
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200">
                      <QrCode className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">QR Code</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Escaneie o código com seu celular
                    </p>
                    <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                      Usar QR Code
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-gray-200 hover:border-green-500 transition-colors cursor-pointer" onClick={handleChooseCode}>
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-200">
                      <Hash className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Código</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Digite um código de pareamento
                    </p>
                    <Button className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white">
                      Usar Código
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Estado: Code Input */}
          {connectionStatus === 'code_input' && (
            <Card className="rounded-2xl border-green-200 bg-green-50">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-200">
                  <Hash className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-center">Digite o Número do WhatsApp</h4>
                <p className="text-sm text-gray-600 mb-4 text-center">
                  ID: <code className="bg-white px-2 py-1 rounded text-xs font-mono border border-gray-200">{sessionName}</code>
                </p>
                
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Ex: 5531999998888"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="text-center text-lg"
                    disabled={isCheckingPhone || isRequestingCode}
                  />
                  
                  <Button
                    onClick={handleRequestCode}
                    disabled={isCheckingPhone || isRequestingCode || !phoneNumber}
                    className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isCheckingPhone ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verificando Número...
                      </>
                    ) : isRequestingCode ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Solicitando Código...
                      </>
                    ) : (
                      'Solicitar Código'
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setConnectionStatus('choose_method')}
                    className="w-full rounded-xl"
                  >
                    Voltar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado: Code Ready */}
          {connectionStatus === 'code_ready' && pairingCode && (
            <Card className="rounded-2xl border-green-200 bg-green-50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-200">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Código de Pareamento</h4>
                <p className="text-sm text-gray-600 mb-3">
                  ID: <code className="bg-white px-2 py-1 rounded text-xs font-mono border border-gray-200">{sessionName}</code>
                </p>
                
                <div className="bg-white border-2 border-green-300 rounded-2xl p-6 mb-4">
                  <p className="text-4xl font-bold text-green-700 tracking-wider font-mono">
                    {pairingCode}
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-green-200 mb-4">
                  <p className="text-sm text-gray-900 font-medium mb-2">
                    📱 No seu celular:
                  </p>
                  <ol className="text-sm text-gray-600 text-left space-y-1">
                    <li>1. Abra o WhatsApp</li>
                    <li>2. Vá em Configurações → Dispositivos Conectados</li>
                    <li>3. Toque em "Conectar Dispositivo"</li>
                    <li>4. Selecione "Conectar com número de telefone"</li>
                    <li>5. Digite o código acima</li>
                  </ol>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Aguardando confirmação...
                  </p>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPairingCode('');
                      setPhoneNumber('');
                      setConnectionStatus('choose_method');
                    }}
                    className="w-full rounded-xl"
                  >
                    Voltar e Trocar Método
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado: QR Ready */}
          {connectionStatus === 'qr_ready' && qrCode && (
            <Card className="rounded-2xl border-blue-200 bg-blue-50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200">
                  <QrCode className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Escaneie o QR Code</h4>
                <p className="text-sm text-gray-600 mb-3">
                  ID: <code className="bg-white px-2 py-1 rounded text-xs font-mono border border-gray-200">{sessionName}</code>
                </p>
                
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 mb-4 inline-block">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64 rounded-xl" />
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-900 font-medium mb-2">
                    📱 No seu celular:
                  </p>
                  <p className="text-sm text-gray-600">
                    WhatsApp → Configurações → Dispositivos Conectados → Conectar Dispositivo
                  </p>
                </div>
                
                <div className="space-y-2 mt-4">
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Aguardando escaneamento...
                  </p>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQrCode('');
                      setConnectionStatus('choose_method');
                    }}
                    className="w-full rounded-xl"
                  >
                    Voltar e Trocar Método
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado: Connected */}
          {connectionStatus === 'connected' && (
            <Card className="rounded-2xl border-green-200 bg-green-50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-200">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Conectado com Sucesso!</h4>
                <p className="text-sm text-gray-600 mb-3">
                  ID: <code className="bg-white px-2 py-1 rounded text-xs font-mono border border-gray-200">{sessionName}</code>
                </p>
                <p className="text-sm text-gray-600">
                  Sua sessão WhatsApp está ativa e pronta para enviar mensagens!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
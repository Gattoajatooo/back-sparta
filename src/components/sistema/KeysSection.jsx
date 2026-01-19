import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Key,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Edit,
  Trash2,
  RefreshCw
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import SecretFormModal from "./SecretFormModal";

// Chaves padrões do sistema - CONSTANTE FORA DO COMPONENTE
const SYSTEM_KEYS = [
  { name: 'NOTIFICATION_WORKER_API_KEY', category: 'Notificações', description: 'Chave da API do worker de notificações' },
  { name: 'NOTIFICATION_WORKER_URL', category: 'Notificações', description: 'URL do worker de notificações' },
  { name: 'BASE44_SECRET_KEY', category: 'Sistema', description: 'Chave secreta do Base44' },
  { name: 'WEBSOCKET_ENDPOINT_URL', category: 'WebSocket', description: 'URL do endpoint WebSocket' },
  { name: 'SCHEDULE_URL', category: 'Campanhas', description: 'URL do scheduler de campanhas' },
  { name: 'EXTERNAL_API_KEY', category: 'Integração', description: 'Chave da API externa' },
  { name: 'JOBS_API_KEY', category: 'Jobs', description: 'Chave da API de jobs' },
  { name: 'STRIPE_API_KEY', category: 'Pagamentos', description: 'Chave da API do Stripe' },
  { name: 'WEBSOCKET_AUTH_TOKEN', category: 'WebSocket', description: 'Token de autenticação WebSocket' },
  { name: 'WAHA_WEBHOOK_SECRET', category: 'WhatsApp', description: 'Secret do webhook WAHA' },
  { name: 'STRIPE_WEBHOOK_SECRET', category: 'Pagamentos', description: 'Secret do webhook Stripe' },
  { name: 'WAHA_API_KEY', category: 'WhatsApp', description: 'Chave da API WAHA' },
  { name: 'BASE44_APP_ID', category: 'Sistema', description: 'ID da aplicação Base44' },
  { name: 'BASE44_SERVICE_ROLE_KEY', category: 'Sistema', description: 'Chave de service role Base44' },
  { name: 'WAHA_API_URL', category: 'WhatsApp', description: 'URL da API WAHA' }
];

export default function KeysSection() {
  const [secrets, setSecrets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState({});
  const [copied, setCopied] = useState(null);
  const [decryptedValues, setDecryptedValues] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingSecret, setEditingSecret] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadSecrets = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedSecrets = await base44.asServiceRole.entities.Secret.filter({});
      
      console.log('✅ Secrets do BD:', fetchedSecrets.length);
      
      // Criar mapa das chaves já configuradas no BD
      const secretsMap = new Map();
      fetchedSecrets.forEach(s => {
        secretsMap.set(s.key_name, s);
      });

      // Mesclar: sempre mostrar todas as 15 chaves do sistema
      const mergedSecrets = SYSTEM_KEYS.map(sysKey => {
        const existingSecret = secretsMap.get(sysKey.name);
        if (existingSecret) {
          // Já existe no BD
          return existingSecret;
        }
        // Não existe no BD ainda - mostrar como "não configurada"
        return {
          key_name: sysKey.name,
          category: sysKey.category,
          description: sysKey.description,
          is_sensitive: true,
          encrypted_value: null,
          id: null
        };
      });

      console.log('✅ Total de chaves exibidas:', mergedSecrets.length);
      setSecrets(mergedSecrets);
    } catch (error) {
      console.error("❌ Erro ao carregar secrets:", error);
      // Mesmo com erro, mostrar as chaves do sistema
      const fallbackSecrets = SYSTEM_KEYS.map(sysKey => ({
        key_name: sysKey.name,
        category: sysKey.category,
        description: sysKey.description,
        is_sensitive: true,
        encrypted_value: null,
        id: null
      }));
      console.log('⚠️ Usando fallback, total:', fallbackSecrets.length);
      setSecrets(fallbackSecrets);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const handleSave = async (data) => {
    setIsSaving(true);
    try {
      const response = await base44.functions.invoke('encryptSecret', {
        key_name: data.key_name,
        value: data.value,
        category: data.category,
        description: data.description,
        is_sensitive: data.is_sensitive
      });

      if (response.data.success) {
        await loadSecrets();
        setShowForm(false);
        setEditingSecret(null);
      }
    } catch (error) {
      console.error("Erro ao salvar secret:", error);
      alert("Erro ao salvar secret");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (secret) => {
    if (!secret.id) {
      alert("Não é possível excluir uma chave que ainda não foi configurada");
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir o valor de "${secret.key_name}"?`)) {
      try {
        await base44.asServiceRole.entities.Secret.delete(secret.id);
        await loadSecrets();
      } catch (error) {
        console.error("Erro ao excluir secret:", error);
        alert("Erro ao excluir secret");
      }
    }
  };

  const toggleVisibility = async (secret) => {
    if (!secret.id || !secret.encrypted_value) return;
    
    const secretId = secret.id;
    
    if (visibleKeys[secretId]) {
      // Esconder
      setVisibleKeys(prev => ({
        ...prev,
        [secretId]: false
      }));
    } else {
      // Mostrar - descriptografar
      try {
        const response = await base44.functions.invoke('decryptSecret', {
          secret_id: secretId
        });

        if (response.data.success) {
          setDecryptedValues(prev => ({
            ...prev,
            [secretId]: response.data.value
          }));
          setVisibleKeys(prev => ({
            ...prev,
            [secretId]: true
          }));
        }
      } catch (error) {
        console.error("Erro ao descriptografar secret:", error);
        alert("Erro ao descriptografar secret");
      }
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getSecretValue = (secret) => {
    if (!secret || !secret.encrypted_value) {
      return '••••••••••••••••••••••••••••••••';
    }
    if (secret.id && visibleKeys[secret.id] && decryptedValues[secret.id]) {
      return decryptedValues[secret.id];
    }
    return '••••••••••••••••••••••••••••••••';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Notificações': 'bg-blue-100 text-blue-800',
      'Sistema': 'bg-purple-100 text-purple-800',
      'WebSocket': 'bg-green-100 text-green-800',
      'Campanhas': 'bg-yellow-100 text-yellow-800',
      'Integração': 'bg-pink-100 text-pink-800',
      'Jobs': 'bg-orange-100 text-orange-800',
      'Pagamentos': 'bg-red-100 text-red-800',
      'WhatsApp': 'bg-teal-100 text-teal-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-600" />
              Chaves & Secrets
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={loadSecrets}
                disabled={isLoading}
                className="rounded-xl"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>

            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 font-medium">Atenção</p>
              <p className="text-xs text-yellow-700 mt-1">
                Todos os valores são criptografados com AES-256. Nunca compartilhe suas chaves secretas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Secrets</p>
                <p className="text-2xl font-bold text-gray-900">{secrets.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Key className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Secrets Sensíveis</p>
                <p className="text-2xl font-bold text-gray-900">
                  {secrets.filter(s => s.is_sensitive).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <EyeOff className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categorias</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(secrets.map(s => s.category)).size}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Key className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secrets List */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Variáveis de Ambiente</CardTitle>
        </CardHeader>
        <CardContent>
          {secrets.length > 0 ? (
            <div className="space-y-2">
              {secrets.map((secret, index) => (
                <div
                  key={secret.id || `secret-${index}`}
                  className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Key className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {secret.key_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`rounded-full text-xs ${getCategoryColor(secret.category)}`}>
                            {secret.category}
                          </Badge>
                          {secret.description && (
                            <span className="text-xs text-gray-500 truncate">{secret.description}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {secret.is_sensitive && secret.encrypted_value && secret.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => toggleVisibility(secret)}
                        >
                          {visibleKeys[secret.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      {secret.encrypted_value && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => copyToClipboard(
                            visibleKeys[secret.id] ? decryptedValues[secret.id] : secret.key_name, 
                            secret.id || secret.key_name
                          )}
                        >
                          {copied === (secret.id || secret.key_name) ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => {
                          setEditingSecret(secret);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {secret.id && secret.encrypted_value && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-red-600"
                          onClick={() => handleDelete(secret)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-gray-700 break-all">
                    {secret.encrypted_value ? (
                      getSecretValue(secret)
                    ) : (
                      <span className="text-red-600">Não configurado - clique em editar para adicionar</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Key className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum secret encontrado</h3>
              <p className="text-gray-500">Configure os secrets do sistema</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <SecretFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingSecret(null);
        }}
        secret={editingSecret}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
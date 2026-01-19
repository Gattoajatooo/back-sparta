import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Webhook,
  Zap,
  Copy,
  CheckCircle2,
  ExternalLink,
  Loader2
} from "lucide-react";

export default function APISection() {
  const [copied, setCopied] = useState(null);
  const [webhooks, setWebhooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    setIsLoading(true);
    try {
      // Simular carregamento de webhooks configurados
      const mockWebhooks = [
        {
          id: 1,
          name: 'WAHA Webhook',
          url: process.env.WAHA_API_URL || 'Não configurado',
          status: 'active',
          events: ['message.received', 'session.status']
        },
        {
          id: 2,
          name: 'Stripe Webhook',
          url: 'https://api.stripe.com/webhooks',
          status: 'active',
          events: ['payment.success', 'subscription.updated']
        }
      ];
      setWebhooks(mockWebhooks);
    } catch (error) {
      console.error("Erro ao carregar webhooks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const endpoints = [
    {
      id: 1,
      method: 'POST',
      path: '/api/functions/*',
      description: 'Backend functions endpoint',
      auth: 'Bearer Token'
    },
    {
      id: 2,
      method: 'GET',
      path: '/api/entities/*',
      description: 'Entity data access',
      auth: 'Bearer Token'
    },
    {
      id: 3,
      method: 'POST',
      path: '/api/webhooks/*',
      description: 'Webhook receiver',
      auth: 'Signature Validation'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-600" />
            API & Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Configure endpoints, webhooks e integrações externas do sistema
          </p>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Endpoints da API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={`rounded-lg font-mono text-xs ${
                          endpoint.method === 'POST'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono text-gray-900">
                        {endpoint.path}
                      </code>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{endpoint.description}</p>
                    <Badge variant="outline" className="rounded-full text-xs">
                      Auth: {endpoint.auth}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => copyToClipboard(endpoint.path, `endpoint-${endpoint.id}`)}
                  >
                    {copied === `endpoint-${endpoint.id}` ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Webhooks Configurados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="p-4 rounded-xl border border-gray-200"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{webhook.name}</h3>
                    <p className="text-sm text-gray-600 font-mono break-all">{webhook.url}</p>
                  </div>
                  <Badge
                    className="rounded-full text-xs bg-green-100 text-green-800"
                  >
                    {webhook.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {webhook.events.map((event) => (
                    <Badge key={event} variant="outline" className="rounded-full text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card className="rounded-3xl border-gray-200 bg-gradient-to-br from-green-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Documentação da API</h3>
              <p className="text-sm text-gray-600">
                Acesse a documentação completa da API do Base44
              </p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700 rounded-xl">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Docs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
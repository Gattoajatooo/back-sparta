import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Activity,
  AlertTriangle,
  Lock,
  Eye,
  Download,
  Loader2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SecuritySection() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const logs = await base44.asServiceRole.entities.SystemLog.filter(
        {},
        '-created_date',
        20
      );
      setAuditLogs(logs);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('create')) return <Activity className="w-4 h-4 text-green-600" />;
    if (action.includes('delete')) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (action.includes('update')) return <Activity className="w-4 h-4 text-blue-600" />;
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Logs de auditoria e configurações de segurança do sistema
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl">
              <Download className="w-4 h-4 mr-2" />
              Exportar Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Logs</p>
                <p className="text-2xl font-bold text-gray-900">{auditLogs.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Erros</p>
                <p className="text-2xl font-bold text-gray-900">
                  {auditLogs.filter(log => log.status === 'error').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">2FA Ativo</p>
                <p className="text-2xl font-bold text-gray-900">✓</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Logs de Auditoria (Últimas 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center mt-1">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {log.action}
                        </h4>
                        <Badge
                          className={`rounded-full text-xs ${getStatusColor(log.status)}`}
                        >
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {log.resource_type} - {log.method || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {log.created_date
                          ? format(new Date(log.created_date), "PPp", { locale: ptBR })
                          : 'Data não disponível'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {auditLogs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum log de auditoria encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
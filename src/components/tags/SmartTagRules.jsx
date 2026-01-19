import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Campaign } from "@/entities/Campaign";
import { User } from "@/entities/User";
import { applySmartTags } from "@/functions/applySmartTags";
import {
  Plus,
  Trash2,
  Save,
  X,
  Zap,
  Play,
  Loader2,
  CheckCircle
} from "lucide-react";

export default function SmartTagRules({ tag, onClose, onSave }) {
  const [rules, setRules] = useState({
    auto_apply: tag?.smart_rules?.auto_apply || false,
    conditions: tag?.smart_rules?.conditions || [],
    actions: tag?.smart_rules?.actions || []
  });
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const fieldOptions = [
    { value: 'status', label: 'Status' },
    { value: 'source', label: 'Fonte' },
    { value: 'company_name', label: 'Empresa' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'value', label: 'Valor' },
    { value: 'created_date', label: 'Data de Criação' },
    { value: 'last_contact_date', label: 'Último Contato' },
    { value: 'first_name', label: 'Primeiro Nome' },
    { value: 'last_name', label: 'Último Nome' },
    { value: 'position', label: 'Cargo' },
    { value: 'tags', label: 'Tags' }
  ];

  const operatorOptions = [
    { value: 'equals', label: 'Igual a' },
    { value: 'not_equals', label: 'Diferente de' },
    { value: 'contains', label: 'Contém' },
    { value: 'not_contains', label: 'Não contém' },
    { value: 'starts_with', label: 'Começa com' },
    { value: 'ends_with', label: 'Termina com' },
    { value: 'greater_than', label: 'Maior que' },
    { value: 'less_than', label: 'Menor que' },
    { value: 'greater_equal', label: 'Maior ou igual a' },
    { value: 'less_equal', label: 'Menor ou igual a' },
    { value: 'is_empty', label: 'Está vazio' },
    { value: 'not_empty', label: 'Não está vazio' },
    { value: 'in_list', label: 'Está na lista' },
    { value: 'not_in_list', label: 'Não está na lista' },
    { value: 'days_ago', label: 'Dias atrás' },
    { value: 'days_ahead', label: 'Dias à frente' }
  ];

  const actionOptions = [
    { value: 'send_email', label: 'Enviar Email' },
    { value: 'add_note', label: 'Adicionar Nota' },
    { value: 'update_status', label: 'Atualizar Status' },
    { value: 'assign_campaign', label: 'Atribuir à Campanha' }
  ];

  const statusOptions = [
    { value: 'lead', label: 'Lead' },
    { value: 'prospect', label: 'Prospect' },
    { value: 'customer', label: 'Cliente' },
    { value: 'churned', label: 'Perdido' }
  ];

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const user = await User.me();
      if (user.company_id) {
        const campaignList = await Campaign.filter(
          { company_id: user.company_id },
          'name'
        );
        setCampaigns(campaignList);
      }
    } catch (error) {
      console.error("Error loading campaigns:", error);
    }
  };

  const addCondition = () => {
    setRules(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { field: 'status', operator: 'equals', value: '' }
      ]
    }));
  };

  const removeCondition = (index) => {
    setRules(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const updateCondition = (index, field, value) => {
    setRules(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, [field]: value } : condition
      )
    }));
  };

  const addAction = () => {
    setRules(prev => ({
      ...prev,
      actions: [
        ...prev.actions,
        { type: 'add_note', value: '' }
      ]
    }));
  };

  const removeAction = (index) => {
    setRules(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const updateAction = (index, field, value) => {
    setRules(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, [field]: value } : action
      )
    }));
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestResults(null);

      // First save the current rules
      await handleSave(false);

      // Then test the smart tag
      const { data } = await applySmartTags({ tagId: tag.id });
      
      setTestResults(data);
    } catch (error) {
      console.error("Error testing smart tag:", error);
      setTestResults({
        success: false,
        error: error.message || 'Erro ao testar a tag inteligente'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (showSuccess = true) => {
    try {
      setIsLoading(true);
      
      const updatedTag = {
        ...tag,
        is_smart: true,
        smart_rules: rules
      };

      await onSave(updatedTag);
      
      // Apply smart tags immediately after saving
      if (rules.auto_apply && rules.conditions.length > 0) {
        await applySmartTags({ tagId: tag.id });
      }

      if (showSuccess) {
        // Show success message or close modal
        onClose();
      }
    } catch (error) {
      console.error("Error saving smart tag rules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderConditionValueInput = (condition, index) => {
    if (condition.operator === 'is_empty' || condition.operator === 'not_empty') {
      return null;
    }

    if (condition.field === 'status') {
      return (
        <Select 
          value={condition.value} 
          onValueChange={(value) => updateCondition(index, 'value', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (condition.field === 'source') {
      return (
        <Select 
          value={condition.value} 
          onValueChange={(value) => updateCondition(index, 'value', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="referral">Indicação</SelectItem>
            <SelectItem value="social_media">Redes Sociais</SelectItem>
            <SelectItem value="email_campaign">Campanha de Email</SelectItem>
            <SelectItem value="cold_outreach">Prospecção Ativa</SelectItem>
            <SelectItem value="event">Evento</SelectItem>
            <SelectItem value="other">Outros</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        placeholder="Valor"
        value={condition.value}
        onChange={(e) => updateCondition(index, 'value', e.target.value)}
      />
    );
  };

  const renderActionValueInput = (action, index) => {
    switch (action.type) {
      case 'update_status':
        return (
          <Select 
            value={action.value} 
            onValueChange={(value) => updateAction(index, 'value', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar novo status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'assign_campaign':
        return (
          <Select 
            value={action.value} 
            onValueChange={(value) => updateAction(index, 'value', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar campanha" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'add_note':
        return (
          <Textarea
            placeholder="Nota a ser adicionada automaticamente"
            value={action.value}
            onChange={(e) => updateAction(index, 'value', e.target.value)}
          />
        );

      case 'send_email':
        return (
          <Input
            placeholder="Assunto do email"
            value={action.value}
            onChange={(e) => updateAction(index, 'value', e.target.value)}
          />
        );

      default:
        return (
          <Input
            placeholder="Valor"
            value={action.value}
            onChange={(e) => updateAction(index, 'value', e.target.value)}
          />
        );
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span>Configurar Regras Inteligentes</span>
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              {tag?.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Auto Apply Toggle */}
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Aplicação Automática</h3>
                  <p className="text-sm text-gray-600">
                    Quando ativa, a tag será aplicada automaticamente aos contatos que atendem às condições
                  </p>
                </div>
                <Checkbox
                  checked={rules.auto_apply}
                  onCheckedChange={(checked) => setRules(prev => ({ ...prev, auto_apply: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Condições</span>
                <Button onClick={addCondition} size="sm" className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Condição
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rules.conditions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma condição definida</p>
                  <p className="text-sm text-gray-400">Adicione condições para definir quando esta tag deve ser aplicada</p>
                </div>
              ) : (
                rules.conditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
                    <Select 
                      value={condition.field} 
                      onValueChange={(value) => updateCondition(index, 'field', value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Campo" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select 
                      value={condition.operator} 
                      onValueChange={(value) => updateCondition(index, 'operator', value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Operador" />
                      </SelectTrigger>
                      <SelectContent>
                        {operatorOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex-1">
                      {renderConditionValueInput(condition, index)}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Ações Automáticas</span>
                <Button onClick={addAction} size="sm" variant="outline" className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Ação
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rules.actions.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">Nenhuma ação automática definida</p>
                  <p className="text-xs text-gray-400">As ações são executadas quando a tag é aplicada automaticamente</p>
                </div>
              ) : (
                rules.actions.map((action, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
                    <Select 
                      value={action.type} 
                      onValueChange={(value) => updateAction(index, 'type', value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Tipo de Ação" />
                      </SelectTrigger>
                      <SelectContent>
                        {actionOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex-1">
                      {renderActionValueInput(action, index)}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAction(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {testResults.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                  Resultado do Teste
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.success ? (
                  <div className="space-y-2">
                    <p className="text-green-600">
                      ✅ {testResults.appliedTags} tags aplicadas com sucesso
                    </p>
                    <p className="text-sm text-gray-600">
                      Processados {testResults.processedContacts} contatos
                    </p>
                  </div>
                ) : (
                  <p className="text-red-600">
                    ❌ {testResults.error}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={handleTest}
            disabled={isTesting || rules.conditions.length === 0}
            className="rounded-xl"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Testar Regras
              </>
            )}
          </Button>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={() => handleSave()}
              disabled={isLoading || rules.conditions.length === 0}
              className="bg-purple-600 hover:bg-purple-700 rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar e Aplicar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
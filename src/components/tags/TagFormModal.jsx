import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  X,
  Save,
  Tag as TagIcon,
  Zap,
  Plus,
  Loader2
} from "lucide-react";
import { getSubscriptionStatus } from "@/functions/getSubscriptionStatus";
import { Plan } from "@/entities/Plan";
import { Tag } from "@/entities/Tag";
import { User } from "@/entities/User";

export default function TagFormModal({ open, onClose, tag, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    description: '',
    is_smart: false,
    smart_rules: {
      auto_apply: false,
      conditions: [],
      actions: []
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && tag) {
      setFormData({
        name: tag.name || '',
        color: tag.color || '#3b82f6',
        description: tag.description || '',
        is_smart: tag.is_smart || false,
        smart_rules: tag.smart_rules || {
          auto_apply: false,
          conditions: [],
          actions: []
        }
      });
    } else if (open && !tag) {
      setFormData({
        name: '',
        color: '#3b82f6',
        description: '',
        is_smart: false,
        smart_rules: {
          auto_apply: false,
          conditions: [],
          actions: []
        }
      });
    }
    
    if (open) {
      setIsLoading(false);
    }
  }, [open, tag]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // VERIFICAÇÃO DE LIMITE DE PLANO AO CRIAR NOVO MARCADOR
      if (!tag) { // Only check limit for new tag creation
        const user = await User.me();
        if (user?.company_id) {
          const { data } = await getSubscriptionStatus();
          if (data?.success && data.has_active_subscription) {
            const planId = data.subscription?.metadata?.plan_id;
            if (planId) {
              const currentPlan = await Plan.get(planId);
              if (currentPlan) {
                const tagLimit = currentPlan.active_tags;
                // Check if tagLimit is defined and not -1 (unlimited)
                if (tagLimit !== undefined && tagLimit !== -1) {
                  // Count current active tags
                  const currentTags = await Tag.filter({ 
                    company_id: user.company_id, 
                    is_active: true 
                  });
                  if (currentTags.length >= tagLimit) {
                    throw new Error(`Limite de ${tagLimit} marcadores atingido. Para adicionar mais, faça um upgrade no seu plano.`);
                  }
                }
              }
            }
          }
        }
      }

      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting tag:", error);
      // Show error to user (you might want to add error state for this)
      alert(error.message || 'Erro ao salvar marcador. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const colorOptions = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
    '#ec4899', '#6366f1', '#14b8a6', '#eab308'
  ];

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:max-w-2xl max-h-[95vh] p-0 overflow-hidden flex flex-col rounded-[2.5rem] [&>button]:hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <TagIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {tag ? 'Editar Marcador' : 'Novo Marcador'}
                </h2>
                <p className="text-sm text-gray-600">
                  {tag ? 'Atualize as informações do marcador' : 'Preencha os dados do novo marcador'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isLoading}
              className="h-8 w-8 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8"
          style={{ 
            maxHeight: 'calc(95vh - 140px)',
            minHeight: '300px'
          }}
        >
          {/* Informações Básicas */}
          <Card className="rounded-2xl border-gray-200">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm">Nome do Marcador *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="rounded-xl border-gray-200 mt-1"
                  placeholder="Digite o nome do marcador"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="rounded-xl border-gray-200 h-20 mt-1"
                  placeholder="Descrição opcional do marcador"
                />
              </div>

              <div>
                <Label className="text-sm">Cor do Marcador</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-10 h-10 rounded-xl border-2 transition-all ${
                        formData.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tipo de Marcador */}
          <Card className="rounded-2xl border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="is_smart"
                  checked={formData.is_smart}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_smart: checked }))}
                  disabled={true}
                  className="rounded-md border-gray-300 data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400 opacity-50 cursor-not-allowed"
                />
                <Label htmlFor="is_smart" className="flex items-center gap-2 cursor-pointer text-gray-400 text-sm">
                  <Zap className="w-4 h-4 text-gray-400" />
                  Marcador Inteligente (Em desenvolvimento)
                </Label>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
                <Zap className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                <h4 className="font-medium text-gray-600 mb-2 text-sm">Funcionalidade em Desenvolvimento</h4>
                <p className="text-xs text-gray-500">
                  Os marcadores inteligentes estarão disponíveis em breve com regras automáticas de aplicação.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.name || isLoading}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {tag ? 'Atualizar' : 'Criar Marcador'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
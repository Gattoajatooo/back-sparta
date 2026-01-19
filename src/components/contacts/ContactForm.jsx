import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/entities/User";
import { Campaign } from "@/entities/Campaign";
import { Tag } from "@/entities/Tag";
import {
  CalendarIcon,
  Plus,
  X,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function ContactForm({ contact, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    birth_date: contact?.birth_date || '',
    company_name: contact?.company_name || '',
    position: contact?.position || '',
    custom_position: contact?.custom_position || '',
    status: contact?.status || '',
    temperature: contact?.temperature || 'fria',
    value: contact?.value || '',
    notes: contact?.notes || '',
    campaign_ids: contact?.campaign_ids || [],
    tags: contact?.tags || [],
    social_profiles: {
      linkedin: contact?.social_profiles?.linkedin || '',
      twitter: contact?.social_profiles?.twitter || '',
      website: contact?.social_profiles?.website || ''
    }
  });

  const [newTag, setNewTag] = useState('');
  const [birthDate, setBirthDate] = useState(
    contact?.birth_date ? new Date(contact.birth_date) : null
  );
  const [campaigns, setCampaigns] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storedLid, setStoredLid] = useState(null); // Armazenar LID em memória

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      
      if (user.company_id) {
        // Carregar campanhas
        const campaignList = await Campaign.filter(
          { company_id: user.company_id },
          'name'
        );
        setCampaigns(campaignList);

        // Carregar tags manuais (não inteligentes)
        const tagList = await Tag.filter(
          { 
            company_id: user.company_id,
            is_smart: false
          },
          'name'
        );
        setAvailableTags(tagList);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialProfileChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      social_profiles: {
        ...prev.social_profiles,
        [platform]: value
      }
    }));
  };

  const handleCampaignToggle = (campaignId) => {
    setFormData(prev => ({
      ...prev,
      campaign_ids: prev.campaign_ids.includes(campaignId)
        ? prev.campaign_ids.filter(id => id !== campaignId)
        : [...prev.campaign_ids, campaignId]
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Preparar phones array para envio
    let phonesArray = [];
    
    // Adicionar telefone principal
    if (formData.phone) {
      phonesArray.push({ phone: formData.phone, type: 'primary' });
    }
    
    // Se houver LID armazenado, adicionar automaticamente
    if (storedLid) {
      phonesArray.push({ phone: storedLid, type: 'lid' });
    }
    
    const submissionData = {
      ...formData,
      phones: phonesArray, // Enviar array de telefones
      birth_date: birthDate ? birthDate.toISOString().split('T')[0] : null,
      value: formData.value ? parseFloat(formData.value) : null
    };
    
    onSubmit(submissionData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white"
    >
      <Card className="rounded-3xl border-gray-200 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900">
            {contact ? 'Editar Contato' : 'Adicionar Novo Contato'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Carregando...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Nome *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className="rounded-2xl border-gray-200"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Sobrenome</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className="rounded-2xl border-gray-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="rounded-2xl border-gray-200"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="rounded-2xl border-gray-200"
                    placeholder="+55 31 99999-9999"
                  />
                </div>
              </div>

              {/* Birth Date */}
              <div>
                <Label>Data de Nascimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full rounded-2xl border-gray-200 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {birthDate ? format(birthDate, 'dd/MM/yyyy') : 'Selecionar data de nascimento'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl">
                    <Calendar
                      mode="single"
                      selected={birthDate}
                      onSelect={setBirthDate}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Company Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Empresa</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    className="rounded-2xl border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Cargo</Label>
                  <Select 
                    value={formData.position} 
                    onValueChange={(value) => handleInputChange('position', value)}
                  >
                    <SelectTrigger className="rounded-2xl border-gray-200">
                      <SelectValue placeholder="Selecionar cargo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="ceo">CEO</SelectItem>
                      <SelectItem value="cto">CTO</SelectItem>
                      <SelectItem value="cfo">CFO</SelectItem>
                      <SelectItem value="diretor">Diretor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="coordenador">Coordenador</SelectItem>
                      <SelectItem value="analista">Analista</SelectItem>
                      <SelectItem value="assistente">Assistente</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="consultor">Consultor</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Position */}
              {formData.position === 'outros' && (
                <div>
                  <Label htmlFor="custom_position">Cargo Personalizado</Label>
                  <Input
                    id="custom_position"
                    value={formData.custom_position}
                    onChange={(e) => handleInputChange('custom_position', e.target.value)}
                    className="rounded-2xl border-gray-200"
                    placeholder="Digite o cargo"
                  />
                </div>
              )}

              {/* Status, Temperatura e Marcadores */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Input
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="rounded-2xl border-gray-200"
                    placeholder="Digite o status (ex: Lead, Cliente, Negociação...)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Status personalizável para sua empresa</p>
                </div>
                
                <div>
                  <Label>Temperatura</Label>
                  <div className="flex items-center gap-2">
                    <div className={`px-4 py-2 rounded-2xl border-2 flex-1 text-center font-medium ${
                      formData.temperature === 'fria' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}>
                      ❄️ Fria
                    </div>
                    <div className={`px-4 py-2 rounded-2xl border-2 flex-1 text-center font-medium ${
                      formData.temperature === 'morna' 
                        ? 'bg-yellow-50 border-yellow-500 text-yellow-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}>
                      🌤️ Morna
                    </div>
                    <div className={`px-4 py-2 rounded-2xl border-2 flex-1 text-center font-medium ${
                      formData.temperature === 'quente' 
                        ? 'bg-red-50 border-red-500 text-red-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}>
                      🔥 Quente
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Temperatura atualizada automaticamente baseada nas interações</p>
                </div>
              </div>

              {/* Value */}
              <div>
                <Label htmlFor="value">Valor Estimado</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  className="rounded-2xl border-gray-200"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Campanhas */}
              <div>
                <Label>Campanhas</Label>
                <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-2xl p-3">
                  {campaigns.length > 0 ? (
                    <div className="space-y-2">
                      {campaigns.map((campaign) => (
                        <div key={campaign.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`campaign-${campaign.id}`}
                            checked={formData.campaign_ids.includes(campaign.id)}
                            onCheckedChange={() => handleCampaignToggle(campaign.id)}
                          />
                          <label
                            htmlFor={`campaign-${campaign.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {campaign.name}
                          </label>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${campaign.color || 'bg-blue-100 text-blue-800'}`}
                          >
                            {campaign.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhuma campanha disponível</p>
                  )}
                </div>
              </div>

              {/* Marcadores Manuais */}
              <div>
                <Label>Marcadores</Label>
                <div className="space-y-3">
                  {/* Adicionar novo marcador */}
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Adicionar novo marcador..."
                      className="rounded-2xl border-gray-200"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                      disabled={!newTag.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Marcadores existentes para seleção */}
                  {availableTags.length > 0 && (
                    <div className="max-h-24 overflow-y-auto border border-gray-200 rounded-2xl p-3">
                      <p className="text-xs text-gray-600 mb-2">Marcadores existentes:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              if (!formData.tags.includes(tag.name)) {
                                setFormData(prev => ({
                                  ...prev,
                                  tags: [...prev.tags, tag.name]
                                }));
                              }
                            }}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                              formData.tags.includes(tag.name)
                                ? 'bg-blue-100 text-blue-800 border-blue-300 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                            }`}
                            disabled={formData.tags.includes(tag.name)}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marcadores selecionados */}
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="rounded-full bg-blue-100 text-blue-800">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Social Profiles */}
              <div>
                <Label>Redes Sociais</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Input
                      value={formData.social_profiles.linkedin}
                      onChange={(e) => handleSocialProfileChange('linkedin', e.target.value)}
                      className="rounded-2xl border-gray-200"
                      placeholder="LinkedIn URL"
                    />
                  </div>
                  <div>
                    <Input
                      value={formData.social_profiles.twitter}
                      onChange={(e) => handleSocialProfileChange('twitter', e.target.value)}
                      className="rounded-2xl border-gray-200"
                      placeholder="Twitter URL"
                    />
                  </div>
                  <div>
                    <Input
                      value={formData.social_profiles.website}
                      onChange={(e) => handleSocialProfileChange('website', e.target.value)}
                      className="rounded-2xl border-gray-200"
                      placeholder="Website URL"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="rounded-2xl border-gray-200 h-24"
                  placeholder="Observações sobre este contato..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onCancel} className="rounded-2xl">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 rounded-2xl">
                  {contact ? 'Atualizar Contato' : 'Adicionar Contato'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
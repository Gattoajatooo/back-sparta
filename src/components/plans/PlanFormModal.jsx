
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package,
  X,
  Save,
  Settings,
  Users,
  MessageCircle,
  Calendar,
  Target,
  Tag,
  BarChart3,
  Mail,
  HelpCircle,
  Shield,
  Bell,
  Star,
  Loader2,
  FileText,
  DollarSign,
  Plus,
  Trash2
} from "lucide-react";

import { Plan } from "@/entities/Plan";

// Helper function to calculate the 'from' value for a tier
const calculateNextFrom = (prevUpToValue) => {
  if (prevUpToValue === "" || prevUpToValue === undefined || prevUpToValue === null) {
    return "";
  }
  const parsedPrevUpTo = parseInt(prevUpToValue);
  // Ensure it's a valid non-negative number before calculating next 'from'
  if (isNaN(parsedPrevUpTo) || parsedPrevUpTo < 0) {
    return ""; // If previous up_to is invalid, next 'from' should be empty
  }
  return (parsedPrevUpTo + 1).toString();
};

export default function PlanFormModal({ open, onClose, plan, onSuccess }) {
  const [planType, setPlanType] = useState("fixed"); // "fixed", "custom", "tiered"
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: 0,
    price_string: "",
    // NEW: Periodic pricing fields
    price_quarterly: 0,
    price_biannual: 0,
    price_annual: 0,
    active_sessions: 1,
    active_contacts: 100,
    messages_per_month: 1000,
    active_tags: 10,
    active_smart_tags: 5,
    report_personalization: 3,
    template_models: 50,
    message_reception: true,
    recurring_campaigns: 5,
    dynamic_campaigns: 2,
    support_hours: 24,
    implementation_help: false,
    company_users: 3,
    roles_permissions: 5,
    daily_whatsapp_notifications: false,
    is_popular: false,
    is_custom_base: false,
    is_listed: true,
    display_order: 1,
    // NEW: Max limits for tiered plans
    max_sessions_limit: 100,
    max_contacts_limit: 10000,
    max_messages_limit: 100000,
    max_tags_limit: 1000,
    max_smart_tags_limit: 500,
    max_reports_limit: 100,
    max_templates_limit: 500,
    max_campaigns_limit: 100,
    max_dynamic_campaigns_limit: 50,
    max_users_limit: 100,
    max_roles_limit: 50,
    // Campos para preços individuais (plano personalizado)
    price_sessions: 0,
    price_contacts: 0,
    price_messages: 0,
    price_tags: 0,
    price_smart_tags: 0,
    price_reports: 0,
    price_templates: 0,
    price_campaigns: 0,
    price_dynamic_campaigns: 0,
    price_users: 0,
    price_roles: 0,
    // Campos para tiers (plano escalonado) - começar com 'from: "1"'
    tiers_sessions: [{ from: "1", up_to: "", price_per_unit: "" }],
    tiers_contacts: [{ from: "1", up_to: "", price_per_unit: "" }],
    tiers_messages: [{ from: "1", up_to: "", price_per_unit: "" }],
    tiers_tags: [{ from: "1", up_to: "", price_per_unit: "" }],
    tiers_smart_tags: [{ from: "1", up_to: "", price_per_unit: "" }],
    tiers_reports: [{ from: "1", up_to: "", price_per_unit: "" }],
    tiers_templates: [{ from: "1", up_to: "", price_per_unit: "" }],
    tiers_campaigns: [{ from: "1", up_to: "", price_per_unit: "" }],
    tiers_dynamic_campaigns: [{ from: "1", up_to: "", price_per_unit: "" }],
    tiers_users: [{ from: "1", up_to: "", price_per_unit: "" }],
    tiers_roles: [{ from: "1", up_to: "", price_per_unit: "" }]
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && plan) {
      let detectedPlanType = "fixed";
      if (plan.is_custom_base) {
        // Verificar se tem tiers ou preços fixos
        // Considera que tem tiers se algum array de tiers não for vazio e tiver pelo menos 1 item com up_to definido.
        const hasTiers = plan.tiers_contacts && plan.tiers_contacts.some(tier => tier.up_to !== undefined && tier.up_to !== null);
        detectedPlanType = hasTiers ? "tiered" : "custom";
      }
      
      setPlanType(detectedPlanType);
      
      // Processar tiers existentes para incluir campo 'from' e formatar para string
      const processTiers = (tiers) => {
        if (!tiers || tiers.length === 0) {
          return [{ from: "1", up_to: "", price_per_unit: "" }];
        }
        // Filter out any potentially empty tiers coming from the backend before processing
        const filteredTiers = tiers.filter(tier => tier.up_to !== undefined && tier.up_to !== null);

        if (filteredTiers.length === 0) {
          return [{ from: "1", up_to: "", price_per_unit: "" }];
        }

        return filteredTiers.map((tier, index) => ({
          from: index === 0 ? "1" : calculateNextFrom(filteredTiers[index-1].up_to),
          up_to: tier.up_to?.toString() || "",
          price_per_unit: tier.price_per_unit?.toString() || ""
        }));
      };
      
      setFormData({
        name: plan.name || "",
        slug: plan.slug || "",
        description: plan.description || "",
        price: plan.price || 0,
        price_string: plan.price_string || "",
        // NEW: Load periodic pricing fields
        price_quarterly: plan.price_quarterly || 0,
        price_biannual: plan.price_biannual || 0,
        price_annual: plan.price_annual || 0,
        active_sessions: plan.active_sessions || 1,
        active_contacts: plan.active_contacts || 100,
        messages_per_month: plan.messages_per_month || 1000,
        active_tags: plan.active_tags || 10,
        active_smart_tags: plan.active_smart_tags || 5,
        report_personalization: plan.report_personalization || 3,
        template_models: plan.template_models || 50,
        message_reception: plan.message_reception !== false,
        recurring_campaigns: plan.recurring_campaigns || 5,
        dynamic_campaigns: plan.dynamic_campaigns || 2,
        support_hours: plan.support_hours || 24,
        implementation_help: plan.implementation_help || false,
        company_users: plan.company_users || 3,
        roles_permissions: plan.roles_permissions || 5,
        daily_whatsapp_notifications: plan.daily_whatsapp_notifications || false,
        is_popular: plan.is_popular || false,
        is_custom_base: detectedPlanType !== "fixed",
        is_listed: plan.is_listed !== false,
        display_order: plan.display_order || 1,
        // NEW: Load max limits
        max_sessions_limit: plan.max_sessions_limit || 100,
        max_contacts_limit: plan.max_contacts_limit || 10000,
        max_messages_limit: plan.max_messages_limit || 100000,
        max_tags_limit: plan.max_tags_limit || 1000,
        max_smart_tags_limit: plan.max_smart_tags_limit || 500,
        max_reports_limit: plan.max_reports_limit || 100,
        max_templates_limit: plan.max_templates_limit || 500,
        max_campaigns_limit: plan.max_campaigns_limit || 100,
        max_dynamic_campaigns_limit: plan.max_dynamic_campaigns_limit || 50,
        max_users_limit: plan.max_users_limit || 100,
        max_roles_limit: plan.max_roles_limit || 50,
        // Preços individuais
        price_sessions: plan.price_sessions || 0,
        price_contacts: plan.price_contacts || 0,
        price_messages: plan.price_messages || 0,
        price_tags: plan.price_tags || 0,
        price_smart_tags: plan.price_smart_tags || 0,
        price_reports: plan.price_reports || 0,
        price_templates: plan.price_templates || 0,
        price_campaigns: plan.price_campaigns || 0,
        price_dynamic_campaigns: plan.price_dynamic_campaigns || 0,
        price_users: plan.price_users || 0,
        price_roles: plan.price_roles || 0,
        // Tiers processadas
        tiers_sessions: processTiers(plan.tiers_sessions),
        tiers_contacts: processTiers(plan.tiers_contacts),
        tiers_messages: processTiers(plan.tiers_messages),
        tiers_tags: processTiers(plan.tiers_tags),
        tiers_smart_tags: processTiers(plan.tiers_smart_tags),
        tiers_reports: processTiers(plan.tiers_reports),
        tiers_templates: processTiers(plan.tiers_templates),
        tiers_campaigns: processTiers(plan.tiers_campaigns),
        tiers_dynamic_campaigns: processTiers(plan.tiers_dynamic_campaigns),
        tiers_users: processTiers(plan.tiers_users),
        tiers_roles: processTiers(plan.tiers_roles)
      });
    } else if (open && !plan) {
      // Reset form for new plan com valores VAZIOS
      setPlanType("fixed");
      setFormData({
        name: "",
        slug: "",
        description: "",
        price: 0,
        price_string: "",
        // NEW: Reset periodic pricing fields
        price_quarterly: 0,
        price_biannual: 0,
        price_annual: 0,
        active_sessions: 1,
        active_contacts: 100,
        messages_per_month: 1000,
        active_tags: 10,
        active_smart_tags: 5,
        report_personalization: 3,
        template_models: 50,
        message_reception: true,
        recurring_campaigns: 5,
        dynamic_campaigns: 2,
        support_hours: 24,
        implementation_help: false,
        company_users: 3,
        roles_permissions: 5,
        daily_whatsapp_notifications: false,
        is_popular: false,
        is_custom_base: false,
        is_listed: true,
        display_order: 1,
        // NEW: Reset max limits
        max_sessions_limit: 100,
        max_contacts_limit: 10000,
        max_messages_limit: 100000,
        max_tags_limit: 1000,
        max_smart_tags_limit: 500,
        max_reports_limit: 100,
        max_templates_limit: 500,
        max_campaigns_limit: 100,
        max_dynamic_campaigns_limit: 50,
        max_users_limit: 100,
        max_roles_limit: 50,
        price_sessions: 0,
        price_contacts: 0,
        price_messages: 0,
        price_tags: 0,
        price_smart_tags: 0,
        price_reports: 0,
        price_templates: 0,
        price_campaigns: 0,
        price_dynamic_campaigns: 0,
        price_users: 0,
        price_roles: 0,
        // Tiers vazias para novo cadastro
        tiers_sessions: [{ from: "1", up_to: "", price_per_unit: "" }],
        tiers_contacts: [{ from: "1", up_to: "", price_per_unit: "" }],
        tiers_messages: [{ from: "1", up_to: "", price_per_unit: "" }],
        tiers_tags: [{ from: "1", up_to: "", price_per_unit: "" }],
        tiers_smart_tags: [{ from: "1", up_to: "", price_per_unit: "" }],
        tiers_reports: [{ from: "1", up_to: "", price_per_unit: "" }],
        tiers_templates: [{ from: "1", up_to: "", price_per_unit: "" }],
        tiers_campaigns: [{ from: "1", up_to: "", price_per_unit: "" }],
        tiers_dynamic_campaigns: [{ from: "1", up_to: "", price_per_unit: "" }],
        tiers_users: [{ from: "1", up_to: "", price_per_unit: "" }],
        tiers_roles: [{ from: "1", up_to: "", price_per_unit: "" }]
      });
    }
    
    if (open) {
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, plan]);

  // Update is_custom_base when planType changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      is_custom_base: planType === "custom" || planType === "tiered"
    }));
  }, [planType]);

  // Auto-generate slug from name
  useEffect(() => {
    // Only auto-generate if it's a new plan (no `plan` prop) and slug is empty
    if (!plan && formData.name && !formData.slug) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.name, formData.slug, plan]);


  // Auto-format price string - CORRIGIDO
  useEffect(() => {
    if (formData.price !== undefined && formData.price !== null && formData.price !== '') { // Added check for empty string
      const priceString = formData.price === 0 
        ? "Gratuito" 
        : `R$ ${parseFloat(formData.price).toFixed(2).replace('.', ',')}`;
      setFormData(prev => ({ ...prev, price_string: priceString }));
    } else {
      setFormData(prev => ({ ...prev, price_string: "R$ 0,00" }));
    }
  }, [formData.price]);

  // NEW: Auto-calculate quarterly, biannual and annual prices based on monthly price
  useEffect(() => {
    if (planType === "fixed" && formData.price !== undefined && formData.price !== null && formData.price !== '') { // Added check for empty string
      const monthlyPrice = parseFloat(formData.price);
      if (!isNaN(monthlyPrice) && monthlyPrice >= 0) {
        // Default discounts: 5% quarterly, 10% biannual, 15% annual
        setFormData(prev => ({
          ...prev,
          price_quarterly: (monthlyPrice * 3 * 0.95), // 5% discount
          price_biannual: (monthlyPrice * 6 * 0.90), // 10% discount  
          price_annual: (monthlyPrice * 12 * 0.85) // 15% discount
        }));
      } else {
        setFormData(prev => ({
            ...prev,
            price_quarterly: 0,
            price_biannual: 0,
            price_annual: 0
        }));
      }
    } else if (planType !== "fixed") {
        setFormData(prev => ({
            ...prev,
            price_quarterly: 0,
            price_biannual: 0,
            price_annual: 0
        }));
    }
  }, [formData.price, planType]);


  const handleInputChange = (field, value) => {
    // Para campos de preço, converter para número imediatamente
    const priceFields = ['price', 'price_quarterly', 'price_biannual', 'price_annual'];
    if (priceFields.includes(field)) {
        // Permite campo vazio para que o usuário possa apagar, mas converte para 0 se sair
        const numericValue = value === '' ? '' : parseFloat(value);
        if (!isNaN(numericValue) || value === '') {
            setFormData(prev => ({ ...prev, [field]: numericValue }));
        }
    } else {
        setFormData(prev => ({ ...prev, [field]: value }));
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handlePriceBlur = (field) => {
    // Garante que o valor seja 0 se o campo for deixado vazio
    if (formData[field] === '') {
      setFormData(prev => ({ ...prev, [field]: 0 }));
    }
  };


  // Funções para gerenciar tiers - atualizadas
  const addTier = (field) => {
    const tiers = [...formData[field]];
    const lastTier = tiers[tiers.length - 1];
    const nextFrom = calculateNextFrom(lastTier.up_to);
    
    tiers.push({
      from: nextFrom,
      up_to: "",
      price_per_unit: ""
    });
    handleInputChange(field, tiers);
  };

  const removeTier = (field, index) => {
    if (formData[field].length > 1) {
      const tiers = [...formData[field]];
      tiers.splice(index, 1);
      
      // Reajustar os valores 'from' dos tiers restantes
      for (let i = 0; i < tiers.length; i++) {
        if (i === 0) {
          tiers[i].from = "1";
        } else {
          tiers[i].from = calculateNextFrom(tiers[i-1].up_to);
        }
      }
      
      handleInputChange(field, tiers);
    }
  };

  const updateTier = (field, index, tierField, value) => {
    const tiers = [...formData[field]];
    tiers[index][tierField] = value;
    
    // Se atualizou o 'up_to', recalcular todos os 'from' dos tiers subsequentes
    if (tierField === 'up_to') {
      for (let i = index + 1; i < tiers.length; i++) {
        tiers[i].from = calculateNextFrom(tiers[i - 1].up_to);
      }
    }
    
    handleInputChange(field, tiers);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Nome do plano é obrigatório";
    }
    
    if (!formData.slug.trim()) {
      newErrors.slug = "Slug é obrigatório";
    }
    
    if (planType === "fixed") {
      // Validate prices after blur effect has set empty to 0
      if (parseFloat(formData.price) < 0) {
        newErrors.price = "Preço mensal não pode ser negativo.";
      }
      if (parseFloat(formData.price_quarterly) < 0) {
        newErrors.price_quarterly = "Preço trimestral não pode ser negativo.";
      }
      if (parseFloat(formData.price_biannual) < 0) {
        newErrors.price_biannual = "Preço semestral não pode ser negativo.";
      }
      if (parseFloat(formData.price_annual) < 0) {
        newErrors.price_annual = "Preço anual não pode ser negativo.";
      }

      if (formData.active_sessions < -1) {
        newErrors.active_sessions = "Valor inválido (-1 = ilimitado, 0+ = quantidade)";
      }

      if (formData.active_contacts < -1) {
        newErrors.active_contacts = "Valor inválido (-1 = ilimitado, 0+ = quantidade)";
      }
    }

    if (planType === "tiered") {
      const tierFields = [
        'tiers_sessions', 'tiers_contacts', 'tiers_messages', 'tiers_tags', 'tiers_smart_tags',
        'tiers_reports', 'tiers_templates', 'tiers_campaigns', 'tiers_dynamic_campaigns',
        'tiers_users', 'tiers_roles'
      ];
      tierFields.forEach(field => {
        const tiers = formData[field];
        const limitField = field.replace('tiers_', 'max_') + '_limit';
        const maxLimit = parseInt(formData[limitField]);

        if (isNaN(maxLimit) || maxLimit < 1) {
            newErrors[limitField] = "O limite máximo deve ser um número positivo.";
        } else if (maxLimit === 0) { // Although min="1", user could manually input 0
            newErrors[limitField] = "O limite máximo deve ser no mínimo 1.";
        }

        tiers.forEach((tier, index) => {
          // If there are more than 1 tiers, and this specific tier (not the first) is entirely empty, skip.
          if (tiers.length > 1 && index > 0 && !tier.up_to && !tier.price_per_unit) {
              return;
          }

          const currentFrom = parseInt(tier.from); // This will be the auto-calculated 'from'
          const upTo = parseInt(tier.up_to);
          const pricePerUnit = parseFloat(tier.price_per_unit);

          // Validate 'from' for consistency - though disabled, it should be valid for the sequence
          if (index === 0) {
            if (isNaN(currentFrom) || currentFrom !== 1) {
              newErrors[field] = newErrors[field] || [];
              newErrors[field][index] = { ...newErrors[field][index], from: "O valor inicial deve ser 1." };
            }
          } else {
            const prevUpTo = parseInt(tiers[index - 1].up_to);
            const expectedFrom = prevUpTo + 1;
            if (isNaN(currentFrom) || currentFrom !== expectedFrom) {
              newErrors[field] = newErrors[field] || [];
              newErrors[field][index] = { ...newErrors[field][index], from: `Sequência inválida. Esperado: ${expectedFrom}` };
            }
          }

          // Validate 'up_to'
          if (!tier.up_to.trim() || isNaN(upTo) || upTo <= 0) {
            newErrors[field] = newErrors[field] || [];
            newErrors[field][index] = { ...newErrors[field][index], up_to: "Até deve ser um número positivo." };
          } else if (!isNaN(currentFrom) && upTo < currentFrom) {
             newErrors[field] = newErrors[field] || [];
             newErrors[field][index] = { ...newErrors[field][index], up_to: "Deve ser maior ou igual ao valor 'De'." };
          }
          
          // Validate 'up_to' against max_limit (only if maxLimit is valid)
          if (!isNaN(upTo) && !isNaN(maxLimit) && maxLimit >= 1 && upTo > maxLimit) {
              newErrors[field] = newErrors[field] || [];
              newErrors[field][index] = { ...newErrors[field][index], up_to: `Não pode exceder o limite máximo (${maxLimit}).` };
          }

          // Validate 'price_per_unit'
          if (!tier.price_per_unit.trim() || isNaN(pricePerUnit) || pricePerUnit < 0) {
            newErrors[field] = newErrors[field] || [];
            newErrors[field][index] = { ...newErrors[field][index], price_per_unit: "Preço deve ser um número não negativo." };
          }
        });
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    // Ensure all periodic price fields are set to 0 if left empty before validation
    if (planType === "fixed") {
      handlePriceBlur('price');
      handlePriceBlur('price_quarterly');
      handlePriceBlur('price_biannual');
      handlePriceBlur('price_annual');
    }

    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const dataToSubmit = { ...formData };

      // Garantir que price_string seja sempre uma string
      if (typeof dataToSubmit.price_string !== 'string') {
        dataToSubmit.price_string = dataToSubmit.price === 0 
          ? "Gratuito" 
          : `R$ ${parseFloat(dataToSubmit.price).toFixed(2).replace('.', ',')}`;
      }

      // Convert relevant fields to numbers before submission
      dataToSubmit.price = parseFloat(dataToSubmit.price) || 0;
      dataToSubmit.display_order = parseInt(dataToSubmit.display_order) || 1;
      dataToSubmit.active_sessions = parseInt(dataToSubmit.active_sessions) || 0;
      dataToSubmit.active_contacts = parseInt(dataToSubmit.active_contacts) || 0;
      dataToSubmit.messages_per_month = parseInt(dataToSubmit.messages_per_month) || 0;
      dataToSubmit.active_tags = parseInt(dataToSubmit.active_tags) || 0;
      dataToSubmit.active_smart_tags = parseInt(dataToSubmit.active_smart_tags) || 0;
      dataToSubmit.report_personalization = parseInt(dataToSubmit.report_personalization) || 0;
      dataToSubmit.template_models = parseInt(dataToSubmit.template_models) || 0;
      dataToSubmit.recurring_campaigns = parseInt(dataToSubmit.recurring_campaigns) || 0;
      dataToSubmit.dynamic_campaigns = parseInt(dataToSubmit.dynamic_campaigns) || 0;
      dataToSubmit.support_hours = parseInt(dataToSubmit.support_hours) || 24; // Changed default from 0 to 24
      dataToSubmit.company_users = parseInt(dataToSubmit.company_users) || 0;
      dataToSubmit.roles_permissions = parseInt(dataToSubmit.roles_permissions) || 0;

      // NEW: Convert periodic pricing fields to numbers if type is 'fixed'
      if (planType === "fixed") {
        dataToSubmit.price_quarterly = parseFloat(dataToSubmit.price_quarterly) || 0;
        dataToSubmit.price_biannual = parseFloat(dataToSubmit.price_biannual) || 0;
        dataToSubmit.price_annual = parseFloat(dataToSubmit.price_annual) || 0;
      } else {
        dataToSubmit.price_quarterly = 0;
        dataToSubmit.price_biannual = 0;
        dataToSubmit.price_annual = 0;
      }


      // Convert custom pricing fields to numbers if type is 'custom'
      if (planType === "custom") {
        dataToSubmit.price_sessions = parseFloat(dataToSubmit.price_sessions) || 0;
        dataToSubmit.price_contacts = parseFloat(dataToSubmit.price_contacts) || 0;
        dataToSubmit.price_messages = parseFloat(dataToSubmit.price_messages) || 0;
        dataToSubmit.price_tags = parseFloat(dataToSubmit.price_tags) || 0;
        dataToSubmit.price_smart_tags = parseFloat(dataToSubmit.price_smart_tags) || 0;
        dataToSubmit.price_reports = parseFloat(dataToSubmit.price_reports) || 0;
        dataToSubmit.price_templates = parseFloat(dataToSubmit.price_templates) || 0;
        dataToSubmit.price_campaigns = parseFloat(dataToSubmit.price_campaigns) || 0;
        dataToSubmit.price_dynamic_campaigns = parseFloat(dataToSubmit.price_dynamic_campaigns) || 0;
        dataToSubmit.price_users = parseFloat(dataToSubmit.price_users) || 0;
        dataToSubmit.price_roles = parseFloat(dataToSubmit.price_roles) || 0;
      } else {
         // Clear custom price fields if not custom plan
         Object.keys(dataToSubmit).forEach(key => {
          if (key.startsWith('price_') && !['price_string', 'price', 'price_quarterly', 'price_biannual', 'price_annual'].includes(key)) { 
            dataToSubmit[key] = 0;
          }
        });
      }


      // Convert tiered fields from string to number if type is 'tiered'
      if (planType === "tiered") {
        // NEW: Convert max limit fields
        dataToSubmit.max_sessions_limit = parseInt(dataToSubmit.max_sessions_limit) || 0;
        dataToSubmit.max_contacts_limit = parseInt(dataToSubmit.max_contacts_limit) || 0;
        dataToSubmit.max_messages_limit = parseInt(dataToSubmit.max_messages_limit) || 0;
        dataToSubmit.max_tags_limit = parseInt(dataToSubmit.max_tags_limit) || 0;
        dataToSubmit.max_smart_tags_limit = parseInt(dataToSubmit.max_smart_tags_limit) || 0;
        dataToSubmit.max_reports_limit = parseInt(dataToSubmit.max_reports_limit) || 0;
        dataToSubmit.max_templates_limit = parseInt(dataToSubmit.max_templates_limit) || 0;
        dataToSubmit.max_campaigns_limit = parseInt(dataToSubmit.max_campaigns_limit) || 0;
        dataToSubmit.max_dynamic_campaigns_limit = parseInt(dataToSubmit.max_dynamic_campaigns_limit) || 0;
        dataToSubmit.max_users_limit = parseInt(dataToSubmit.max_users_limit) || 0;
        dataToSubmit.max_roles_limit = parseInt(dataToSubmit.max_roles_limit) || 0;

        Object.keys(dataToSubmit).forEach(key => {
          if (key.startsWith('tiers_') && Array.isArray(dataToSubmit[key])) {
            dataToSubmit[key] = dataToSubmit[key]
              .filter(tier => tier.up_to && tier.price_per_unit) // Filter based on up_to and price, as 'from' is derived.
              .map(tier => ({
                from: parseInt(tier.from) || 0, // Ensure 'from' is also parsed
                up_to: parseInt(tier.up_to) || 0,
                price_per_unit: parseFloat(tier.price_per_unit) || 0
              }));
          }
        });
      } else {
        // Clear tiered data if not tiered plan
        Object.keys(dataToSubmit).forEach(key => {
          if (key.startsWith('tiers_')) {
            dataToSubmit[key] = []; // Reset to empty array
          }
          // NEW: Clear max limit fields if not tiered plan, setting to a default like 0 or null.
          if (key.startsWith('max_') && key.endsWith('_limit')) {
            // Set to default initial value or 0 if not a tiered plan.
            const defaultLimits = {
                max_sessions_limit: 100, max_contacts_limit: 10000,
                max_messages_limit: 100000, max_tags_limit: 1000,
                max_smart_tags_limit: 500, max_reports_limit: 100,
                max_templates_limit: 500, max_campaigns_limit: 100,
                max_dynamic_campaigns_limit: 50, max_users_limit: 100,
                max_roles_limit: 50
            };
            dataToSubmit[key] = defaultLimits[key];
          }
        });
      }

      if (plan) {
        await Plan.update(plan.id, dataToSubmit);
      } else {
        await Plan.create(dataToSubmit);
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error submitting plan:", error);
      setErrors({ submit: "Erro ao salvar plano. Tente novamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const renderFixedLimitField = (field, label, icon, unit = "", description = "") => (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        {React.createElement(icon, { className: "w-4 h-4 text-sky-600" })}
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="rounded-xl border-sky-200"
          min="-1"
          placeholder="-1 = Ilimitado"
        />
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <div className="flex gap-2 mt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleInputChange(field, -1)}
          className="text-xs rounded-lg border-sky-200 text-sky-600"
        >
          Ilimitado
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleInputChange(field, 0)}
          className="text-xs rounded-lg border-sky-200 text-sky-600"
        >
          Nenhum
        </Button>
      </div>
      {errors[field] && (
        <p className="text-sm text-red-600 mt-1">{errors[field]}</p>
      )}
    </div>
  );

  const renderCustomPriceField = (field, label, icon) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        {React.createElement(icon, { className: "w-4 h-4 text-sky-600" })}
        {label}
      </Label>
      <div className="flex items-center border border-sky-200 rounded-xl">
        <span className="px-3 py-2 bg-sky-50 text-sky-600 text-sm font-medium rounded-l-xl border-r border-sky-200">
          R$
        </span>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData[field]}
          onChange={(e) => handleInputChange(field, parseFloat(e.target.value) || 0)}
          className="border-0 rounded-l-none focus:ring-0"
          placeholder="0,00"
        />
      </div>
    </div>
  );

  const renderTieredField = (field, label, icon, unit = "unidades") => {
    const tiers = formData[field];
    const fieldErrors = errors[field] || [];
    const limitField = field.replace('tiers_', 'max_') + '_limit';
    const maxLimitValue = formData[limitField];
    
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          {React.createElement(icon, { className: "w-4 h-4 text-sky-600" })}
          {label}
        </Label>
        
        {/* Limite Máximo */}
        <div className="bg-sky-50 p-3 rounded-xl border border-sky-200">
          <Label htmlFor={limitField} className="text-xs font-medium text-sky-800 flex items-center gap-1 mb-2">
            <Shield className="w-3 h-3" />
            Limite Máximo do Sistema
          </Label>
          <Input
            id={limitField}
            type="number"
            min="1"
            value={maxLimitValue}
            onChange={(e) => handleInputChange(limitField, parseInt(e.target.value) || 0)}
            className={`w-32 h-8 text-xs ${errors[limitField] ? 'border-red-500' : 'border-sky-200'}`}
          />
          <p className="text-xs text-gray-700 mt-1">
            Clientes não podem exceder esta quantidade. Define o valor máximo de 'Até'.
          </p>
          {errors[limitField] && (
            <p className="text-xs text-red-600 mt-1">{errors[limitField]}</p>
          )}
        </div>
        
        <div className="space-y-2">
          {tiers.map((tier, index) => {
            // Calcular o valor do "De" automaticamente para faixas após a primeira
            const calculatedFromDisplay = index === 0 ? "1" : calculateNextFrom(tiers[index-1].up_to);

            return (
              <div key={index} className="flex flex-col gap-2 p-3 bg-sky-50 rounded-xl">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-gray-600 w-8">De</span>
                  <Input
                    type="number"
                    // Use calculatedFromDisplay for display, but formData.field[index].from for internal state
                    value={calculatedFromDisplay}
                    disabled={true} // Sempre travado
                    className={`w-20 h-8 text-xs rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed ${fieldErrors[index]?.from ? 'border-red-500' : 'border-sky-200'}`}
                    placeholder="1"
                  />
                  
                  <span className="text-sm text-gray-600">até</span>
                  <Input
                    type="number"
                    min={calculatedFromDisplay === "" ? '1' : calculatedFromDisplay}
                    value={tier.up_to}
                    onChange={(e) => updateTier(field, index, 'up_to', e.target.value)}
                    className={`w-20 h-8 text-xs rounded-lg ${fieldErrors[index]?.up_to ? 'border-red-500' : 'border-sky-200'}`}
                    placeholder="1000"
                  />
                  <span className="text-xs text-gray-500">{unit}</span>
                  
                  <span className="text-sm text-gray-600 mx-2">=</span>
                  
                  <div className="flex items-center border border-sky-200 rounded-lg">
                    <span className="px-2 py-1 bg-white text-sky-600 text-xs font-medium rounded-l-lg border-r border-sky-200">
                      R$
                    </span>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={tier.price_per_unit}
                      onChange={(e) => updateTier(field, index, 'price_per_unit', e.target.value)}
                      className={`border-0 rounded-l-none text-xs py-1 h-8 w-20 ${fieldErrors[index]?.price_per_unit ? 'border-red-500' : ''}`}
                      placeholder="0,000"
                    />
                  </div>
                  <span className="text-xs text-gray-500">cada</span>
                
                  <div className="flex gap-1 ml-auto"> {/* Buttons grouped to the right */}
                    {index === tiers.length - 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addTier(field)}
                        className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                    {tiers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTier(field, index)}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {fieldErrors[index]?.from && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors[index].from}</p>
                )}
                {fieldErrors[index]?.up_to && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors[index].up_to}</p>
                )}
                {fieldErrors[index]?.price_per_unit && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors[index].price_per_unit}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <>
      <style jsx global>{`
        .checkbox-sky [data-state="checked"] {
          background-color: #0ea5e9 !important;
          border-color: #0ea5e9 !important;
          border-radius: 4px !important;
        }
        
        .checkbox-sky [data-state="unchecked"] {
          border-color: #0ea5e9 !important;
          border-radius: 4px !important;
          border-width: 2px !important;
        }
        
        .checkbox-sky [data-state="checked"] svg {
          color: white !important;
        }
      `}</style>
      
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[900px] max-w-[95vw] bg-white shadow-xl border-0 overflow-hidden p-0 [&>button]:hidden flex flex-col"
          style={{ 
            height: '90vh',
            borderRadius: '2rem'
          }}
        >
          {/* Header - Fixed */}
          <div 
            className="relative flex-shrink-0 bg-gradient-to-br from-sky-500 to-sky-600"
            style={{ 
              height: '80px',
              borderTopLeftRadius: '2rem',
              borderTopRightRadius: '2rem'
            }}
          >
            <div className="absolute left-8 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/30 rounded-2xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-semibold text-white">
                {plan ? 'Editar Plano' : 'Novo Plano'}
              </span>
            </div>
            
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de Plano */}
                <Card className="rounded-3xl border-sky-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings className="w-5 h-5 text-sky-600" />
                      Tipo de Plano
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="plan-type" className="text-sm font-medium">
                        Selecione o modelo de precificação
                      </Label>
                      <Select value={planType} onValueChange={setPlanType}>
                        <SelectTrigger className="rounded-xl border-sky-200">
                          <SelectValue placeholder="Selecione o tipo de plano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">
                            Plano Fixo - Quantidades e preço fixo mensal
                          </SelectItem>
                          <SelectItem value="custom">
                            Plano Personalizado - Preço fixo por item
                          </SelectItem>
                          <SelectItem value="tiered">
                            Plano Escalonado - Preços por faixas de uso
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-gray-500 mt-2">
                        {planType === "fixed" && "Ideal para planos com limites definidos e preço mensal fixo"}
                        {planType === "custom" && "Cobra um valor fixo por cada item utilizado"}
                        {planType === "tiered" && "Preços decrescentes conforme o volume de uso aumenta"}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Informações Básicas */}
                <Card className="rounded-3xl border-sky-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings className="w-5 h-5 text-sky-600" />
                      Informações Básicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium">
                          Nome do Plano *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="rounded-xl border-sky-200 mt-1"
                          placeholder="Ex: Essencial"
                        />
                        {errors.name && (
                          <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="slug" className="text-sm font-medium">
                          Slug *
                        </Label>
                        <Input
                          id="slug"
                          value={formData.slug}
                          onChange={(e) => handleInputChange('slug', e.target.value)}
                          className="rounded-xl border-sky-200 mt-1"
                          placeholder="essencial"
                        />
                        {errors.slug && (
                          <p className="text-sm text-red-600 mt-1">{errors.slug}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-sm font-medium">
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="rounded-xl border-sky-200 mt-1 min-h-[80px]"
                        placeholder="Descreva as características deste plano..."
                      />
                    </div>

                    {planType === "fixed" && (
                      <div className="space-y-4">
                        <Label className="text-base font-semibold text-gray-900">Precificação por Período</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label htmlFor="price" className="text-sm font-medium">
                              Preço Mensal *
                            </Label>
                            <div className="flex items-center border border-sky-200 rounded-xl mt-1">
                              <span className="px-3 py-2 bg-sky-50 text-sky-600 text-sm font-medium rounded-l-xl border-r border-sky-200">
                                R$
                              </span>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price}
                                onChange={(e) => handleInputChange('price', e.target.value)}
                                onBlur={() => handlePriceBlur('price')}
                                className="border-0 rounded-l-none focus:ring-0"
                                placeholder="0,00"
                              />
                            </div>
                            {errors.price && (
                              <p className="text-sm text-red-600 mt-1">{errors.price}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="price_quarterly" className="text-sm font-medium">
                              Preço Trimestral
                            </Label>
                            <div className="flex items-center border border-sky-200 rounded-xl mt-1">
                              <span className="px-3 py-2 bg-sky-50 text-sky-600 text-sm font-medium rounded-l-xl border-r border-sky-200">
                                R$
                              </span>
                              <Input
                                id="price_quarterly"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price_quarterly}
                                onChange={(e) => handleInputChange('price_quarterly', e.target.value)}
                                onBlur={() => handlePriceBlur('price_quarterly')}
                                className="border-0 rounded-l-none focus:ring-0"
                                placeholder="0,00"
                              />
                            </div>
                            {errors.price_quarterly && (
                              <p className="text-sm text-red-600 mt-1">{errors.price_quarterly}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="price_biannual" className="text-sm font-medium">
                              Preço Semestral
                            </Label>
                            <div className="flex items-center border border-sky-200 rounded-xl mt-1">
                              <span className="px-3 py-2 bg-sky-50 text-sky-600 text-sm font-medium rounded-l-xl border-r border-sky-200">
                                R$
                              </span>
                              <Input
                                id="price_biannual"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price_biannual}
                                onChange={(e) => handleInputChange('price_biannual', e.target.value)}
                                onBlur={() => handlePriceBlur('price_biannual')}
                                className="border-0 rounded-l-none focus:ring-0"
                                placeholder="0,00"
                              />
                            </div>
                            {errors.price_biannual && (
                              <p className="text-sm text-red-600 mt-1">{errors.price_biannual}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="price_annual" className="text-sm font-medium">
                              Preço Anual
                            </Label>
                            <div className="flex items-center border border-sky-200 rounded-xl mt-1">
                              <span className="px-3 py-2 bg-sky-50 text-sky-600 text-sm font-medium rounded-l-xl border-r border-sky-200">
                                R$
                              </span>
                              <Input
                                id="price_annual"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price_annual}
                                onChange={(e) => handleInputChange('price_annual', e.target.value)}
                                onBlur={() => handlePriceBlur('price_annual')}
                                className="border-0 rounded-l-none focus:ring-0"
                                placeholder="0,00"
                              />
                            </div>
                            {errors.price_annual && (
                              <p className="text-sm text-red-600 mt-1">{errors.price_annual}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="display_order" className="text-sm font-medium">
                          Ordem de Exibição
                        </Label>
                        <Input
                          id="display_order"
                          type="number"
                          min="1"
                          value={formData.display_order}
                          onChange={(e) => handleInputChange('display_order', e.target.value)}
                          className="rounded-xl border-sky-200 mt-1"
                        />
                      </div>

                      <div className="space-y-3 checkbox-sky">
                        <Label className="text-sm font-medium">Opções</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="is_popular"
                              checked={formData.is_popular}
                              onCheckedChange={(value) => handleInputChange('is_popular', value)}
                            />
                            <label htmlFor="is_popular" className="text-sm font-medium cursor-pointer">
                              Plano Popular
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="is_listed"
                              checked={formData.is_listed}
                              onCheckedChange={(value) => handleInputChange('is_listed', value)}
                            />
                            <label htmlFor="is_listed" className="text-sm font-medium cursor-pointer">
                              Listar no Catálogo
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recursos do Sistema */}
                <Card className="rounded-3xl border-sky-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-sky-600" />
                      Recursos do Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className={`grid ${planType === 'tiered' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6`}>
                      {planType === "fixed" && (
                        <>
                          {renderFixedLimitField('active_sessions', 'Sessões Ativas', Users, 'sessões', 'Número máximo de sessões WhatsApp simultâneas')}
                          {renderFixedLimitField('active_contacts', 'Contatos Ativos', Users, 'contatos', 'Número máximo de contatos cadastrados')}
                          {renderFixedLimitField('messages_per_month', 'Mensagens por Mês', MessageCircle, 'mensagens', 'Limite mensal de mensagens enviadas')}
                          {renderFixedLimitField('template_models', 'Modelos de Template', FileText, 'modelos', 'Quantidade de templates disponíveis')}
                          {renderFixedLimitField('company_users', 'Usuários da Empresa', Users, 'usuários', 'Número máximo de usuários por empresa')}
                          {renderFixedLimitField('roles_permissions', 'Funções e Permissões', Shield, 'funções', 'Quantidade de funções personalizadas')}
                        </>
                      )}
                      
                      {planType === "custom" && (
                        <>
                          {renderCustomPriceField('price_sessions', 'Preço por Sessão', Users)}
                          {renderCustomPriceField('price_contacts', 'Preço por Contato', Users)}
                          {renderCustomPriceField('price_messages', 'Preço por Mensagem', MessageCircle)}
                          {renderCustomPriceField('price_templates', 'Preço por Template', FileText)}
                          {renderCustomPriceField('price_users', 'Preço por Usuário', Users)}
                          {renderCustomPriceField('price_roles', 'Preço por Função', Shield)}
                        </>
                      )}
                      
                      {planType === "tiered" && (
                        <>
                          {renderTieredField('tiers_sessions', 'Sessões Ativas', Users, 'sessões')}
                          {renderTieredField('tiers_contacts', 'Contatos Ativos', Users, 'contatos')}
                          {renderTieredField('tiers_messages', 'Mensagens por Mês', MessageCircle, 'mensagens')}
                          {renderTieredField('tiers_templates', 'Modelos de Template', FileText, 'templates')}
                          {renderTieredField('tiers_users', 'Usuários da Empresa', Users, 'usuários')}
                          {renderTieredField('tiers_roles', 'Funções e Permissões', Shield, 'funções')}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Campanhas e Automação */}
                <Card className="rounded-3xl border-sky-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="w-5 h-5 text-sky-600" />
                      Campanhas e Automação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className={`grid ${planType === 'tiered' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6`}>
                      {planType === "fixed" && (
                        <>
                          {renderFixedLimitField('recurring_campaigns', 'Campanhas Recorrentes', Calendar, 'campanhas', 'Campanhas que se repetem automaticamente')}
                          {renderFixedLimitField('dynamic_campaigns', 'Campanhas Dinâmicas', Target, 'campanhas', 'Campanhas com filtros que se atualizam')}
                          {renderFixedLimitField('active_tags', 'Marcadores', Tag, 'marcadores', 'Tags para organizar contatos')}
                          {renderFixedLimitField('active_smart_tags', 'Marcadores Inteligentes', Star, 'marcadores', 'Tags que se aplicam automaticamente')}
                        </>
                      )}
                      
                      {planType === "custom" && (
                        <>
                          {renderCustomPriceField('price_campaigns', 'Preço por Campanha', Calendar)}
                          {renderCustomPriceField('price_dynamic_campaigns', 'Preço por Campanha Dinâmica', Target)}
                          {renderCustomPriceField('price_tags', 'Preço por Marcador', Tag)}
                          {renderCustomPriceField('price_smart_tags', 'Preço por Marcador Inteligente', Star)}
                        </>
                      )}
                      
                      {planType === "tiered" && (
                        <>
                          {renderTieredField('tiers_campaigns', 'Campanhas Recorrentes', Calendar, 'campanhas')}
                          {renderTieredField('tiers_dynamic_campaigns', 'Campanhas Dinâmicas', Target, 'campanhas')}
                          {renderTieredField('tiers_tags', 'Marcadores', Tag, 'marcadores')}
                          {renderTieredField('tiers_smart_tags', 'Marcadores Inteligentes', Star, 'marcadores')}
                        </>
                      )}
                    </div>

                    <div className="space-y-3 checkbox-sky">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="message_reception"
                          checked={formData.message_reception}
                          onCheckedChange={(value) => handleInputChange('message_reception', value)}
                        />
                        <label htmlFor="message_reception" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-sky-600" />
                          Recepção de Mensagens
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Relatórios e Análise */}
                <Card className="rounded-3xl border-sky-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="w-5 h-5 text-sky-600" />
                      Relatórios e Análise
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {planType === "fixed" && renderFixedLimitField('report_personalization', 'Relatórios Personalizados', BarChart3, 'relatórios', 'Relatórios customizados pelo usuário')}
                    {planType === "custom" && renderCustomPriceField('price_reports', 'Preço por Relatório', BarChart3)}
                    {planType === "tiered" && renderTieredField('tiers_reports', 'Relatórios Personalizados', BarChart3, 'relatórios')}
                  </CardContent>
                </Card>

                {/* Suporte e Notificações */}
                <Card className="rounded-3xl border-sky-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <HelpCircle className="w-5 h-5 text-sky-600" />
                      Suporte e Notificações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-sky-600" />
                        Tempo de Resposta do Suporte (horas)
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.support_hours}
                        onChange={(e) => handleInputChange('support_hours', e.target.value)}
                        className="rounded-xl border-sky-200 mt-1"
                        placeholder="24"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Tempo máximo para primeira resposta do suporte em horas
                      </p>
                    </div>

                    <div className="space-y-3 checkbox-sky">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="implementation_help"
                          checked={formData.implementation_help}
                          onCheckedChange={(value) => handleInputChange('implementation_help', value)}
                        />
                        <label htmlFor="implementation_help" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <Settings className="w-4 h-4 text-sky-600" />
                          Ajuda de Implantação
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="daily_whatsapp_notifications"
                          checked={formData.daily_whatsapp_notifications}
                          onCheckedChange={(value) => handleInputChange('daily_whatsapp_notifications', value)}
                        />
                        <label htmlFor="daily_whatsapp_notifications" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <Bell className="w-4 h-4 text-sky-600" />
                          Resumo Diário via WhatsApp
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">
                        Receba um resumo diário das atividades, métricas importantes e novidades do sistema
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {errors.submit && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div 
            className="relative flex-shrink-0 bg-white border-t border-sky-200 shadow-lg"
            style={{ 
              height: '80px',
              borderBottomLeftRadius: '2rem',
              borderBottomRightRadius: '2rem'
            }}
          >
            <div className="h-full flex justify-between items-center px-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-xl text-white bg-sky-600 hover:bg-sky-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {plan ? 'Atualizar Plano' : 'Criar Plano'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

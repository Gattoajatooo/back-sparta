import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, 
  Search,
  Copy,
  Zap,
  User,
  Calculator,
  MessageSquare,
  DollarSign,
  Gift,
  Calendar,
  Building2,
  Clock,
  Star,
  Target,
  TrendingUp,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";

export default function TemplateVariableHelper({ onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedVariable, setCopiedVariable] = useState('');

  // Comprehensive variable library
  const variableCategories = {
    'customer': {
      name: 'Customer Information',
      icon: User,
      color: 'text-blue-600',
      variables: [
        { key: 'customer.first_name', description: 'Customer first name', example: 'Maria' },
        { key: 'customer.last_name', description: 'Customer last name', example: 'Silva' },
        { key: 'customer.full_name', description: 'Customer full name', example: 'Maria Silva' },
        { key: 'customer.email', description: 'Customer email address', example: 'maria@email.com' },
        { key: 'customer.phone', description: 'Customer phone number', example: '+55 11 99999-1234' },
        { key: 'customer.company_name', description: 'Customer company', example: 'Tech Solutions' },
        { key: 'customer.position', description: 'Customer job position', example: 'CEO' },
        { key: 'customer.birth_date', description: 'Customer birth date', example: '15/05/1990' },
        { key: 'customer.address', description: 'Customer address', example: 'Rua das Flores, 123' },
        { key: 'customer.city', description: 'Customer city', example: 'São Paulo' },
        { key: 'customer.status', description: 'Customer status', example: 'VIP' },
        { key: 'customer.source', description: 'How customer was acquired', example: 'Website' },
        { key: 'customer.tags', description: 'Customer tags', example: 'Premium, Tech' }
      ]
    },
    'calculations': {
      name: 'Dynamic Calculations',
      icon: Calculator,
      color: 'text-purple-600',
      variables: [
        { key: 'calc.age', description: 'Calculated age based on birth date', example: '34' },
        { key: 'calc.days_until_birthday', description: 'Days until next birthday', example: '45' },
        { key: 'calc.years_as_customer', description: 'Years as customer', example: '3' },
        { key: 'calc.months_since_last_purchase', description: 'Months since last purchase', example: '2' },
        { key: 'calc.total_purchases', description: 'Total number of purchases', example: '12' },
        { key: 'calc.lifetime_value', description: 'Customer lifetime value', example: 'R$ 5.250' },
        { key: 'calc.average_order_value', description: 'Average order value', example: 'R$ 437' },
        { key: 'calc.days_since_registration', description: 'Days since registration', example: '365' }
      ]
    },
    'greetings': {
      name: 'Smart Greetings',
      icon: MessageSquare,
      color: 'text-green-600',
      variables: [
        { key: 'greeting.formal', description: 'Formal greeting', example: 'Prezado(a)' },
        { key: 'greeting.friendly', description: 'Friendly greeting', example: 'Olá' },
        { key: 'greeting.casual', description: 'Casual greeting', example: 'E aí' },
        { key: 'greeting.dynamic', description: 'Time-based greeting', example: 'Bom dia' },
        { key: 'greeting.seasonal', description: 'Season-based greeting', example: 'Feliz Natal' },
        { key: 'greeting.personalized', description: 'Personalized based on customer', example: 'Oi Maria' },
        { key: 'greeting.business', description: 'Business greeting', example: 'Prezados' }
      ]
    },
    'billing': {
      name: 'Billing & Finance',
      icon: DollarSign,
      color: 'text-red-600',
      variables: [
        { key: 'billing.amount', description: 'Invoice amount', example: 'R$ 299,99' },
        { key: 'billing.due_date', description: 'Invoice due date', example: '30/01/2024' },
        { key: 'billing.invoice_number', description: 'Invoice number', example: '2024-001' },
        { key: 'billing.overdue_days', description: 'Days overdue', example: '5' },
        { key: 'billing.late_fee', description: 'Late fee amount', example: 'R$ 15,00' },
        { key: 'billing.total_with_fees', description: 'Total including fees', example: 'R$ 314,99' },
        { key: 'billing.payment_link', description: 'Payment link URL', example: 'https://pay.company.com/123' },
        { key: 'billing.next_due_date', description: 'Next invoice due date', example: '28/02/2024' },
        { key: 'billing.due_date_plus_days.X', description: 'Due date + X days', example: 'billing.due_date_plus_days.5' }
      ]
    },
    'promotions': {
      name: 'Promotions & Offers',
      icon: Gift,
      color: 'text-pink-600',
      variables: [
        { key: 'promo.discount', description: 'Discount percentage', example: '20' },
        { key: 'promo.discount_amount', description: 'Discount amount', example: 'R$ 50,00' },
        { key: 'promo.code', description: 'Promotion code', example: 'SAVE20' },
        { key: 'promo.valid_until', description: 'Promotion expiry', example: '31/01/2024' },
        { key: 'promo.minimum_order', description: 'Minimum order value', example: 'R$ 100,00' },
        { key: 'promo.free_shipping', description: 'Free shipping offer', example: 'Frete Grátis' },
        { key: 'promo.category', description: 'Promotion category', example: 'Electronics' },
        { key: 'promo.savings', description: 'Total savings', example: 'R$ 80,00' }
      ]
    },
    'dates': {
      name: 'Dates & Time',
      icon: Calendar,
      color: 'text-indigo-600',
      variables: [
        { key: 'date.today', description: 'Current date', example: '15/01/2024' },
        { key: 'date.tomorrow', description: 'Tomorrow date', example: '16/01/2024' },
        { key: 'date.yesterday', description: 'Yesterday date', example: '14/01/2024' },
        { key: 'date.current_month', description: 'Current month name', example: 'Janeiro' },
        { key: 'date.current_year', description: 'Current year', example: '2024' },
        { key: 'date.day_of_week', description: 'Day of week', example: 'Segunda-feira' },
        { key: 'date.today_plus_days.X', description: 'Today + X days', example: 'date.today_plus_days.7' },
        { key: 'date.today_minus_days.X', description: 'Today - X days', example: 'date.today_minus_days.30' },
        { key: 'date.first_day_of_month', description: 'First day of current month', example: '01/01/2024' },
        { key: 'date.last_day_of_month', description: 'Last day of current month', example: '31/01/2024' }
      ]
    },
    'company': {
      name: 'Company Information',
      icon: Building2,
      color: 'text-gray-600',
      variables: [
        { key: 'company.name', description: 'Company name', example: 'Sparta Sync' },
        { key: 'company.phone', description: 'Company phone', example: '(11) 99999-9999' },
        { key: 'company.email', description: 'Company email', example: 'contact@spartasync.com' },
        { key: 'company.address', description: 'Company address', example: 'Av. Paulista, 1000' },
        { key: 'company.website', description: 'Company website', example: 'www.spartasync.com' },
        { key: 'company.signature', description: 'Company signature', example: 'Equipe Sparta Sync' },
        { key: 'company.support_hours', description: 'Support hours', example: '8h às 18h' },
        { key: 'company.social_media', description: 'Social media', example: '@spartasync' }
      ]
    },
    'notes': {
      name: 'Notes & Observations',
      icon: FileText,
      color: 'text-amber-600',
      variables: [
        { key: 'customer.notes.1', description: 'First note/observation', example: 'Cliente preferencial' },
        { key: 'customer.notes.2', description: 'Second note/observation', example: 'Prefere contato manhã' },
        { key: 'customer.notes.3', description: 'Third note/observation', example: 'Aniversário em janeiro' },
        { key: 'customer.notes.4', description: 'Fourth note/observation', example: 'Mora em SP' },
        { key: 'customer.notes.5', description: 'Fifth note/observation', example: 'Interessado em produto X' },
        { key: 'customer.notes.all', description: 'All notes combined', example: 'Note 1; Note 2; Note 3' },
        { key: 'customer.notes.latest', description: 'Most recent note', example: 'Última observação registrada' }
      ]
    },
    'purchase': {
      name: 'Purchase History',
      icon: TrendingUp,
      color: 'text-emerald-600',
      variables: [
        { key: 'purchase.last_product', description: 'Last purchased product', example: 'Smartphone Pro' },
        { key: 'purchase.last_amount', description: 'Last purchase amount', example: 'R$ 1.200,00' },
        { key: 'purchase.last_date', description: 'Last purchase date', example: '10/12/2023' },
        { key: 'purchase.favorite_category', description: 'Favorite product category', example: 'Electronics' },
        { key: 'purchase.total_spent', description: 'Total amount spent', example: 'R$ 5.250,00' },
        { key: 'purchase.order_count', description: 'Total orders', example: '12' },
        { key: 'purchase.pending_orders', description: 'Pending orders', example: '1' }
      ]
    }
  };

  const copyToClipboard = (variable) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(''), 2000);
  };

  const filteredCategories = Object.entries(variableCategories).reduce((acc, [key, category]) => {
    const filteredVariables = category.variables.filter(variable =>
      !searchTerm || 
      variable.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filteredVariables.length > 0) {
      acc[key] = { ...category, variables: filteredVariables };
    }
    
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        <Card className="rounded-3xl border-gray-200 h-full flex flex-col">
          <CardHeader className="pb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Variable Library</CardTitle>
                  <p className="text-sm text-gray-600">Click any variable to copy to clipboard</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative mb-6 flex-shrink-0">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search variables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-2xl border-gray-200"
              />
            </div>

            {/* Variable Categories */}
            <div className="flex-1 overflow-y-auto space-y-6">
              {Object.entries(filteredCategories).map(([categoryKey, category]) => (
                <div key={categoryKey} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <category.icon className={`w-5 h-5 ${category.color}`} />
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    <Badge variant="outline" className="text-xs rounded-full">
                      {category.variables.length} variables
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.variables.map((variable) => (
                      <Card
                        key={variable.key}
                        className="rounded-2xl border-gray-200 hover:border-green-300 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => copyToClipboard(variable.key)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0 mr-2">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm font-mono text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                  {variable.key}
                                </code>
                                {copiedVariable === variable.key && (
                                  <Badge className="bg-green-100 text-green-800 text-xs rounded-full">
                                    Copied!
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{variable.description}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Star className="w-3 h-3" />
                                <span>Example: {variable.example}</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full flex-shrink-0 hover:bg-green-100"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              
              {Object.keys(filteredCategories).length === 0 && (
                <div className="text-center py-16">
                  <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No variables found</h3>
                  <p className="text-gray-500">Try adjusting your search terms</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
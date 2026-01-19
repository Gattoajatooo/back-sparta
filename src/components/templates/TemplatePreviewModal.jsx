import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, 
  Eye, 
  Send,
  Smartphone,
  Mail,
  MessageSquare,
  User,
  Calendar,
  TrendingUp,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function TemplatePreviewModal({ 
  template, 
  templateCategories,
  templateTypes,
  onClose 
}) {
  const [previewMode, setPreviewMode] = useState('rendered');
  
  const category = templateCategories.find(cat => cat.id === template.category);
  const type = templateTypes.find(t => t.id === template.type);
  const CategoryIcon = category?.icon;
  const TypeIcon = type?.icon;

  // Sample data for preview
  const sampleData = {
    customer: {
      first_name: 'Maria',
      last_name: 'Silva',
      email: 'maria@email.com',
      phone: '+55 11 99999-1234',
      company_name: 'Tech Solutions',
      birth_date: '1990-05-15'
    },
    calc: {
      age: new Date().getFullYear() - 1990
    },
    greeting: {
      formal: 'Prezado(a)',
      friendly: 'Olá',
      dynamic: new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'
    },
    billing: {
      amount: 'R$ 299,99',
      due_date: '30/01/2024',
      due_date_plus_days: {
        5: '04/02/2024'
      }
    },
    promo: {
      discount: '20'
    },
    date: {
      today: new Date().toLocaleDateString('pt-BR'),
      today_plus_days: {
        7: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
      }
    },
    company: {
      name: 'Sparta Sync',
      signature: 'Equipe Sparta Sync\nAtendimento: (11) 99999-9999'
    }
  };

  const generatePreview = (content) => {
    let previewText = content;
    
    // Replace variables with sample data
    Object.entries(sampleData).forEach(([category, data]) => {
      if (typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'object') {
            // Handle nested objects like billing.due_date_plus_days.5
            Object.entries(value).forEach(([nestedKey, nestedValue]) => {
              const pattern = new RegExp(`{{${category}\\.${key}\\.${nestedKey}}}`, 'g');
              previewText = previewText.replace(pattern, nestedValue);
            });
          } else {
            const pattern = new RegExp(`{{${category}\\.${key}}}`, 'g');
            previewText = previewText.replace(pattern, value);
          }
        });
      } else {
        const pattern = new RegExp(`{{${category}}}`, 'g');
        previewText = previewText.replace(pattern, data);
      }
    });
    
    return previewText;
  };

  const renderedContent = generatePreview(template.content);
  const renderedSubject = template.subject ? generatePreview(template.subject) : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <Card className="rounded-3xl border-gray-200 h-full flex flex-col">
          <CardHeader className="pb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${category?.color || 'bg-gray-100 text-gray-600'} rounded-2xl flex items-center justify-center`}>
                  {CategoryIcon && <CategoryIcon className="w-6 h-6" />}
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">{template.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`rounded-full text-xs ${category?.color}`}>
                      {category?.name}
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-xs bg-blue-100 text-blue-800">
                      {type?.name}
                    </Badge>
                    <Badge variant="outline" className={`rounded-full text-xs ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden">
            <Tabs value={previewMode} onValueChange={setPreviewMode} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-3 rounded-2xl bg-gray-100 p-1 mb-6 flex-shrink-0">
                <TabsTrigger value="rendered" className="rounded-xl">Preview</TabsTrigger>
                <TabsTrigger value="raw" className="rounded-xl">Raw Template</TabsTrigger>
                <TabsTrigger value="info" className="rounded-xl">Template Info</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="rendered" className="mt-0 h-full">
                  <div className="space-y-6">
                    {/* Device Preview */}
                    <div className="flex justify-center">
                      <div className={`${
                        template.type === 'whatsapp' ? 'max-w-sm' :
                        template.type === 'email' ? 'max-w-2xl' : 'max-w-md'
                      } w-full`}>
                        {template.type === 'whatsapp' && (
                          <div className="bg-green-500 rounded-t-3xl p-4 text-white">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-white text-green-500 text-sm font-medium">
                                  MS
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">Maria Silva</p>
                                <p className="text-xs opacity-90">online</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className={`${
                          template.type === 'whatsapp' ? 'bg-gray-100 border-x border-b border-gray-200 rounded-b-3xl' :
                          template.type === 'email' ? 'bg-white border border-gray-200 rounded-2xl' :
                          'bg-white border border-gray-200 rounded-2xl'
                        } p-6`}>
                          {template.type === 'email' && renderedSubject && (
                            <div className="mb-4 pb-4 border-b border-gray-200">
                              <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
                              <p className="font-semibold text-gray-900">{renderedSubject}</p>
                            </div>
                          )}
                          
                          <div className={`${
                            template.type === 'whatsapp' ? 'bg-white rounded-2xl p-4 ml-4' :
                            template.type === 'email' ? '' :
                            'text-center'
                          }`}>
                            <div className="whitespace-pre-wrap text-sm text-gray-800">
                              {renderedContent}
                            </div>
                            
                            {template.type === 'whatsapp' && (
                              <div className="flex justify-end mt-2">
                                <span className="text-xs text-gray-500">
                                  {format(new Date(), 'HH:mm')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Variables Used */}
                    {template.variables && template.variables.length > 0 && (
                      <div className="bg-blue-50 rounded-2xl p-4">
                        <h4 className="font-medium text-blue-900 mb-3">Variables in this preview:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {template.variables.map((variable, index) => {
                            const sampleValue = generatePreview(`{{${variable}}}`).replace(`{{${variable}}}`, 'N/A');
                            return (
                              <div key={index} className="bg-white rounded-xl p-3">
                                <p className="font-mono text-xs text-blue-600 mb-1">{variable}</p>
                                <p className="text-sm text-gray-700">→ {sampleValue}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="mt-0">
                  <div className="space-y-4">
                    {template.subject && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Email Subject:</h4>
                        <div className="bg-gray-100 rounded-2xl p-4">
                          <code className="text-sm text-gray-800 whitespace-pre-wrap">
                            {template.subject}
                          </code>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Template Content:</h4>
                      <div className="bg-gray-100 rounded-2xl p-4">
                        <code className="text-sm text-gray-800 whitespace-pre-wrap">
                          {template.content}
                        </code>
                      </div>
                    </div>

                    {template.variables && template.variables.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Available Variables:</h4>
                        <div className="flex flex-wrap gap-2">
                          {template.variables.map((variable, index) => (
                            <Badge key={index} variant="outline" className="font-mono text-xs rounded-full bg-green-100 text-green-800">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="info" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="rounded-2xl border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Eye className="w-5 h-5 text-blue-600" />
                          Template Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p className="font-medium">{template.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Category</p>
                          <div className="flex items-center gap-2">
                            {CategoryIcon && <CategoryIcon className="w-4 h-4" />}
                            <p className="font-medium">{category?.name}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Type</p>
                          <div className="flex items-center gap-2">
                            {TypeIcon && <TypeIcon className="w-4 h-4" />}
                            <p className="font-medium">{type?.name}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <Badge variant="outline" className={`rounded-full text-xs ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          Usage Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">Times Used</p>
                          <p className="text-2xl font-bold text-green-600">{template.usage_count}</p>
                        </div>
                        {template.last_used && (
                          <div>
                            <p className="text-sm text-gray-500">Last Used</p>
                            <p className="font-medium">{format(new Date(template.last_used), 'PPP')}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-500">Created</p>
                          <p className="font-medium">{format(new Date(template.created_date), 'PPP')}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {template.scheduling?.auto_send && (
                    <Card className="rounded-2xl border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-purple-600" />
                          Automatic Scheduling
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Trigger</p>
                            <p className="font-medium capitalize">{template.scheduling.trigger_event.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Days Before</p>
                            <p className="font-medium">{template.scheduling.trigger_days_before}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Send Time</p>
                            <p className="font-medium">{template.scheduling.trigger_time}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
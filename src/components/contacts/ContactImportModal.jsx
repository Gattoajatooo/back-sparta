import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  Copy,
  Download,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Info,
  MessageSquare,
  Mail,
  Users,
  Smartphone,
  Settings,
  X,
  FileSpreadsheet,
  Loader2,
  Database,
  Zap,
  Globe,
  Calendar,
  Search,
  Eye,
} from "lucide-react";
import { UploadFile } from "@/integrations/Core";
import { parseUploadedFile } from "@/functions/parseUploadedFile";
import { importContactsAsync } from "@/functions/importContactsAsync";
import { base44 } from "@/api/base44Client";

import ContactReviewStep from "./ContactReviewStep";

export default function ContactImportModal({ open, onClose, onSuccess, companyId, useAsyncImport = false }) {
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState("");
  const [importName, setImportName] = useState("");
  const [file, setFile] = useState(null);
  const [pastedData, setPastedData] = useState("");
  const [headers, setHeaders] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [mapping, setMapping] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [transformedContacts, setTransformedContacts] = useState([]);
  const [isCancelling, setIsCancelling] = useState(false);

  const availableFields = [
    { value: "first_name", label: "Nome *" },
    { value: "last_name", label: "Sobrenome" },
    { value: "document_number", label: "CPF/CNPJ" },
    { value: "gender", label: "Gênero" },
    { value: "birth_date", label: "Data de Nascimento" },
    { value: "responsible_name", label: "Responsável" },
    { value: "value", label: "Valor Estimado" },
    { value: "email", label: "Email Principal *" },
    { value: "email_type", label: "Tipo Email Principal" },
    { value: "email_2", label: "Email 2" },
    { value: "email_2_type", label: "Tipo Email 2" },
    { value: "email_3", label: "Email 3" },
    { value: "email_3_type", label: "Tipo Email 3" },
    { value: "email_4", label: "Email 4" },
    { value: "email_4_type", label: "Tipo Email 4" },
    { value: "phone", label: "Telefone Principal *" },
    { value: "phone_type", label: "Tipo Telefone Principal" },
    { value: "phone_2", label: "Telefone 2" },
    { value: "phone_2_type", label: "Tipo Telefone 2" },
    { value: "phone_3", label: "Telefone 3" },
    { value: "phone_3_type", label: "Tipo Telefone 3" },
    { value: "phone_4", label: "Telefone 4" },
    { value: "phone_4_type", label: "Tipo Telefone 4" },
    { value: "company_name", label: "Empresa" },
    { value: "position", label: "Cargo" },
    { value: "custom_position", label: "Cargo Personalizado" },
    { value: "address_type", label: "Tipo de Endereço" },
    { value: "cep", label: "CEP" },
    { value: "street", label: "Rua/Logradouro" },
    { value: "number", label: "Número" },
    { value: "complement", label: "Complemento" },
    { value: "neighborhood", label: "Bairro" },
    { value: "city", label: "Cidade" },
    { value: "state", label: "Estado/UF" },
    { value: "country", label: "País" },
    { value: "status", label: "Status do Contato" },
    { value: "source", label: "Origem/Fonte" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "facebook", label: "Facebook" },
    { value: "instagram", label: "Instagram" },
    { value: "twitter", label: "Twitter" },
    { value: "website", label: "Website" },
    { value: "bank_name", label: "Nome do Banco" },
    { value: "bank_code", label: "Código do Banco" },
    { value: "agency", label: "Agência" },
    { value: "account", label: "Número da Conta" },
    { value: "account_digit", label: "Dígito da Conta" },
    { value: "pix_key_type", label: "Tipo da Chave PIX" },
    { value: "pix_key", label: "Chave PIX" },
    { value: "notes", label: "Observações" },
    { value: "tags", label: "Tags/Marcadores" },
    { value: "skip", label: "❌ Não mapear este campo" }
  ];

  useEffect(() => {
    if (open) {
      setStep(1);
      setImportType("");
      setImportName("");
      setFile(null);
      setPastedData("");
      setHeaders([]);
      setPreviewData([]);
      setAllData([]);
      setMapping({});
      setIsProcessing(false);
      setErrors([]);
      setIsUploading(false);
      setIsParsingFile(false);
      setFileUrl(null);
      setTransformedContacts([]);
      setIsCancelling(false);
    }
  }, [open]);

  // Escutar evento de cancelamento do ContactReviewStep
  useEffect(() => {
    const handleCancelEvent = () => {
      handleCancelImport();
    };
    
    window.addEventListener('cancelImport', handleCancelEvent);
    return () => window.removeEventListener('cancelImport', handleCancelEvent);
  }, []);

  const handleCancelImport = () => {
    setIsCancelling(true);
    
    // Limpar progresso no localStorage
    localStorage.removeItem('importProgress');
    
    // Disparar evento para atualizar UI
    window.dispatchEvent(new CustomEvent('importProgressUpdate', {
      detail: {
        isProcessing: false,
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        duplicates: 0,
        noWhatsApp: 0,
        updated: 0
      }
    }));
    
    // Fechar modal
    onClose();
    setIsCancelling(false);
  };

  const downloadTemplate = (type = 'csv') => {
    let csvHeaders, csvContent, filename, mimeType;

    if (type === 'csv') {
      csvHeaders = [
        "nome", "sobrenome", "email", "telefone", "cpf_cnpj",
        "empresa", "cargo", "responsavel", "data_nascimento", "valor",
        "email_2", "email_3", "email_4",
        "telefone_2", "telefone_3", "telefone_4",
        "cep", "rua", "numero", "complemento", "bairro", "cidade", "estado",
        "status", "origem", "observacoes", "tags"
      ];

      csvContent = [
        csvHeaders.join(','),
        [
          "João", "Silva", "joao@email.com", "(11) 99999-9999", "123.456.789-00",
          "Empresa ABC", "Gerente", "Maria Santos", "1990-01-15", "5000",
          "joao.trabalho@empresa.com", "", "",
          "(11) 3333-4444", "", "",
          "01234-567", "Rua das Flores", "123", "Apto 45", "Centro", "São Paulo", "SP",
          "lead", "website", "Cliente muito interessado", "vip,cliente-gold"
        ].join(',')
      ].join('\n');

      filename = 'modelo_importacao_contatos.csv';
      mimeType = 'text/csv;charset=utf-8;';
    }

    if (type === 'excel') {
      csvHeaders = [
        "Nome", "Sobrenome", "Email Principal", "Telefone Principal", "CPF/CNPJ",
        "Gênero", "Data de Nascimento", "Responsável", "Valor Estimado",
        "Email 2", "Tipo Email 2", "Email 3", "Tipo Email 3", "Email 4", "Tipo Email 4",
        "Telefone 2", "Tipo Telefone 2", "Telefone 3", "Tipo Telefone 3", "Telefone 4", "Tipo Telefone 4",
        "Empresa", "Cargo", "Cargo Personalizado",
        "CEP", "Rua", "Número", "Complemento", "Bairro", "Cidade", "Estado", "País",
        "Status", "Origem", "LinkedIn", "Facebook", "Instagram", "Twitter", "Website",
        "Nome do Banco", "Código do Banco", "Agência", "Conta", "Dígito da Conta", "Tipo Chave PIX", "Chave PIX",
        "Observações", "Tags"
      ];

      csvContent = [
        csvHeaders.join(';'),
        [
          "João", "Silva", "joao@email.com", "(11) 99999-9999", "123.456.789-00",
          "Masculino", "15/01/1990", "Maria Santos", "5000",
          "joao.trabalho@empresa.com", "Trabalho", "joao.pessoal@gmail.com", "Pessoal", "", "",
          "(11) 3333-4444", "Trabalho", "(11) 88888-8888", "Casa", "", "",
          "Empresa ABC", "Gerente", "",
          "01234-567", "Rua das Flores", "123", "Apto 45", "Centro", "São Paulo", "SP", "Brasil",
          "linkedin.com/in/joaosilva", "facebook.com/joaosilva", "instagram.com/joaosilva", "twitter.com/joaosilva", "joaosilva.com.br",
          "Banco do Brasil", "001", "1234-5", "12345678", "9", "CPF", "123.456.789-00",
          "Cliente muito interessado", "VIP;Cliente Gold;Prioritário"
        ].join(';')
      ].join('\n');

      filename = 'modelo_importacao_excel.csv';
      mimeType = 'text/csv;charset=utf-8;';
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setIsUploading(true);
    setErrors([]);

    try {
      const { file_url } = await UploadFile({ file: uploadedFile });

      setFile({
        url: file_url,
        name: uploadedFile.name,
        size: uploadedFile.size
      });

      setIsParsingFile(true);

      const parseResponse = await parseUploadedFile({
        file_url: file_url,
        file_name: uploadedFile.name
      });

      if (parseResponse.data.success) {
        const { headers, rows, auto_mapping, preview_data } = parseResponse.data.data;

        console.log('[ContactImportModal] ✅ Parse response:', {
          headers_count: headers?.length,
          rows_count: rows?.length,
          preview_count: preview_data?.length,
          first_row_sample: rows?.[0],
          headers_sample: headers?.slice(0, 5)
        });

        setHeaders(headers);
        setAllData(rows);
        setPreviewData(preview_data);
        setMapping(auto_mapping);
        setFileUrl(file_url);

        console.log(`Arquivo processado: ${headers.length} colunas, ${rows.length} linhas`);
      } else {
        throw new Error(parseResponse.data.error || 'Erro ao processar arquivo');
      }

    } catch (error) {
      console.error("Error processing file:", error);
      setErrors([error.message || "Erro ao processar arquivo"]);
      setFile(null);
    } finally {
      setIsUploading(false);
      setIsParsingFile(false);
    }
  };

  const processPastedData = () => {
    if (!pastedData.trim()) {
      setErrors(["Por favor, cole os dados na área de texto"]);
      return;
    }

    try {
      const lines = pastedData.trim().split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setErrors(["São necessárias pelo menos 2 linhas (cabeçalho + 1 linha de dados)"]);
        return;
      }

      let separator = '\t';
      const firstLine = lines[0];
      if (firstLine.includes(',') && firstLine.split(',').length > firstLine.split('\t').length) {
        separator = ',';
      } else if (firstLine.includes(';') && firstLine.split(';').length > firstLine.split('\t').length) {
        separator = ';';
      }

      const detectedHeaders = lines[0].split(separator).map(h => h.trim());
      const dataRows = lines.slice(1).map(line => {
        const values = line.split(separator).map(v => v.trim());
        const rowData = {};
        detectedHeaders.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });
        return rowData;
      });

      setHeaders(detectedHeaders);
      setAllData(dataRows);
      setPreviewData(dataRows.slice(0, 10));

      const autoMapping = {};
      detectedHeaders.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('nome') && !lowerHeader.includes('empresa')) {
          autoMapping[header] = 'first_name';
        } else if (lowerHeader.includes('email')) {
          autoMapping[header] = 'email';
        } else if (lowerHeader.includes('telefone')) {
          autoMapping[header] = 'phone';
        } else if (lowerHeader.includes('empresa')) {
          autoMapping[header] = 'company_name';
        } else {
          autoMapping[header] = 'skip';
        }
      });
      setMapping(autoMapping);

      console.log(`Dados colados processados: ${detectedHeaders.length} colunas, ${dataRows.length} linhas`);
      setErrors([]);

    } catch (error) {
      console.error("Error processing pasted data:", error);
      setErrors(["Erro ao processar dados colados. Verifique o formato."]);
    }
  };

  const canAdvanceToMapping = () => {
    return (
      importName.trim() &&
      importType &&
      (
        ((importType === 'csv' || importType === 'excel') && file && allData.length > 0) ||
        (importType === 'copy-paste' && previewData.length > 0)
      )
    );
  };

  const handleImport = async () => {
    const hasNameMapping = Object.values(mapping).includes('first_name');
    const hasPhoneMapping = Object.values(mapping).includes('phone');

    if (!hasNameMapping) {
      setErrors(["É obrigatório mapear pelo menos o campo 'Nome'"]);
      return;
    }

    if (!hasPhoneMapping) {
      setErrors(["É obrigatório mapear pelo menos o campo 'Telefone Principal'"]);
      return;
    }

    setErrors([]);

    console.log('[ContactImportModal] 🔄 Starting handleImport...');
    console.log('[ContactImportModal] allData length:', allData?.length);
    console.log('[ContactImportModal] allData sample:', allData?.[0]);
    console.log('[ContactImportModal] mapping:', mapping);

    const processedContacts = allData.map((row, index) => {
      const contact = {};

      Object.entries(mapping).forEach(([header, field]) => {
        if (field && field !== 'skip') {
          const value = row[header];
          if (value !== null && value !== undefined && String(value).trim() !== '') {
            contact[field] = String(value).trim();
          }
        }
      });

      if (!contact.first_name) {
        contact.first_name = `Contato ${index + 1}`;
      }

      if (!contact.phone) {
        contact.phone = '5511999999999';
      }

      if (contact.last_name) contact.last_name = String(contact.last_name);
      if (contact.email) contact.email = String(contact.email);
      if (contact.phone) contact.phone = String(contact.phone);

      if (contact.value) {
        const numValue = parseFloat(String(contact.value).replace(/[^\d.-]/g, ''));
        contact.value = !isNaN(numValue) ? numValue : null;
      }

      if (contact.tags && typeof contact.tags === 'string') {
        contact.tags = contact.tags.split(/[,;]/).map(tag => tag.trim()).filter(tag => tag);
      }

      if (!contact.status) {
        contact.status = 'lead';
      }

      return contact;
    });

    console.log('[ContactImportModal] ✅ Processed contacts:', processedContacts.length);
    console.log('[ContactImportModal] First processed contact sample:', processedContacts[0]);

    setTransformedContacts(processedContacts);
    setStep(4);
  };

  const handleContactsUpdate = (updatedContacts) => {
    setTransformedContacts(updatedContacts);
  };

  // ✅ Nova função separada para chamar o backend
  const callImportBackend = async (payload) => {
    console.log('[ContactImportModal] 📡 Iniciando chamada ao backend (callImportBackend)...');
    console.log('[ContactImportModal] 📦 Payload size:', JSON.stringify(payload).length, 'bytes');

    try {
      const response = await importContactsAsync(payload);

      console.log('[ContactImportModal] ✅ Resposta do backend recebida:', {
        status: response.status,
        success: response.data?.success,
        message: response.data?.message,
        data: response.data?.data
      });

      return response;
    } catch (error) {
      console.error('[ContactImportModal] ❌ Erro na chamada ao backend:', error);
      if (error.response) {
        console.error('[ContactImportModal] Detalhes do erro:', error.response.data);
      }
      throw error;
    }
  };

  const handleStartImport = async (reviewData) => {
    setIsProcessing('preparing'); // Set loading state with status
    setErrors([]);

    try {
      const processGlobalTags = (tags) => {
        if (!Array.isArray(tags)) return [];
        return tags.map(tag => {
          if (typeof tag === 'string') return tag;
          if (tag && typeof tag === 'object') {
            return tag.name || tag.label || String(tag.id || tag);
          }
          return String(tag);
        });
      };

      const processGlobalCampaigns = (campaigns) => {
        if (!Array.isArray(campaigns)) return [];
        return campaigns.map(campaign => {
          if (typeof campaign === 'string') return campaign;
          if (campaign && typeof campaign === 'object') {
            return campaign.id || String(campaign);
          }
          return String(campaign);
        });
      };

      const contactsToImport = reviewData.finalContacts || reviewData.contactsData || [];

      console.log('[ContactImportModal] 📊 Contacts to import:', contactsToImport.length);

      if (!Array.isArray(contactsToImport) || contactsToImport.length === 0) {
        throw new Error('Nenhum contato válido encontrado para importação');
      }

      // 1. Criar registro de importação no banco de dados (para persistência e polling)
      const currentUser = await base44.auth.me();
      let importId = null;
      
      try {
        const importRecord = await base44.entities.Import.create({
          company_id: companyId || currentUser.company_id,
          user_id: currentUser.id,
          name: importName || `Importação ${new Date().toLocaleDateString('pt-BR')}`,
          type: 'customers', 
          status: 'processing',
          file_url: fileUrl || 'manual-entry', 
          total_records: contactsToImport.length,
          processed_records: 0,
          successful_records: 0,
          failed_records: 0,
          started_date: new Date().toISOString()
        });
        importId = importRecord.id;
        console.log(`[ContactImportModal] ✅ Registro de importação criado: ${importId}`);
      } catch (err) {
        console.error('[ContactImportModal] ⚠️ Erro ao criar registro de importação:', err);
        // Prosseguir mesmo se falhar a criação do registro, para não bloquear o usuário
      }

      // 2. INICIAR progresso no localStorage (com ID)
      const initialProgress = {
        isProcessing: true,
        importId: importId, // ID para polling
        total: contactsToImport.length,
        processed: 0,
        successful: 0,
        failed: 0,
        duplicates: 0,
        updated: 0,
        noWhatsApp: 0,
        status: 'starting'
      };

      localStorage.setItem('importProgress', JSON.stringify(initialProgress));
      window.dispatchEvent(new CustomEvent('importProgressUpdate', { detail: initialProgress }));

      onClose();

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openImportProgressModal'));
      }, 300);

      const payload = {
        contactsData: contactsToImport,
        importName: importName || `Importação ${new Date().toLocaleDateString('pt-BR')}`,
        globalTags: processGlobalTags(reviewData.globalTags || []),
        globalCampaigns: processGlobalCampaigns(reviewData.globalCampaigns || []),
        individualAssignments: reviewData.individualAssignments || {},
        importId: importId // Passar ID para o backend
      };

      // ✅ Usando a nova função separada
      const response = await callImportBackend(payload);

      if (response.data && response.data.success) {
        onSuccess({
          success: true,
          data: response.data,
          message: response.data.message
        });
      } else {
        // Erro de negócio (sucesso=false)
        throw new Error(response.data?.error || 'Erro reportado pelo servidor durante a importação');
      }

    } catch (error) {
      console.error('[ContactImportModal] 💥 Erro fatal no processo:', error);

      localStorage.removeItem('importProgress');
      window.dispatchEvent(new CustomEvent('importProgressUpdate', {
        detail: {
          isProcessing: false,
          total: 0,
          processed: 0,
          successful: 0,
          failed: 0,
          status: 'failed'
        }
      }));

      setErrors([error.message || 'Erro ao processar importação']);
    } finally {
      setIsProcessing(false);
    }
  };

  const FieldSelector = ({ header, currentMapping, onMappingChange, example }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    const availableFieldsWithoutSkip = availableFields.filter(f => f.value !== 'skip');

    const filteredFields = availableFieldsWithoutSkip.filter(field =>
      field.label.toLowerCase().includes(localSearch.toLowerCase()) ||
      field.value.toLowerCase().includes(localSearch.toLowerCase())
    );

    const selectedField = availableFields.find(f => f.value === currentMapping);
    const isRequiredField = (value) => ['first_name', 'phone'].includes(value);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
          setLocalSearch('');
        }
      };

      if (isOpen) {
        // Adicionar um pequeno delay antes de adicionar o listener
        setTimeout(() => {
          document.addEventListener('mousedown', handleClickOutside);
        }, 100);
        
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    const handleSelect = (value, e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      onMappingChange(value);
      setIsOpen(false);
      setLocalSearch('');
    };

    return (
      <div className="border border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-colors">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h4 className="font-semibold text-gray-900 text-sm">{header}</h4>
          </div>
          {example && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <span className="text-gray-500">Exemplo:</span>{' '}
              <span className="font-medium text-gray-700">
                {example || 'Vazio'}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-center mb-4">
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <Label className="text-sm font-medium text-gray-700">
              Mapear para:
              {isRequiredField(currentMapping) && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className={`w-full flex items-center justify-between gap-2 p-3 rounded-xl border text-sm transition-colors h-11 ${
                currentMapping === 'skip'
                  ? 'text-gray-400 bg-gray-50 border-gray-200'
                  : isRequiredField(currentMapping)
                    ? 'border-green-300 bg-green-50 text-green-800'
                    : 'bg-white text-gray-900 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {currentMapping === 'skip' ? (
                  <>
                    <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="truncate">Não mapear este campo</span>
                  </>
                ) : selectedField ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="truncate">{selectedField.label}</span>
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate text-gray-400">Selecionar campo...</span>
                  </>
                )}
              </div>
              <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-hidden">
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="Buscar campo..."
                      value={localSearch}
                      onChange={(e) => setLocalSearch(e.target.value)}
                      className="pl-9 h-9 border-gray-200 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {filteredFields.map((field) => (
                    <button
                      key={field.value}
                      type="button"
                      onClick={(e) => handleSelect(field.value, e)}
                      onMouseDown={(e) => e.preventDefault()}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left ${
                        currentMapping === field.value ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isRequiredField(field.value) ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      <span className="truncate">{field.label}</span>
                      {currentMapping === field.value && (
                        <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}

                  {filteredFields.length === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Nenhum campo encontrado para "{localSearch}"
                    </div>
                  )}

                  <div className="p-2 border-t border-gray-100 mt-2">
                    <button
                      type="button"
                      onClick={(e) => handleSelect('skip', e)}
                      onMouseDown={(e) => e.preventDefault()}
                      className={`w-full flex items-center gap-2 px-2 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors text-left ${
                        currentMapping === 'skip' ? 'bg-red-50 text-red-800' : 'text-gray-700'
                      }`}
                    >
                      <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="truncate">❌ Não mapear este campo</span>
                      {currentMapping === 'skip' && (
                        <CheckCircle2 className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-2">
            {currentMapping === 'skip' ? (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="w-3 h-3" />
                <span>Campo será ignorado na importação</span>
              </div>
            ) : isRequiredField(currentMapping) ? (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>Campo obrigatório mapeado</span>
              </div>
            ) : selectedField ? (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Info className="w-3 h-3" />
                <span>Campo opcional mapeado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Settings className="w-3 h-3" />
                <span>Clique para selecionar um campo</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[1000px] max-w-[95vw] max-h-[90vh] p-0 bg-white rounded-[2.5rem] border-gray-200 overflow-hidden flex flex-col [&>button]:hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Importar Contatos</h2>
                <p className="text-sm text-gray-600">
                  Passo {step === 4 ? 3 : step === 2 ? 2 : 1} de 3
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isProcessing}
              className="h-8 w-8 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center mb-6 px-6 pt-6 flex-shrink-0">
            <div className="flex items-center">
              {[
                { step: 1, label: "Upload", icon: Upload },
                { step: 2, label: "Mapeamento", icon: Settings },
                { step: 4, label: "Revisão", icon: Eye },
                { step: 5, label: "Importação", icon: CheckCircle2 }
              ].map(({ step: stepNum, label, icon: Icon }, index) => (
                <div key={stepNum} className="flex items-start">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                      step >= stepNum 
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white scale-110 shadow-lg' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {step > stepNum ? (
                        <CheckCircle2 className="w-6 h-6 animate-pulse" />
                      ) : (
                        <Icon className={`w-6 h-6 ${step === stepNum ? 'animate-pulse' : ''}`} />
                      )}
                      {step === stepNum && (
                        <div className="absolute inset-0 rounded-2xl bg-blue-600 animate-ping opacity-20"></div>
                      )}
                    </div>
                    <span className={`text-xs font-semibold transition-colors duration-300 ${
                      step >= stepNum ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`w-16 h-1 mx-3 rounded-full transition-all duration-500 mt-6 ${
                      step > stepNum ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive" className="mb-6 mx-6 rounded-2xl flex-shrink-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="p-6 space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="import_name" className="text-sm font-medium">Nome da Importação *</Label>
                  <Input
                    id="import_name"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    placeholder="Ex: Clientes Janeiro 2024"
                    className="rounded-xl border-gray-200 mt-2"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-4 block">Tipo de Importação</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg rounded-2xl ${
                        importType === 'copy-paste'
                          ? 'ring-2 ring-green-500 bg-green-50 border-green-200'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => setImportType('copy-paste')}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Copy className="w-8 h-8 text-orange-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Colar Texto</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Cole tabela do Excel ou Google Sheets
                        </p>
                        <div className="text-xs text-gray-500 bg-gray-100 rounded-lg p-2">
                          Interface para colar dados
                        </div>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg rounded-2xl ${
                        importType === 'csv'
                          ? 'ring-2 ring-green-500 bg-green-50 border-green-200'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => setImportType('csv')}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Arquivo CSV</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Faça upload de arquivo CSV
                        </p>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadTemplate('csv');
                          }}
                          variant="outline"
                          size="sm"
                          className="text-xs rounded-lg"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Baixar Modelo CSV
                        </Button>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg rounded-2xl ${
                        importType === 'excel'
                          ? 'ring-2 ring-green-500 bg-green-50 border-green-200'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => setImportType('excel')}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <FileSpreadsheet className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Arquivo Excel</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Envie um arquivo .xlsx
                        </p>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadTemplate('excel');
                          }}
                          variant="outline"
                          size="sm"
                          className="text-xs rounded-lg"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Baixar Modelo XLSX
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Em Breve
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="opacity-60 cursor-not-allowed rounded-2xl border-gray-200">
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <MessageSquare className="w-6 h-6 text-green-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-1">WhatsApp</h3>
                          <p className="text-xs text-gray-500">Importar contatos do WhatsApp</p>
                          <div className="mt-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Em breve</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="opacity-60 cursor-not-allowed rounded-2xl border-gray-200">
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Mail className="w-6 h-6 text-blue-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-1">Email</h3>
                          <p className="text-xs text-gray-500">Importar do Gmail/Outlook</p>
                          <div className="mt-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Em breve</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="opacity-60 cursor-not-allowed rounded-2xl border-gray-200">
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Database className="w-6 h-6 text-purple-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-1">Banco de Dados</h3>
                          <p className="text-xs text-gray-500">Conectar base externa</p>
                          <div className="mt-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Em breve</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="opacity-60 cursor-not-allowed rounded-2xl border-gray-200">
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Zap className="w-6 h-6 text-indigo-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-1">API</h3>
                          <p className="text-xs text-gray-500">Integração via API</p>
                          <div className="mt-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Em breve</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                {(importType === 'csv' || importType === 'excel') && (
                  <div>
                    <Label className="text-sm font-medium">Upload do Arquivo</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center mt-2 relative">
                      {isUploading || isParsingFile ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                          <p className="text-sm text-gray-600">
                            {isUploading ? 'Enviando arquivo...' : 'Processando arquivo...'}
                          </p>
                        </div>
                      ) : file ? (
                        <div className="flex flex-col items-center gap-3">
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="font-medium text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-500">{Math.round(file.size / 1024)} KB</p>
                            <p className="text-sm text-green-600 mt-1">
                              {allData.length} linhas de dados detectadas
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 mb-2">
                            Clique para selecionar ou arraste o arquivo aqui
                          </p>
                          <p className="text-sm text-gray-500">
                            {importType === 'excel' ? 'Formatos suportados: .xlsx, .xls' : 'Formato suportado: .csv'}
                          </p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept={importType === 'excel' ? '.xlsx,.xls' : '.csv'}
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading || isParsingFile}
                      />
                    </div>
                  </div>
                )}

                {importType === 'copy-paste' && (
                  <div>
                    <Label htmlFor="paste_data" className="text-sm font-medium">Cole seus dados aqui</Label>
                    <Textarea
                      id="paste_data"
                      value={pastedData}
                      onChange={(e) => setPastedData(e.target.value)}
                      placeholder="Cole aqui os dados copiados do Excel ou Google Sheets..."
                      className="rounded-xl border-gray-200 mt-2 min-h-[200px]"
                    />
                    {pastedData && (
                      <Button
                        onClick={processPastedData}
                        className="mt-3 bg-green-600 hover:bg-green-700 text-white rounded-xl"
                      >
                        Processar Dados Colados
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <Card className="rounded-2xl border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      Prévia dos Dados ({allData.length} registros total)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            {headers.map((header, index) => (
                              <th key={index} className="text-left p-3 bg-gray-50 font-medium text-sm">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.slice(0, 5).map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-gray-100">
                              {headers.map((header, cellIndex) => (
                                <td key={cellIndex} className="p-3 text-sm text-gray-600 max-w-32 truncate">
                                  {row[header] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewData.length > 5 && (
                      <p className="text-sm text-gray-500 mt-3">
                        Mostrando apenas 5 de {allData.length} registros
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-green-600" />
                      Mapeamento de Campos
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Conecte os campos do seu arquivo aos campos do sistema
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {headers.map((header, index) => (
                        <FieldSelector
                          key={index}
                          header={header}
                          currentMapping={mapping[header] || 'skip'}
                          onMappingChange={(value) => setMapping(prev => ({
                            ...prev,
                            [header]: value
                          }))}
                          example={previewData[0]?.[header]}
                        />
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Resumo do Mapeamento
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="text-sm text-green-600 font-medium">Campos Obrigatórios</div>
                          <div className="text-2xl font-bold text-green-800 mt-1">
                            {Object.values(mapping).filter(v => ['first_name', 'phone'].includes(v)).length}/2
                          </div>
                          <div className="text-xs text-green-600 mt-1">Nome e Telefone são obrigatórios</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <div className="text-sm text-blue-600 font-medium">Campos Mapeados</div>
                          <div className="text-2xl font-bold text-blue-800 mt-1">
                            {Object.values(mapping).filter(v => v && v !== 'skip').length}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">De {headers.length} disponíveis</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <div className="text-sm text-gray-600 font-medium">Campos Ignorados</div>
                          <div className="text-2xl font-bold text-gray-800 mt-1">
                            {Object.values(mapping).filter(v => v === 'skip' || !v).length}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">Não serão importados</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {step === 4 && (
              <ContactReviewStep
                contacts={transformedContacts}
                onPrevious={() => setStep(2)}
                onConfirm={handleStartImport}
                importName={importName}
                isSubmitting={isProcessing}
              />
            )}
          </div>
        </div>

        <div className="flex justify-between items-center gap-3 p-6 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          {step === 1 && (
            <div className="flex justify-between w-full">
              <Button
                onClick={handleCancelImport}
                variant="outline"
                className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                disabled={isCancelling}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={() => setStep(2)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                disabled={!canAdvanceToMapping()}
              >
                Avançar para Mapeamento
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex justify-between w-full">
              <div className="flex gap-2">
                <Button
                  onClick={handleCancelImport}
                  variant="outline"
                  className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  disabled={isCancelling}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </div>
              <Button
                onClick={handleImport}
                disabled={Object.values(mapping).filter(v => ['first_name', 'phone'].includes(v)).length < 2 || allData.length === 0}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                <Eye className="w-4 h-4 mr-2" />
                Revisar Contatos
              </Button>
            </div>
          )}

          {step === 5 && (
            <div className="flex justify-end w-full">
              <Button onClick={onClose} variant="secondary" className="rounded-xl">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
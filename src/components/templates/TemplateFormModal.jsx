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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  X,
  Save,
  AlertCircle,
  MessageSquare,
  Send,
  Zap,
  Eye,
  Gift,
  DollarSign,
  Heart,
  Megaphone,
  Star,
  Clock,
  Target,
  Calendar,
  TrendingUp,
  Bold,
  Italic,
  Underline,
  Smile,
  Loader2,
  Image as ImageIcon,
  Video,
  Music,
  File,
  Mic,
  Upload,
  Trash2,
  Play,
  Pause,
  Sparkles,
  RefreshCw,
  Check,
  XCircle
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { base44 } from "@/api/base44Client";

// Limites de tamanho (em MB)
const FILE_SIZE_LIMITS = {
  image: 5,
  video: 50, // Changed from 16 to 50
  audio: 16,
  file: 100
};

// Componente de seletor de emojis simples
const EmojiPicker = ({ onEmojiSelect }) => {
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
    '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
    '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
    '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
    '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸',
    '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲',
    '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
    '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
    '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻',
    '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽',
    '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌',
    '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕',
    '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌',
    '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿',
    '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴',
    '👀', '👁️', '👅', '👄', '💋', '🩸', '❤️', '🧡', '💛', '💚',
    '💙', '💜', '🤎', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓',
    '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
    '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊'
  ];

  return (
    <div className="grid grid-cols-10 gap-1 p-2 max-h-48 overflow-y-auto">
      {emojis.map((emoji, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onEmojiSelect(emoji)}
          className="p-1 hover:bg-gray-100 rounded text-lg"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

// Componente de gravação de áudio
const AudioRecorder = ({ onRecordingComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        onRecordingComplete(file);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
      onCancel(); // Cancel recording flow if error
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 rounded-xl">
      <div className="text-4xl font-mono text-purple-600">
        {formatTime(recordingTime)}
      </div>
      
      <div className="flex gap-2">
        {!isRecording ? (
          <Button
            type="button"
            onClick={startRecording}
            className="bg-red-600 hover:bg-red-700 rounded-xl"
          >
            <Mic className="w-4 h-4 mr-2" />
            Iniciar Gravação
          </Button>
        ) : (
          <Button
            type="button"
            onClick={stopRecording}
            className="bg-gray-600 hover:bg-gray-700 rounded-xl"
          >
            <Pause className="w-4 h-4 mr-2" />
            Parar Gravação
          </Button>
        )}
        
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-xl"
        >
          Cancelar
        </Button>
      </div>
      
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
          Gravando...
        </div>
      )}
    </div>
  );
};

// Componente do editor de texto com formatação WhatsApp
const WhatsAppEditor = React.forwardRef(({ value, onChange, placeholder, maxLength }, ref) => {
  const insertFormatting = (startChar, endChar) => {
    const textarea = ref.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText;
    if (selectedText) {
      newText = value.substring(0, start) + startChar + selectedText + endChar + value.substring(end);
    } else {
      newText = value.substring(0, start) + startChar + endChar + value.substring(end);
    }
    
    if (maxLength && newText.length > maxLength) {
      return;
    }
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = selectedText 
        ? start + startChar.length + selectedText.length + endChar.length 
        : start + startChar.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const insertEmoji = (emoji) => {
    const textarea = ref.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = value.substring(0, start) + emoji + value.substring(end);
    
    if (maxLength && newText.length > maxLength) {
      return;
    }
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + emoji.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleTextChange = (e) => {
    const newValue = e.target.value;
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting('*', '*')}
          className="h-8 w-8 p-0"
          title="Negrito (*texto*)"
        >
          <Bold className="w-4 h-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting('_', '_')}
          className="h-8 w-8 p-0"
          title="Itálico (_texto_)"
        >
          <Italic className="w-4 h-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting('~', '~')}
          className="h-8 w-8 p-0"
          title="Riscado (~texto~)"
        >
          <Underline className="w-4 h-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting('```', '```')}
          className="h-8 px-2 text-xs"
          title="Código (```texto```)"
        >
          CODE
        </Button>

        <div className="h-4 w-px bg-gray-300 mx-1" />
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Inserir emoji"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <EmojiPicker onEmojiSelect={insertEmoji} />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Textarea
          ref={ref}
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder}
          className="rounded-xl border-gray-200 min-h-[200px] font-mono text-sm"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace' }}
          maxLength={maxLength}
        />
        {maxLength && (
          <div className="text-right text-xs text-gray-500 mt-1 pr-1">
            {value.length}/{maxLength}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Dicas de formatação WhatsApp:</strong></p>
        <p>• *negrito* • _itálico_ • ~riscado~ • ```código``` • Use emojis para expressar emoções 😊</p>
      </div>
    </div>
  );
});

export default function TemplateFormModal({ 
  open, 
  onClose, 
  template, 
  categories = [], 
  types = [], 
  onSubmit,
  currentUser = null
}) {
  const editorRef = React.useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    type: "whatsapp",
    subject: "",
    content: "",
    variables: [],
    is_active: true,
    attachments: [],
    preview_data: {
      customer: {
        first_name: "João",
        last_name: "Silva",
        email: "joao@empresa.com",
        phone: "+55 11 99999-9999",
        birth_date: "1990-05-15",
        company_name: "Empresa Exemplo",
        document_number: "123.456.789-10",
        document_type: "CPF",
        gender: "Masculino",
        responsible_name: "Maria Santos",
        custom_position: "Especialista em Vendas",
        address_cep: "01000-000",
        address_street: "Rua Exemplo",
        address_number: "123",
        address_complement: "Apto 45",
        address_neighborhood: "Centro",
        address_city: "São Paulo",
        address_state: "SP",
        address_country: "Brasil",
        status: "Ativo",
        source: "Website",
        value: "R$ 1.500,00",
        last_contact_date: "2023-10-26",
        linkedin: "linkedin.com/in/joao-silva",
        twitter: "@joaosilva",
        facebook: "facebook.com/joao.silva",
        instagram: "@joao.silva_oficial",
        website: "www.empresaexemplo.com.br",
        bank_name: "Banco Exemplo",
        bank_code: "001",
        agency: "1234",
        account: "56789-0",
        account_digit: "X",
        pix_key_type: "CPF",
        pix_key: "123.456.789-10",
        import_name: "Importação Q3 2023",
        import_type: "Leads",
        notes_1: "Cliente preferencial",
        notes_2: "Prefere contato pela manhã",
        notes_3: "Aniversário em maio",
        notes_all: "Cliente preferencial; Prefere contato pela manhã; Aniversário em maio",
        notes_latest: "Aniversário em maio"
      }
    },
    scheduling: {
      auto_send: false,
      trigger_event: "",
      trigger_days_before: 0,
      trigger_time: ""
    }
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [previewType, setPreviewType] = useState('formatted');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  
  // Estados para Modelo Inteligente
  const [isSmartTemplate, setIsSmartTemplate] = useState(false);
  const [generationStyle, setGenerationStyle] = useState('based_on_current');
  const [generatedVariations, setGeneratedVariations] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState([]);
  const [variationsCount, setVariationsCount] = useState(5);

  // TODAS as variáveis disponíveis baseadas na entidade Contact
  const availableVariables = [
    // Informações básicas
    { key: "{{first_name}}", description: "Nome do contato", category: "Básico" },
    { key: "{{last_name}}", description: "Sobrenome do contato", category: "Básico" },
    { key: "{{full_name}}", description: "Nome completo do contato", category: "Básico" },
    { key: "{{document_number}}", description: "CPF/CNPJ do contato", category: "Básico" },
    { key: "{{document_type}}", description: "Tipo de documento (CPF ou CNPJ)", category: "Básico" },
    { key: "{{gender}}", description: "Gênero do contato", category: "Básico" },
    { key: "{{responsible_name}}", description: "Nome do responsável", category: "Básico" },
    
    // Contato
    { key: "{{email}}", description: "Email principal", category: "Contato" },
    { key: "{{phone}}", description: "Telefone principal", category: "Contato" },
    { key: "{{birth_date}}", description: "Data de nascimento", category: "Contato" },
    
    // Empresa
    { key: "{{company_name}}", description: "Nome da empresa do contato", category: "Empresa" },
    { key: "{{position}}", description: "Cargo do contato", category: "Empresa" },
    { key: "{{custom_position}}", description: "Cargo personalizado", category: "Empresa" },
    
    // Endereço
    { key: "{{address_cep}}", description: "CEP do endereço principal", category: "Endereço" },
    { key: "{{address_street}}", description: "Rua do endereço", category: "Endereço" },
    { key: "{{address_number}}", description: "Número do endereço", category: "Endereço" },
    { key: "{{address_complement}}", description: "Complemento do endereço", category: "Endereço" },
    { key: "{{address_neighborhood}}", description: "Bairro", category: "Endereço" },
    { key: "{{address_city}}", description: "Cidade", category: "Endereço" },
    { key: "{{address_state}}", description: "Estado", category: "Endereço" },
    { key: "{{address_country}}", description: "País", category: "Endereço" },
    
    // Status e origem
    { key: "{{status}}", description: "Status do contato", category: "Status" },
    { key: "{{source}}", description: "Origem do contato", category: "Status" },
    { key: "{{value}}", description: "Valor estimado do contato", category: "Status" },
    { key: "{{last_contact_date}}", description: "Data do último contato", category: "Status" },
    
    // Observações
    { key: "{{notes.1}}", description: "Primeira observação", category: "Observações" },
    { key: "{{notes.2}}", description: "Segunda observação", category: "Observações" },
    { key: "{{notes.3}}", description: "Terceira observação", category: "Observações" },
    { key: "{{notes.4}}", description: "Quarta observação", category: "Observações" },
    { key: "{{notes.5}}", description: "Quinta observação", category: "Observações" },
    { key: "{{notes.all}}", description: "Todas as observações", category: "Observações" },
    { key: "{{notes.latest}}", description: "Observação mais recente", category: "Observações" },
    
    // Redes sociais
    { key: "{{linkedin}}", description: "LinkedIn", category: "Redes Sociais" },
    { key: "{{twitter}}", description: "Twitter", category: "Redes Sociais" },
    { key: "{{facebook}}", description: "Facebook", category: "Redes Sociais" },
    { key: "{{instagram}}", description: "Instagram", category: "Redes Sociais" },
    { key: "{{website}}", description: "Website", category: "Redes Sociais" },
    
    // Dados bancários
    { key: "{{bank_name}}", description: "Nome do banco", category: "Dados Bancários" },
    { key: "{{bank_code}}", description: "Código do banco", category: "Dados Bancários" },
    { key: "{{agency}}", description: "Agência bancária", category: "Dados Bancários" },
    { key: "{{account}}", description: "Número da conta", category: "Dados Bancários" },
    { key: "{{account_digit}}", description: "Dígito da conta", category: "Dados Bancários" },
    { key: "{{pix_key_type}}", description: "Tipo da chave PIX", category: "Dados Bancários" },
    { key: "{{pix_key}}", description: "Chave PIX", category: "Dados Bancários" },
    
    // Informações de importação
    { key: "{{import_name}}", description: "Nome da importação", category: "Importação" },
    { key: "{{import_type}}", description: "Tipo de importação", category: "Importação" },
    
    // Datas do sistema
    { key: "{{current_date}}", description: "Data atual", category: "Sistema" },
    { key: "{{current_time}}", description: "Hora atual", category: "Sistema" },
    { key: "{{current_day}}", description: "Dia atual", category: "Sistema" },
    { key: "{{current_month}}", description: "Mês atual", category: "Sistema" },
    { key: "{{current_year}}", description: "Ano atual", category: "Sistema" },
  ];

  useEffect(() => {
    const defaultPreviewData = {
      customer: {
        first_name: "João",
        last_name: "Silva",
        email: "joao@empresa.com",
        phone: "+55 11 99999-9999",
        birth_date: "1990-05-15",
        company_name: "Empresa Exemplo",
        document_number: "123.456.789-10",
        document_type: "CPF",
        gender: "Masculino",
        responsible_name: "Maria Santos",
        custom_position: "Especialista em Vendas",
        address_cep: "01000-000",
        address_street: "Rua Exemplo",
        address_number: "123",
        address_complement: "Apto 45",
        address_neighborhood: "Centro",
        address_city: "São Paulo",
        address_state: "SP",
        address_country: "Brasil",
        status: "Ativo",
        source: "Website",
        value: "R$ 1.500,00",
        last_contact_date: "2023-10-26",
        linkedin: "linkedin.com/in/joao-silva",
        twitter: "@joaosilva",
        facebook: "facebook.com/joao.silva",
        instagram: "@joao.silva_oficial",
        website: "www.empresaexemplo.com.br",
        bank_name: "Banco Exemplo",
        bank_code: "001",
        agency: "1234",
        account: "56789-0",
        account_digit: "X",
        pix_key_type: "CPF",
        pix_key: "123.456.789-10",
        import_name: "Importação Q3 2023",
        import_type: "Leads",
        notes_1: "Cliente preferencial",
        notes_2: "Prefere contato pela manhã",
        notes_3: "Aniversário em maio",
        notes_all: "Cliente preferencial; Prefere contato pela manhã; Aniversário em maio",
        notes_latest: "Aniversário em maio"
      }
    };

    if (open) {
      if (template) {
        setFormData({
          name: template.name || "",
          category: template.category || "",
          type: template.type || "whatsapp",
          subject: template.subject || "",
          content: template.content || "",
          variables: template.variables || [],
          is_active: template.is_active !== undefined ? template.is_active : true,
          attachments: template.attachments || [],
          preview_data: {
            customer: {
              ...defaultPreviewData.customer,
              ...template.preview_data?.customer
            }
          },
          scheduling: template.scheduling || {
            auto_send: false,
            trigger_event: "",
            trigger_days_before: 0,
            trigger_time: ""
          }
        });
        
        setIsSmartTemplate(template.is_smart_template || false);
        setGenerationStyle(template.generation_style || 'based_on_current');
        const variations = template.content_variations || [];
        setGeneratedVariations(variations);
        setSelectedVariations(variations);
        setVariationsCount(variations.length > 0 ? variations.length : 5);
      } else {
        setFormData({
          name: "",
          category: "",
          type: "whatsapp",
          subject: "",
          content: "",
          variables: [],
          is_active: true,
          attachments: [],
          preview_data: defaultPreviewData,
          scheduling: {
            auto_send: false,
            trigger_event: "",
            trigger_days_before: 0,
            trigger_time: ""
          }
        });
        
        setIsSmartTemplate(false);
        setGenerationStyle('based_on_current');
        setGeneratedVariations([]);
        setSelectedVariations([]);
        setVariationsCount(5);
      }
      
      setErrors({});
      setIsSubmitting(false);
      setShowAudioRecorder(false);
      setShowAttachmentPreview(false);
    }
  }, [open, template]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    if (field === 'content') {
      const detectedVars = [];
      availableVariables.forEach(variable => {
        if (value.includes(variable.key)) {
          detectedVars.push(variable.key);
        }
      });
      setFormData(prev => ({ ...prev, variables: [...new Set(detectedVars)] }));
    }
  };

  const handleFileUpload = async (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    // Verificar se já existe um anexo
    if (formData.attachments.length > 0) {
      const confirmed = window.confirm('Você já possui um anexo. Deseja substituí-lo?');
      if (!confirmed) {
        event.target.value = ''; // Limpar o input
        return;
      }
    }

    // Validar tamanho
    const maxSize = FILE_SIZE_LIMITS[fileType] * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`O arquivo excede o tamanho máximo de ${FILE_SIZE_LIMITS[fileType]}MB`);
      event.target.value = '';
      return;
    }

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const attachment = {
        type: fileType,
        url: file_url,
        filename: file.name,
        size: file.size,
        mimetype: file.type
      };

      // Substituir o anexo existente (sempre apenas 1)
      setFormData(prev => ({
        ...prev,
        attachments: [attachment]
      }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload do arquivo');
    } finally {
      setUploadingFile(false);
      event.target.value = ''; // Always clear the input after selection/upload attempt
    }
  };

  const handleAudioRecordingComplete = async (audioFile) => {
    // Verificar se já existe um anexo
    if (formData.attachments.length > 0) {
      const confirmed = window.confirm('Você já possui um anexo. Deseja substituí-lo?');
      if (!confirmed) {
        setShowAudioRecorder(false); // Cancel recording flow if user doesn't want to replace
        return;
      }
    }

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
      
      const attachment = {
        type: 'audio',
        url: file_url,
        filename: audioFile.name,
        size: audioFile.size,
        mimetype: audioFile.type
      };

      // Substituir o anexo existente (sempre apenas 1)
      setFormData(prev => ({
        ...prev,
        attachments: [attachment]
      }));
      
      setShowAudioRecorder(false);
    } catch (error) {
      console.error('Erro ao fazer upload do áudio:', error);
      alert('Erro ao fazer upload do áudio');
      setShowAudioRecorder(false); // Close recorder on error
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = () => { // Removed index as there's only one or zero
    setFormData(prev => ({
      ...prev,
      attachments: []
    }));
    setShowAttachmentPreview(false); // Reset attachment preview state
  };

  const getAttachmentIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'file': return <File className="w-4 h-4" />;
      default: return <File className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const renderAttachmentPreview = (attachment) => {
    if (!attachment) return null;

    switch (attachment.type) {
      case 'image':
        return (
          <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
            <img 
              src={attachment.url} 
              alt={attachment.filename}
              className="w-full h-auto max-h-[300px] object-contain bg-gray-50"
            />
          </div>
        );

      case 'video':
        return (
          <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 bg-black">
            <video 
              controls
              className="w-full max-h-[300px]"
              src={attachment.url}
            >
              Seu navegador não suporta a reprodução de vídeos.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="mt-3 p-4 rounded-xl border border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <audio 
              controls
              className="w-full"
              src={attachment.url}
            >
              Seu navegador não suporta a reprodução de áudio.
            </audio>
          </div>
        );

      case 'file':
        return (
          <div className="mt-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <File className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">Arquivo disponível para download</p>
                <p className="text-xs text-gray-500">Clique no botão abaixo para baixar e visualizar</p>
              </div>
              <a
                href={attachment.url}
                download={attachment.filename}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
              </a>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Nome do modelo é obrigatório";
    }
    
    if (!formData.category) {
      newErrors.category = "Categoria é obrigatória";
    }
    
    if (!formData.type) {
      newErrors.type = "Tipo de mensagem é obrigatório";
    }
    
    if (!formData.content.trim()) {
      newErrors.content = "Conteúdo do modelo é obrigatório";
    }

    if (formData.type === 'email' && !formData.subject.trim()) {
      newErrors.subject = "Assunto é obrigatório para emails";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const renderPreview = () => {
    let previewContent = formData.content;
    const previewData = formData.preview_data.customer;
    const currentDate = new Date();

    previewContent = previewContent
      .replace(/\{\{first_name\}\}/g, previewData.first_name || "João")
      .replace(/\{\{last_name\}\}/g, previewData.last_name || "Silva")
      .replace(/\{\{full_name\}\}/g, `${previewData.first_name || "João"} ${previewData.last_name || "Silva"}`)
      .replace(/\{\{email\}\}/g, previewData.email || "joao@empresa.com")
      .replace(/\{\{phone\}\}/g, previewData.phone || "+55 11 99999-9999")
      .replace(/\{\{company_name\}\}/g, previewData.company_name || "Empresa Exemplo")
      .replace(/\{\{birth_date\}\}/g, previewData.birth_date ? new Date(previewData.birth_date).toLocaleDateString('pt-BR') : "15/05/1990")
      .replace(/\{\{current_date\}\}/g, currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }))
      .replace(/\{\{current_time\}\}/g, currentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }))
      .replace(/\{\{current_day\}\}/g, currentDate.toLocaleDateString('pt-BR', { day: '2-digit' }))
      .replace(/\{\{current_month\}\}/g, currentDate.toLocaleDateString('pt-BR', { month: 'long' }))
      .replace(/\{\{current_year\}\}/g, currentDate.getFullYear().toString())
      .replace(/\{\{document_number\}\}/g, previewData.document_number || "123.456.789-10")
      .replace(/\{\{document_type\}\}/g, previewData.document_type || "CPF")
      .replace(/\{\{gender\}\}/g, previewData.gender || "Masculino")
      .replace(/\{\{position\}\}/g, previewData.position || "Gerente")
      .replace(/\{\{custom_position\}\}/g, previewData.custom_position || "Especialista em Vendas")
      .replace(/\{\{responsible_name\}\}/g, previewData.responsible_name || "Maria Santos")
      .replace(/\{\{address_cep\}\}/g, previewData.address_cep || "01000-000")
      .replace(/\{\{address_street\}\}/g, previewData.address_street || "Rua Exemplo")
      .replace(/\{\{address_number\}\}/g, previewData.address_number || "123")
      .replace(/\{\{address_complement\}\}/g, previewData.address_complement || "Apto 45")
      .replace(/\{\{address_neighborhood\}\}/g, previewData.address_neighborhood || "Centro")
      .replace(/\{\{address_city\}\}/g, previewData.address_city || "São Paulo")
      .replace(/\{\{address_state\}\}/g, previewData.address_state || "SP")
      .replace(/\{\{address_country\}\}/g, previewData.address_country || "Brasil")
      .replace(/\{\{status\}\}/g, previewData.status || "Ativo")
      .replace(/\{\{source\}\}/g, previewData.source || "Website")
      .replace(/\{\{value\}\}/g, previewData.value || "R$ 1.500,00")
      .replace(/\{\{last_contact_date\}\}/g, previewData.last_contact_date ? new Date(previewData.last_contact_date).toLocaleDateString('pt-BR') : "26/10/2023")
      .replace(/\{\{linkedin\}\}/g, previewData.linkedin || "linkedin.com/in/joao-silva")
      .replace(/\{\{twitter\}\}/g, previewData.twitter || "@joaosilva")
      .replace(/\{\{facebook\}\}/g, previewData.facebook || "facebook.com/joao.silva")
      .replace(/\{\{instagram\}\}/g, previewData.instagram || "@joao.silva_oficial")
      .replace(/\{\{website\}\}/g, previewData.website || "www.empresaexemplo.com.br")
      .replace(/\{\{bank_name\}\}/g, previewData.bank_name || "Banco Exemplo")
      .replace(/\{\{bank_code\}\}/g, previewData.bank_code || "001")
      .replace(/\{\{agency\}\}/g, previewData.agency || "1234")
      .replace(/\{\{account\}\}/g, previewData.account || "56789-0")
      .replace(/\{\{account_digit\}\}/g, previewData.account_digit || "X")
      .replace(/\{\{pix_key_type\}\}/g, previewData.pix_key_type || "CPF")
      .replace(/\{\{pix_key\}\}/g, previewData.pix_key || "123.456.789-10")
      .replace(/\{\{import_name\}\}/g, previewData.import_name || "Importação Q3 2023")
      .replace(/\{\{import_type\}\}/g, previewData.import_type || "Leads")
      .replace(/\{\{notes\.1\}\}/g, previewData.notes_1 || "Cliente preferencial")
      .replace(/\{\{notes\.2\}\}/g, previewData.notes_2 || "Prefere contato pela manhã")
      .replace(/\{\{notes\.3\}\}/g, previewData.notes_3 || "Aniversário em maio")
      .replace(/\{\{notes\.4\}\}/g, previewData.notes_4 || "")
      .replace(/\{\{notes\.5\}\}/g, previewData.notes_5 || "")
      .replace(/\{\{notes\.all\}\}/g, previewData.notes_all || "Cliente preferencial; Prefere contato pela manhã")
      .replace(/\{\{notes\.latest\}\}/g, previewData.notes_latest || "Aniversário em maio");

    if (previewType === 'formatted') {
      previewContent = previewContent
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/~(.*?)~/g, '<del>$1</del>')
        .replace(/```(.*?)```/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

      return <div dangerouslySetInnerHTML={{ __html: previewContent.replace(/\n/g, '<br>') }} />;
    }

    return <div className="whitespace-pre-wrap">{previewContent}</div>;
  };

  const handleGenerateVariations = async () => {
    if (!formData.content.trim()) {
      setErrors({ content: 'Escreva uma mensagem base primeiro' });
      return;
    }

    // Verificar se já atingiu o máximo
    if (generatedVariations.length >= 9) {
      setErrors({ submit: 'Você já atingiu o máximo de 9 variações' });
      return;
    }

    setIsGenerating(true);
    try {
      const styleDescriptions = {
        formal: 'Gere variações em tom formal e profissional',
        informal: 'Gere variações em tom casual e amigável',
        based_on_current: 'Mantenha o mesmo tom e estilo da mensagem original'
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em copywriting para WhatsApp. 
        
Mensagem original:
${formData.content}

Variáveis presentes: ${formData.variables.join(', ')}

Variações já existentes (NÃO REPITA ESTAS):
${generatedVariations.join('\n---\n')}

Instruções:
1. ${styleDescriptions[generationStyle]}
2. Gere EXATAMENTE ${variationsCount} variações NOVAS e DIFERENTES das existentes
3. TODAS as variações DEVEM conter EXATAMENTE as mesmas variáveis: ${formData.variables.join(', ')}
4. Mantenha a estrutura e formatação WhatsApp (*negrito*, _itálico_, ~riscado~)
5. Cada variação deve ser única, mas transmitir a mesma mensagem central
6. As variações devem ter tamanhos similares à original

Retorne as variações em um array JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            variations: {
              type: "array",
              items: { type: "string" },
              minItems: variationsCount,
              maxItems: variationsCount
            }
          },
          required: ["variations"]
        }
      });

      if (response?.variations && Array.isArray(response.variations)) {
        const newVariations = [...generatedVariations, ...response.variations];
        const limitedVariations = newVariations.slice(0, 9);
        setGeneratedVariations(limitedVariations);
        setSelectedVariations(limitedVariations);
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (error) {
      console.error('Erro ao gerar variações:', error);
      setErrors({ submit: 'Erro ao gerar variações. Tente novamente.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteVariation = (variation) => {
    setGeneratedVariations(prev => prev.filter(v => v !== variation));
    setSelectedVariations(prev => prev.filter(v => v !== variation));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    
    // Validação para smart templates
    if (isSmartTemplate && selectedVariations.length === 0) {
      setErrors({ submit: 'Selecione pelo menos uma variação para o modelo inteligente' });
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});

    try {
      let content_type = 'text';
      if (formData.attachments.length > 0) {
        content_type = formData.attachments[0].type;
      }

      const is_system_template = formData.category === 'notifications';

      const dataToSubmit = {
        ...formData,
        content_type: content_type,
        is_system_template: is_system_template,
        is_smart_template: isSmartTemplate,
        content_variations: isSmartTemplate ? selectedVariations : [],
        generation_style: isSmartTemplate ? generationStyle : null
      };

      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error("Error submitting template:", error);
      setErrors({ submit: 'Erro ao salvar modelo. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!open) return null;

  const hasAttachment = formData.attachments.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="w-[1000px] max-w-[95vw] max-h-[90vh] p-0 bg-white rounded-[2.5rem] border-gray-200 [&>button]:hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {template ? 'Editar Modelo' : 'Novo Modelo'}
                </h2>
                <p className="text-sm text-gray-600">Configure seu template de mensagem</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-8 w-8 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.submit && (
                <Alert variant="destructive" className="mb-4 rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.submit}</AlertDescription>
                </Alert>
              )}

              {/* Informações Básicas */}
              <Card className="rounded-3xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="template_name" className="text-sm font-medium">
                      Nome do Modelo *
                    </Label>
                    <Input
                      id="template_name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="rounded-xl border-gray-200 mt-1"
                      placeholder="Digite o nome do modelo"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category" className="text-sm font-medium">
                        Categoria *
                      </Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => handleInputChange('category', value)}
                      >
                        <SelectTrigger className="rounded-xl border-gray-200 mt-1">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {categories.map((category) => {
                            const IconComponent = category.icon;
                            const isSystemCategory = category.id === 'notifications';
                            return (
                              <SelectItem 
                                key={category.id} 
                                value={category.id}
                                className={isSystemCategory ? 'border-2 border-blue-400 bg-blue-50' : ''}
                              >
                                <div className="flex items-center gap-2">
                                  <IconComponent className="w-4 h-4" />
                                  {category.name}
                                  {isSystemCategory && (
                                    <Badge className="ml-2 bg-blue-500 text-white text-xs">Sistema</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {errors.category && (
                        <p className="text-sm text-red-600 mt-1">{errors.category}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="type" className="text-sm font-medium">
                        Tipo de Mensagem *
                      </Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => handleInputChange('type', value)}
                      >
                        <SelectTrigger className="rounded-xl border-gray-200 mt-1">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {types.map((type) => {
                            const IconComponent = type.icon;
                            const isDisabled = type.id === 'sms' || type.id === 'email';
                            return (
                              <SelectItem 
                                key={type.id} 
                                value={type.id}
                                disabled={isDisabled}
                                className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                              >
                                <div className="flex items-center gap-2">
                                  <IconComponent className="w-4 h-4" />
                                  {type.name}
                                  {isDisabled && (
                                    <Badge className="ml-2 bg-gray-100 text-gray-500 text-xs">Em breve</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {errors.type && (
                        <p className="text-sm text-red-600 mt-1">{errors.type}</p>
                      )}
                    </div>
                  </div>

                  {formData.type === 'email' && (
                    <div>
                      <Label htmlFor="subject" className="text-sm font-medium">
                        Assunto do Email *
                      </Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        className="rounded-xl border-gray-200 mt-1"
                        placeholder="Digite o assunto do email"
                      />
                      {errors.subject && (
                        <p className="text-sm text-red-600 mt-1">{errors.subject}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Anexos */}
              <Card className="rounded-3xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="w-5 h-5 text-blue-600" />
                      Anexos
                    </div>
                    {hasAttachment && (
                      <Badge variant="outline" className="text-xs">
                        1 anexo
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Aviso sobre limitação */}
                  {!hasAttachment && (
                    <Alert className="rounded-xl bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        Você pode anexar apenas <strong>um arquivo por template</strong> (imagem, vídeo, áudio ou documento).
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Lista de Anexos (se existir) */}
                  {hasAttachment ? (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Arquivo Anexado</Label>
                      {formData.attachments.map((attachment, index) => (
                        <div key={index}>
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
                              {getAttachmentIcon(attachment.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate text-blue-900">{attachment.filename}</p>
                              <p className="text-xs text-blue-600">
                                {formatFileSize(attachment.size)} • {attachment.type}
                              </p>
                            </div>
                          </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {(attachment.type === 'image' || attachment.type === 'video' || attachment.type === 'audio') && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowAttachmentPreview(!showAttachmentPreview)}
                                  className="rounded-xl"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  {showAttachmentPreview ? 'Ocultar' : 'Visualizar'}
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAttachment()}
                                className="hover:bg-red-100 rounded-xl"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Preview do anexo */}
                          {showAttachmentPreview && renderAttachmentPreview(attachment)}
                        </div>
                      ))}
                      
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Para anexar outro arquivo, remova o atual primeiro.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Botões de Upload */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <input
                            type="file"
                            id="image-upload"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'image')}
                            className="hidden"
                            disabled={uploadingFile || hasAttachment}
                          />
                          <label htmlFor="image-upload">
                            <div className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl transition-colors ${
                              uploadingFile || hasAttachment 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:bg-gray-50 cursor-pointer hover:border-blue-300'
                            }`}>
                              <ImageIcon className="w-6 h-6 text-blue-600" />
                              <span className="text-xs font-medium">Imagem</span>
                              <span className="text-xs text-gray-500">Até {FILE_SIZE_LIMITS.image}MB</span>
                            </div>
                          </label>
                        </div>

                        <div>
                          <input
                            type="file"
                            id="video-upload"
                            accept="video/*"
                            onChange={(e) => handleFileUpload(e, 'video')}
                            className="hidden"
                            disabled={uploadingFile || hasAttachment}
                          />
                          <label htmlFor="video-upload">
                            <div className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl transition-colors ${
                              uploadingFile || hasAttachment 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:bg-gray-50 cursor-pointer hover:border-blue-300'
                            }`}>
                              <Video className="w-6 h-6 text-blue-600" />
                              <span className="text-xs font-medium">Vídeo</span>
                              <span className="text-xs text-gray-500">Até {FILE_SIZE_LIMITS.video}MB</span>
                            </div>
                          </label>
                        </div>

                        <div>
                          {!showAudioRecorder ? (
                            <div 
                              className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl transition-colors ${
                                uploadingFile || hasAttachment 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'hover:bg-gray-50 cursor-pointer hover:border-blue-300'
                              }`}
                              onClick={() => {
                                if (!uploadingFile && !hasAttachment) { // Only allow if not uploading and no attachment exists
                                  setShowAudioRecorder(true);
                                }
                              }}
                            >
                              <Music className="w-6 h-6 text-blue-600" />
                              <span className="text-xs font-medium">Áudio</span>
                              <span className="text-xs text-gray-500">Gravar ou Anexar</span>
                            </div>
                          ) : (
                            <div className="p-2 border-2 border-purple-600 rounded-xl">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAudioRecorder(false)}
                                className="w-full"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Fechar
                              </Button>
                            </div>
                          )}
                        </div>

                        <div>
                          <input
                            type="file"
                            id="file-upload"
                            onChange={(e) => handleFileUpload(e, 'file')}
                            className="hidden"
                            disabled={uploadingFile || hasAttachment}
                          />
                          <label htmlFor="file-upload">
                            <div className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl transition-colors ${
                              uploadingFile || hasAttachment 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:bg-gray-50 cursor-pointer hover:border-blue-300'
                            }`}>
                              <File className="w-6 h-6 text-blue-600" />
                              <span className="text-xs font-medium">Arquivo</span>
                              <span className="text-xs text-gray-500">Até {FILE_SIZE_LIMITS.file}MB</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Gravador de Áudio */}
                      {showAudioRecorder && (
                        <AudioRecorder
                          onRecordingComplete={handleAudioRecordingComplete}
                          onCancel={() => setShowAudioRecorder(false)}
                        />
                      )}

                      {/* Upload ou Anexar Áudio existente */}
                      {showAudioRecorder && (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-gray-300" />
                            <span className="text-xs text-gray-500">ou</span>
                            <div className="flex-1 h-px bg-gray-300" />
                          </div>
                      
                          <div>
                            <input
                              type="file"
                              id="audio-file-upload"
                              accept="audio/*"
                              onChange={(e) => {
                                handleFileUpload(e, 'audio');
                                setShowAudioRecorder(false);
                              }}
                              className="hidden"
                              disabled={uploadingFile || hasAttachment}
                            />
                            <label htmlFor="audio-file-upload">
                              <div className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-xl transition-colors ${
                                  uploadingFile || hasAttachment 
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : 'hover:bg-gray-50 cursor-pointer hover:border-blue-300'
                                }`}>
                                <Upload className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium">Anexar arquivo de áudio existente</span>
                              </div>
                            </label>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Loading */}
                  {uploadingFile && (
                    <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-xl">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Fazendo upload...</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Conteúdo do Modelo */}
              <Card className="rounded-3xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      Conteúdo do Modelo
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="rounded-xl"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {showPreview ? 'Ocultar' : 'Visualizar'}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <Label htmlFor="template-content" className="text-sm font-medium">
                        Mensagem *
                      </Label>
                      <div className="mt-1">
                        <WhatsAppEditor
                          ref={editorRef}
                          value={formData.content}
                          onChange={(value) => handleInputChange('content', value)}
                          placeholder="Digite o conteúdo do modelo aqui..."
                          maxLength={2000}
                        />
                      </div>
                      {errors.content && (
                        <p className="text-sm text-red-600 mt-1">{errors.content}</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Variáveis Disponíveis</Label>
                      <div className="mt-1 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-2 bg-gray-50" style={{ height: 'calc(200px + 100px + 2rem)' }}>
                        {['Básico', 'Contato', 'Empresa', 'Endereço', 'Status', 'Observações', 'Redes Sociais', 'Dados Bancários', 'Importação', 'Sistema'].map((category) => {
                          const categoryVars = availableVariables.filter(v => v.category === category);
                          if (categoryVars.length === 0) return null;
                          
                          return (
                            <div key={category} className="mb-3">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                                {category}
                              </div>
                              <div className="space-y-1">
                                {categoryVars.map((variable, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                      const textarea = editorRef.current;
                                      if (textarea) {
                                        const start = textarea.selectionStart;
                                        const end = textarea.selectionEnd;
                                        const newContent = 
                                          formData.content.substring(0, start) + 
                                          variable.key + 
                                          formData.content.substring(end);
                                        handleInputChange('content', newContent);
                                        setTimeout(() => {
                                          textarea.focus();
                                          const newPos = start + variable.key.length;
                                          textarea.setSelectionRange(newPos, newPos);
                                        }, 0);
                                      }
                                    }}
                                    className="w-full text-left p-2 text-xs bg-white hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                  >
                                    <div className="font-mono text-blue-600 font-semibold">{variable.key}</div>
                                    <div className="text-gray-500 text-xs">{variable.description}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {showPreview && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Pré-visualização</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant={previewType === 'simple' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPreviewType('simple')}
                            className="rounded-xl text-xs"
                          >
                            Simples
                          </Button>
                          <Button
                            type="button"
                            variant={previewType === 'formatted' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPreviewType('formatted')}
                            className="rounded-xl text-xs"
                          >
                            Formatada
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border">
                        <div className="text-sm">
                          {renderPreview()}
                        </div>
                        
                        {/* Preview de Anexos */}
                        {formData.attachments.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-2">Anexos:</p>
                            <div className="flex flex-wrap gap-2">
                              {formData.attachments.map((attachment, index) => (
                                <Badge key={index} variant="outline" className="gap-1">
                                  {getAttachmentIcon(attachment.type)}
                                  {attachment.type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {formData.variables.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Variáveis Detectadas</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {formData.variables.map((variable, index) => (
                          <Badge key={index} variant="outline" className="rounded-full">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Modelo Inteligente */}
              <Card className="rounded-3xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Modelo Inteligente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
                    <Checkbox
                      id="is_smart_template"
                      checked={isSmartTemplate}
                      onCheckedChange={(checked) => {
                        setIsSmartTemplate(checked);
                        if (!checked) {
                          setGeneratedVariations([]);
                          setSelectedVariations([]);
                        }
                      }}
                      className="custom-checkbox mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor="is_smart_template" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Gerar variações com IA
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Crie de 1 a 9 variações da sua mensagem (original + variações = até 10 mensagens).
                      </p>
                    </div>
                  </div>

                  {isSmartTemplate && (
                    <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-xl">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Estilo de Geração</Label>
                          <Select
                            value={generationStyle}
                            onValueChange={setGenerationStyle}
                          >
                            <SelectTrigger className="rounded-xl border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="based_on_current">Baseado no padrão atual</SelectItem>
                              <SelectItem value="formal">Formal e profissional</SelectItem>
                              <SelectItem value="informal">Informal e amigável</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Gerar agora
                          </Label>
                          <Select
                            value={variationsCount.toString()}
                            onValueChange={(value) => setVariationsCount(parseInt(value))}
                          >
                            <SelectTrigger className="rounded-xl border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {(() => {
                                const maxToGenerate = 9 - generatedVariations.length;
                                const options = [];
                                for (let i = 1; i <= maxToGenerate && i <= 9; i++) {
                                  options.push(
                                    <SelectItem key={i} value={i.toString()}>
                                      +{i} {i === 1 ? 'nova variação' : 'novas variações'}
                                    </SelectItem>
                                  );
                                }
                                return options.length > 0 ? options : (
                                  <SelectItem value="0" disabled>Máximo atingido</SelectItem>
                                );
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleGenerateVariations}
                        disabled={isGenerating || !formData.content.trim() || generatedVariations.length >= 9}
                        className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Gerando {variationsCount} {variationsCount === 1 ? 'variação' : 'variações'}...
                          </>
                        ) : generatedVariations.length >= 9 ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Máximo de 9 variações atingido
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Gerar +{variationsCount} {variationsCount === 1 ? 'Variação' : 'Variações'}
                          </>
                        )}
                      </Button>

                      {generatedVariations.length > 0 && generatedVariations.length < 9 && (
                        <p className="text-xs text-center text-gray-500">
                          {generatedVariations.length}/9 variações • Você pode gerar mais {9 - generatedVariations.length}
                        </p>
                      )}

                      {generatedVariations.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              Variações Geradas ({selectedVariations.length}/{generatedVariations.length} selecionadas)
                            </Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedVariations(generatedVariations)}
                                className="rounded-lg text-xs h-7"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Selecionar Todas
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedVariations([])}
                                className="rounded-lg text-xs h-7"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Limpar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleGenerateVariations}
                                disabled={isGenerating}
                                className="rounded-lg text-xs h-7"
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Gerar Novas
                              </Button>
                            </div>
                          </div>

                          <style>
                            {`
                              @keyframes ai-border-flow {
                                0% {
                                  background-position: 0% 50%;
                                }
                                50% {
                                  background-position: 100% 50%;
                                }
                                100% {
                                  background-position: 0% 50%;
                                }
                              }
                              
                              .ai-generated-border {
                                background: linear-gradient(90deg, 
                                  #3b82f6 0%, 
                                  #60a5fa 25%, 
                                  #93c5fd 50%, 
                                  #60a5fa 75%, 
                                  #3b82f6 100%
                                );
                                background-size: 200% 100%;
                                animation: ai-border-flow 3s ease-in-out infinite;
                                padding: 2px;
                                border-radius: 0.75rem;
                              }
                              
                              .ai-generated-content {
                                background: white;
                                border-radius: 0.625rem;
                              }
                            `}
                          </style>

                          <div className="max-h-80 overflow-y-auto space-y-2 border border-gray-200 rounded-xl p-3">
                            {generatedVariations.map((variation, index) => {
                              const isSelected = selectedVariations.includes(variation);
                              return (
                                <div
                                  key={index}
                                  className="ai-generated-border"
                                >
                                  <div
                                    className={`ai-generated-content p-3 cursor-pointer transition-all ${
                                      isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                                    }`}
                                    onClick={() => {
                                      setSelectedVariations(prev => 
                                        prev.includes(variation)
                                          ? prev.filter(v => v !== variation)
                                          : [...prev, variation]
                                      );
                                    }}
                                  >
                                    <div className="flex items-start gap-2">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => {
                                          setSelectedVariations(prev => 
                                            prev.includes(variation)
                                              ? prev.filter(v => v !== variation)
                                              : [...prev, variation]
                                          );
                                        }}
                                        className="custom-checkbox mt-1"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            Variação {index + 1}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                          {variation}
                                        </p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteVariation(variation);
                                        }}
                                        className="h-7 w-7 hover:bg-red-100 rounded-lg flex-shrink-0"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Configurações */}
              <Card className="rounded-3xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Configurações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                      className="rounded-md"
                    />
                    <Label htmlFor="is_active" className="text-sm font-medium">
                      Modelo ativo
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || uploadingFile}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {template ? 'Atualizar Modelo' : 'Criar Modelo'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
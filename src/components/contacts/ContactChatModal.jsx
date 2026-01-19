
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Message } from "@/entities/Message";
import { Session } from "@/entities/Session";
import { User } from "@/entities/User";
import { sendText } from "@/functions/sendText";
import { sendImage } from "@/functions/sendImage";
import { sendFile } from "@/functions/sendFile";
import { sendVideo } from "@/functions/sendVideo";
import { getWaProfile } from "@/functions/getWaProfile";
import { UploadFile } from "@/integrations/Core";
import {
  X,
  Send,
  Phone,
  Video,
  Paperclip,
  Smile,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Image,
  FileText,
  PlayCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ContactChatModal({ contact, onClose }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Common emojis for quick access
  const quickEmojis = [
    '😊', '😂', '❤️', '👍', '👎', '😢', '😮', '😡',
    '🎉', '🔥', '💯', '✅', '❌', '⭐', '💪', '👏',
    '🙏', '💰', '📞', '📧', '⏰', '📅', '🚀', '💡'
  ];

  useEffect(() => {
    loadData();
    scrollToBottom();
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatPhone = (phone) => {
    if (!phone) return '';
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
      const countryCode = cleanPhone.substring(0, 2);
      const areaCode = cleanPhone.substring(2, 4);
      const firstPart = cleanPhone.substring(4, cleanPhone.length - 4);
      const lastPart = cleanPhone.substring(cleanPhone.length - 4);
      
      if (cleanPhone.length === 13) {
        return `+${countryCode} ${areaCode} ${firstPart}-${lastPart}`;
      } else {
        return `+${countryCode} ${areaCode} ${firstPart}-${lastPart}`;
      }
    }
    
    return phone;
  };

  const loadSessionProfiles = async (sessionList) => {
    const sessionsWithProfiles = await Promise.all(
      sessionList.map(async (session) => {
        let profileData = {};
        
        if (session.status === 'WORKING') {
          try {
            const profileResponse = await getWaProfile({ sessionName: session.session_name });
            if (profileResponse.data && profileResponse.data.success) {
              profileData = profileResponse.data.profile;
            }
          } catch (error) {
            console.error(`Erro ao buscar perfil da sessão ${session.session_name}:`, error);
          }
        }
        
        const phone = profileData.phone || session.phone;
        const name = profileData.name || session.session_name;
        
        return {
          ...session,
          profile: {
            name,
            phone,
            picture: profileData.picture,
            formattedPhone: formatPhone(phone)
          }
        };
      })
    );
    
    return sessionsWithProfiles;
  };

  const loadData = async () => {
    try {
      const user = await User.me();
      
      const messageHistory = await Message.filter(
        { 
          contact_id: contact.id,
          company_id: user.company_id 
        },
        'created_date',
        100
      );
      setMessages(messageHistory);

      const activeSessions = await Session.filter(
        { 
          company_id: user.company_id,
          status: 'WORKING'
        },
        '-created_date'
      );
      
      const sessionsWithProfiles = await loadSessionProfiles(activeSessions);
      setSessions(sessionsWithProfiles);
      
      if (sessionsWithProfiles.length > 0) {
        setSelectedSession(sessionsWithProfiles[0].session_name);
      }

    } catch (error) {
      console.error("Erro ao carregar dados do chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!selectedSession || isSending) return;

    // Se há arquivo selecionado, enviar com caption
    if (selectedFile && fileType) {
      await handleFileUpload(selectedFile, fileType, message);
      return;
    }

    // Se não há arquivo, enviar apenas texto
    if (!message.trim()) return;

    setIsSending(true);

    try {
      const response = await sendText({
        recipients: contact.phone,
        text: message,
        sessionName: selectedSession,
        linkPreview: true,
        contactId: contact.id
      });

      if (response.data && response.data.success) {
        setMessage('');
        setShowEmojiPicker(false);
        await loadData();
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (file, type, caption = '') => {
    if (!selectedSession || isUploading) return;

    setIsUploading(true);

    try {
      const uploadResponse = await UploadFile({ file });
      
      if (uploadResponse.file_url) {
        const fileData = {
          mimetype: file.type,
          filename: file.name,
          url: uploadResponse.file_url
        };

        let response;

        if (type === 'image') {
          response = await sendImage({
            phone: contact.phone,
            file: fileData,
            caption,
            sessionName: selectedSession,
            contactId: contact.id
          });
        } else if (type === 'video') {
          response = await sendVideo({
            phone: contact.phone,
            file: fileData,
            caption,
            sessionName: selectedSession,
            contactId: contact.id
          });
        } else {
          response = await sendFile({
            phone: contact.phone,
            file: fileData,
            caption,
            sessionName: selectedSession,
            contactId: contact.id
          });
        }

        if (response.data && response.data.success) {
          setMessage('');
          setSelectedFile(null);
          setFileType(null);
          await loadData();
        }
      }

    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageInputChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setFileType('image');
    }
    e.target.value = '';
  };

  const handleVideoInputChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setFileType('video');
    }
    e.target.value = '';
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setSelectedFile(file);
      setFileType('file');
    }
    e.target.value = '';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getMessageTime = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-blue-500" />;
      case 'read':
        return <CheckCircle className="w-3 h-3 text-blue-600" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getSelectedSessionInfo = () => {
    return sessions.find(s => s.session_name === selectedSession);
  };

  const handleClose = () => {
    document.body.style.overflow = 'unset';
    onClose();
  };

  const cancelFileSelection = () => {
    setSelectedFile(null);
    setFileType(null);
    setMessage('');
  };

  const getFileTypeLabel = () => {
    switch (fileType) {
      case 'image': return 'Imagem';
      case 'video': return 'Vídeo';
      case 'file': return 'Arquivo';
      default: return 'Arquivo';
    }
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <PlayCircle className="w-4 h-4" />;
      case 'file': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="mt-4 text-center text-gray-600">Carregando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999]">
      {/* Background overlay */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={handleClose}
      />
      
      {/* Chat content */}
      <div className="relative h-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-gradient-to-br from-green-400 to-green-500 text-white font-semibold">
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {contact.first_name} {contact.last_name}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">WhatsApp: {formatPhone(contact.phone)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled
                className="rounded-full opacity-50 cursor-not-allowed"
                title="Chamada de voz não disponível"
              >
                <Phone className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled
                className="rounded-full opacity-50 cursor-not-allowed"
                title="Chamada de vídeo não disponível"
              >
                <Video className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Session Selection */}
          {sessions.length > 0 && (
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Enviar via:</span>
                
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl">
                    {selectedSession ? (
                      <div className="flex items-center gap-3">
                        {(() => {
                          const sessionInfo = getSelectedSessionInfo();
                          return (
                            <>
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={sessionInfo?.profile?.picture} />
                                <AvatarFallback className="bg-green-500 text-white text-xs">
                                  {sessionInfo?.profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'WA'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col items-start">
                                <span className="text-sm font-medium text-gray-900">
                                  {sessionInfo?.profile?.name || sessionInfo?.session_name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {sessionInfo?.profile?.formattedPhone || 'Sem número'}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-gray-500">Selecionar sessão...</span>
                    )}
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[999999]">
                    {sessions.map((session) => (
                      <SelectItem 
                        key={session.id} 
                        value={session.session_name}
                        className="rounded-lg"
                      >
                        <div className="flex items-center gap-3 py-1">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={session.profile?.picture} />
                            <AvatarFallback className="bg-green-500 text-white text-xs">
                              {session.profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'WA'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-gray-900">
                              {session.profile?.name || session.session_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {session.profile?.formattedPhone || 'Sem número'}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div className="space-y-4">
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md ${
                      msg.direction === 'sent' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-200'
                    } rounded-2xl p-3 shadow-sm`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      
                      <div className={`flex items-center justify-between mt-2 text-xs ${
                        msg.direction === 'sent' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span>{getMessageTime(msg.created_date)}</span>
                        {msg.direction === 'sent' && (
                          <div className="flex items-center gap-1">
                            {getStatusIcon(msg.status)}
                          </div>
                        )}
                      </div>
                      
                      {msg.error_details && (
                        <div className="mt-2 text-xs text-red-200 bg-red-500/20 rounded px-2 py-1">
                          Erro: {msg.error_details}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhuma mensagem ainda</p>
                  <p className="text-sm text-gray-400 mt-1">Inicie uma conversa enviando uma mensagem</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* File Selected Preview */}
          {selectedFile && (
            <div className="p-4 bg-blue-50 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                    {getFileIcon()}
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{getFileTypeLabel()} selecionado</p>
                    <p className="text-sm text-blue-700">{selectedFile.name}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={cancelFileSelection}
                  className="text-blue-600 hover:bg-blue-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto">
                {quickEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleEmojiClick(emoji)}
                    className="text-2xl hover:bg-gray-100 rounded-lg p-2 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            {sessions.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Nenhuma sessão WhatsApp ativa encontrada</p>
                <p className="text-sm text-gray-400 mt-1">
                  Conecte uma sessão na página Sessões para enviar mensagens
                </p>
              </div>
            ) : !selectedSession ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Selecione uma sessão para enviar mensagens</p>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <div className="flex gap-2">
                  {/* File Upload Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        disabled={isUploading || isSending}
                        title="Anexar arquivo"
                      >
                        {isUploading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Paperclip className="w-5 h-5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-xl z-[999999]">
                      <DropdownMenuItem 
                        onClick={() => imageInputRef.current?.click()}
                        className="rounded-lg"
                      >
                        <Image className="w-4 h-4 mr-2" />
                        Imagem
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => videoInputRef.current?.click()}
                        className="rounded-lg"
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Vídeo
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Arquivo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="rounded-full"
                    title="Adicionar emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="flex-1 flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedFile ? "Digite uma legenda (opcional)..." : "Digite sua mensagem..."}
                    className="rounded-2xl border-gray-200"
                    disabled={isSending || isUploading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={(selectedFile ? false : !message.trim()) || isSending || isUploading}
                    className="bg-green-600 hover:bg-green-700 rounded-2xl px-4"
                  >
                    {isSending || isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageInputChange}
                  style={{ display: 'none' }}
                  accept="image/*"
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  onChange={handleVideoInputChange}
                  style={{ display: 'none' }}
                  accept="video/*"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                  accept="application/*,text/*"
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

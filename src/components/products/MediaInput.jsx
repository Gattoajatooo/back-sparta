import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Upload, Link as LinkIcon, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export function ImageInput({ value, onChange, label = "Imagem" }) {
  const [imageUrl, setImageUrl] = useState(value || "");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setImageUrl(value || "");
  }, [value]);

  const validateImage = (url) => {
    if (!url) {
      setIsValid(null);
      onChange("");
      return;
    }

    setIsValidating(true);
    const img = new Image();
    
    img.onload = () => {
      setIsValid(true);
      setIsValidating(false);
      onChange(url);
    };
    
    img.onerror = () => {
      setIsValid(false);
      setIsValidating(false);
      onChange("");
    };
    
    img.src = url;
  };

  const handleUrlChange = (url) => {
    setImageUrl(url);
    if (url) {
      const timeoutId = setTimeout(() => validateImage(url), 500);
      return () => clearTimeout(timeoutId);
    } else {
      setIsValid(null);
      onChange("");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida');
      return;
    }

    setIsUploading(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      if (response.file_url) {
        setImageUrl(response.file_url);
        validateImage(response.file_url);
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <Tabs defaultValue="url" className="mt-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url">
            <LinkIcon className="w-4 h-4 mr-2" />
            URL
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="url" className="space-y-3">
          <div className="relative">
            <Input
              value={imageUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
            {isValidating && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
            {!isValidating && isValid === true && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
            )}
            {!isValidating && isValid === false && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-600" />
            )}
          </div>
          
          {imageUrl && isValid === true && (
            <div className="border rounded-xl p-4 bg-gray-50">
              <img
                src={imageUrl}
                alt="Preview"
                className="max-h-48 mx-auto rounded-lg object-contain"
              />
            </div>
          )}
          
          {isValid === false && (
            <p className="text-sm text-red-600">
              Não foi possível carregar a imagem. Verifique a URL.
            </p>
          )}
        </TabsContent>
        
        <TabsContent value="upload">
          <div className="border-2 border-dashed rounded-xl p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <p className="text-sm text-gray-500">Fazendo upload...</p>
              </div>
            ) : imageUrl && isValid ? (
              <div>
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg object-contain mb-4"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Alterar Imagem
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-3">Clique para fazer upload</p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl"
                >
                  Selecionar Arquivo
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function VideoInput({ value, onChange, label = "Vídeo" }) {
  const [videoUrl, setVideoUrl] = useState(value || "");
  const [embedUrl, setEmbedUrl] = useState("");
  const [isValid, setIsValid] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setVideoUrl(value || "");
  }, [value]);

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    
    // Padrões do YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    
    return null;
  };

  const handleUrlChange = (url) => {
    setVideoUrl(url);
    
    if (!url) {
      setEmbedUrl("");
      setIsValid(null);
      onChange("");
      return;
    }

    const embed = getYouTubeEmbedUrl(url);
    if (embed) {
      setEmbedUrl(embed);
      setIsValid(true);
      onChange(url);
    } else {
      setEmbedUrl("");
      setIsValid(false);
      onChange("");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('video/')) {
      alert('Por favor, selecione um vídeo válido');
      return;
    }

    setIsUploading(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      if (response.file_url) {
        setVideoUrl(response.file_url);
        setIsValid(true);
        onChange(response.file_url);
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload do vídeo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <Tabs defaultValue="url" className="mt-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url">
            <LinkIcon className="w-4 h-4 mr-2" />
            URL YouTube
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="url" className="space-y-3">
          <div className="relative">
            <Input
              value={videoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            {isValid === true && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
            )}
            {isValid === false && videoUrl && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-600" />
            )}
          </div>
          
          {embedUrl && (
            <div className="border rounded-xl overflow-hidden bg-gray-50">
              <iframe
                src={embedUrl}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          
          {isValid === false && videoUrl && (
            <p className="text-sm text-red-600">
              URL inválida. Use um link do YouTube.
            </p>
          )}
        </TabsContent>
        
        <TabsContent value="upload">
          <div className="border-2 border-dashed rounded-xl p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <p className="text-sm text-gray-500">Fazendo upload...</p>
              </div>
            ) : videoUrl && isValid && !embedUrl ? (
              <div>
                <video
                  src={videoUrl}
                  controls
                  className="max-h-64 mx-auto rounded-lg mb-4"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Alterar Vídeo
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-3">Clique para fazer upload</p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl"
                >
                  Selecionar Arquivo
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
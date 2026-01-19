
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Search,
  Download,
  Eye,
  FileText,
  Shield,
  Users,
  Settings,
  MessageSquare,
  Zap,
  Calendar,
  BarChart3,
  HelpCircle,
  ExternalLink,
  Filter
} from "lucide-react";

export default function Documentation() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const documentCategories = [
    { id: "legal", name: "Documentos Legais", icon: Shield, color: "bg-red-100 text-red-800" },
    { id: "user_guide", name: "Guias do Usuário", icon: BookOpen, color: "bg-blue-100 text-blue-800" },
    { id: "api", name: "Documentação API", icon: Settings, color: "bg-green-100 text-green-800" },
    { id: "tutorials", name: "Tutoriais", icon: FileText, color: "bg-purple-100 text-purple-800" },
    { id: "policies", name: "Políticas", icon: Users, color: "bg-orange-100 text-orange-800" },
    { id: "release_notes", name: "Notas de Versão", icon: Zap, color: "bg-yellow-100 text-yellow-800" }
  ];

  const mockDocuments = [
    {
      id: "privacy_policy",
      title: "Política de Privacidade",
      description: "Como coletamos, usamos e protegemos seus dados pessoais",
      category: "legal",
      type: "PDF",
      size: "2.5 MB",
      version: "v2.1",
      updated: "2024-01-15",
      url: "#",
      viewable: true,
      downloadable: true
    },
    {
      id: "terms_of_service",
      title: "Termos de Serviço",
      description: "Condições de uso da plataforma Sparta Sync",
      category: "legal",
      type: "PDF",
      size: "1.8 MB",
      version: "v1.3",
      updated: "2024-01-10",
      url: "#",
      viewable: true,
      downloadable: true
    },
    {
      id: "whatsapp_guide",
      title: "Guia de Conexão WhatsApp",
      description: "Como conectar e gerenciar suas sessões do WhatsApp",
      category: "user_guide",
      type: "PDF",
      size: "5.2 MB",
      version: "v3.0",
      updated: "2024-01-20",
      url: "#",
      viewable: true,
      downloadable: true
    },
    {
      id: "campaign_tutorial",
      title: "Tutorial de Campanhas",
      description: "Criando e gerenciando campanhas eficazes",
      category: "tutorials",
      type: "Video",
      size: "45 min",
      version: "v1.0",
      updated: "2024-01-18",
      url: "#",
      viewable: true,
      downloadable: false
    },
    {
      id: "api_reference",
      title: "Referência da API",
      description: "Documentação completa da API REST do Sparta Sync",
      category: "api",
      type: "HTML",
      size: "Online",
      version: "v2.5",
      updated: "2024-01-22",
      url: "#",
      viewable: true,
      downloadable: false
    },
    {
      id: "data_policy",
      title: "Política de Dados",
      description: "Diretrizes sobre tratamento e armazenamento de dados",
      category: "policies",
      type: "PDF",
      size: "1.2 MB",
      version: "v1.1",
      updated: "2024-01-05",
      url: "#",
      viewable: true,
      downloadable: true
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchTerm, categoryFilter, documents]);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      setDocuments(mockDocuments);
    } catch (error) {
      console.error("Error loading documentation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (categoryFilter !== "all") {
      filtered = filtered.filter(doc => doc.category === categoryFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDocs(filtered);
  };

  const getCategoryInfo = (categoryId) => {
    return documentCategories.find(cat => cat.id === categoryId);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "PDF": return FileText;
      case "Video": return Eye;
      case "HTML": return ExternalLink;
      default: return FileText;
    }
  };

  const handleView = (document) => {
    if (document.type === "HTML") {
      window.open(document.url, '_blank');
    } else {
      // Open in modal or new tab
      window.open(document.url, '_blank');
    }
  };

  const handleDownload = (document) => {
    // Create download link
    const link = document.createElement('a');
    link.href = document.url;
    link.download = document.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentation</h1>
          <p className="text-gray-600">
            Acesse toda a documentação do sistema, políticas e tutoriais
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="rounded-3xl border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-2xl border-gray-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48 rounded-2xl border-gray-200">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {documentCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentCategories.map(category => {
          const count = documents.filter(doc => doc.category === category.id).length;
          const Icon = category.icon;
          
          return (
            <Card 
              key={category.id} 
              className="rounded-2xl border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setCategoryFilter(category.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${category.color} rounded-2xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">{count} documentos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocs.map(document => {
          const category = getCategoryInfo(document.category);
          const TypeIcon = getTypeIcon(document.type);
          const CategoryIcon = category?.icon || FileText;

          return (
            <Card key={document.id} className="rounded-3xl border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 ${category?.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      <CategoryIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{document.title}</h3>
                        <Badge variant="outline" className="rounded-full text-xs">
                          {document.version}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{document.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <TypeIcon className="w-4 h-4" />
                          <span>{document.type}</span>
                        </div>
                        <span>•</span>
                        <span>{document.size}</span>
                        <span>•</span>
                        <span>Atualizado em {new Date(document.updated).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {document.viewable && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleView(document)}
                        className="rounded-2xl"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver
                      </Button>
                    )}
                    {document.downloadable && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDownload(document)}
                        className="rounded-2xl"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDocs.length === 0 && (
        <Card className="rounded-3xl border-gray-200">
          <CardContent className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum documento encontrado</h3>
            <p className="text-gray-500">
              Tente ajustar os filtros ou termos de busca para encontrar o que procura.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

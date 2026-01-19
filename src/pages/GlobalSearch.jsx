
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  FileUser,
  Smartphone,
  FileText,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  Eye,
  Edit,
  Trash2,
  Send,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function GlobalSearch() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState("list");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    loadUser();
    checkInitialQuery();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  }, [searchQuery, sortBy, filterType]);

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const checkInitialQuery = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  };

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockResults = [
        {
          id: "contact-1",
          type: "contact",
          title: "João Silva",
          subtitle: "joao.silva@email.com • +55 11 99999-1234",
          description: "Cliente da empresa XYZ • Status: Ativo • Valor: R$ 25.000",
          icon: FileUser,
          color: "text-blue-600 bg-blue-50",
          lastUpdate: "2024-01-15T10:30:00Z",
          relevanceScore: 95,
          actions: [
            { label: "Ver Perfil", action: "view", url: "/contacts/1", icon: Eye },
            { label: "Editar", action: "edit", icon: Edit },
            { label: "Enviar Email", action: "email", icon: Mail },
            { label: "WhatsApp", action: "whatsapp", icon: MessageSquare },
            { label: "Ligar", action: "call", icon: Phone }
          ]
        },
        {
          id: "session-1",
          type: "session",
          title: "Sessão WhatsApp - João Silva",
          subtitle: "SC8A2B4C • Ativa há 2 horas",
          description: "45 mensagens enviadas • 23 recebidas • Última atividade: há 5 min",
          icon: Smartphone,
          color: "text-green-600 bg-green-50",
          lastUpdate: "2024-01-15T14:20:00Z",
          relevanceScore: 88,
          actions: [
            { label: "Ver Sessão", action: "view", url: "/sessions/SC8A2B4C", icon: Eye },
            { label: "Pausar", action: "pause", icon: Clock },
            { label: "Mensagem", action: "message", icon: Send }
          ]
        },
        {
          id: "template-1",
          type: "template",
          title: "Template: Feliz Aniversário",
          subtitle: "WhatsApp • Categoria: Aniversário",
          description: "Usado 45 vezes • Taxa de sucesso: 98.5% • Criado há 2 meses",
          icon: FileText,
          color: "text-purple-600 bg-purple-50",
          lastUpdate: "2024-01-10T09:15:00Z",
          relevanceScore: 82,
          actions: [
            { label: "Ver Template", action: "view", url: "/templates/1", icon: Eye },
            { label: "Editar", action: "edit", icon: Edit },
            { label: "Usar Agora", action: "use", icon: Send },
            { label: "Duplicar", action: "duplicate", icon: ExternalLink }
          ]
        }
        // Add more mock results...
      ].filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      );

      // Sort results
      const sortedResults = mockResults.sort((a, b) => {
        switch (sortBy) {
          case "relevance":
            return b.relevanceScore - a.relevanceScore;
          case "date":
            return new Date(b.lastUpdate) - new Date(a.lastUpdate);
          case "name":
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });

      // Filter by type
      const filteredResults = filterType === "all" 
        ? sortedResults 
        : sortedResults.filter(item => item.type === filterType);

      setSearchResults(filteredResults);
      setIsLoading(false);
    }, 500);
  };

  const handleSearchAction = (item, action) => {
    if (action.url) {
      window.location.href = action.url;
    } else {
      console.log(`Action ${action.action} on ${item.type}: ${item.title}`);
    }
  };

  const getResultsByType = (type) => {
    return type === "all" ? searchResults : searchResults.filter(r => r.type === type);
  };

  const getTypeStats = () => {
    const stats = {
      all: searchResults.length,
      contact: searchResults.filter(r => r.type === "contact").length,
      session: searchResults.filter(r => r.type === "session").length,
      template: searchResults.filter(r => r.type === "template").length
    };
    return stats;
  };

  const stats = getTypeStats();

  const renderResultCard = (result) => (
    <Card key={result.id} className="rounded-2xl border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 ${result.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
            <result.icon className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{result.title}</h3>
                <p className="text-sm text-gray-600 mb-1">{result.subtitle}</p>
                <p className="text-sm text-gray-500">{result.description}</p>
              </div>
              <div className="text-right text-xs text-gray-400">
                {format(new Date(result.lastUpdate), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4">
              {result.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearchAction(result, action)}
                  className="text-xs rounded-xl h-8"
                >
                  <action.icon className="w-3 h-3 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center">
          <Search className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global Search</h1>
          <p className="text-gray-600">
            Search across all your data - contacts, sessions, templates and more
          </p>
        </div>
      </div>

      {/* Search Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 flex flex-col md:flex-row gap-4 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search everything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-2xl border-gray-200"
            />
          </div>
          
          {/* Filters */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 rounded-2xl border-gray-200">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="contact">Contacts</SelectItem>
              <SelectItem value="session">Sessions</SelectItem>
              <SelectItem value="template">Templates</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 rounded-2xl border-gray-200">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="date">Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="rounded-2xl"
          >
            {viewMode === "grid" ? <List className="w-4 h-4 mr-2" /> : <Grid3X3 className="w-4 h-4 mr-2" />}
            {viewMode === "grid" ? "List View" : "Grid View"}
          </Button>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      ) : searchQuery && searchResults.length === 0 ? (
        <Card className="rounded-3xl border-gray-200">
          <CardContent className="text-center py-16">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search terms or filters
            </p>
          </CardContent>
        </Card>
      ) : searchResults.length > 0 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 rounded-2xl bg-gray-100 p-1 w-96">
            <TabsTrigger value="all" className="rounded-xl">All ({stats.all})</TabsTrigger>
            <TabsTrigger value="contact" className="rounded-xl">Contacts ({stats.contact})</TabsTrigger>
            <TabsTrigger value="session" className="rounded-xl">Sessions ({stats.session})</TabsTrigger>
            <TabsTrigger value="template" className="rounded-xl">Templates ({stats.template})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="space-y-4">
              {getResultsByType("all").map(renderResultCard)}
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <div className="space-y-4">
              {getResultsByType("contact").map(renderResultCard)}
            </div>
          </TabsContent>

          <TabsContent value="session" className="space-y-4">
            <div className="space-y-4">
              {getResultsByType("session").map(renderResultCard)}
            </div>
          </TabsContent>

          <TabsContent value="template" className="space-y-4">
            <div className="space-y-4">
              {getResultsByType("template").map(renderResultCard)}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="rounded-3xl border-gray-200">
          <CardContent className="text-center py-16">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Start your search</h3>
            <p className="text-gray-500">
              Search for contacts, sessions, templates, and more
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

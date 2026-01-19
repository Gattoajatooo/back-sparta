import React, { useState, useEffect } from "react";
import { SystemLog } from "@/entities/SystemLog";
import { User } from "@/entities/User";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Activity,
  Search,
  Filter,
  MoreVertical,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  LayoutGrid,
  List,
  X,
  ArrowUpDown,
  Database,
  Code
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// import LogDetailsModal from "@/components/logs/LogDetailsModal";

// Banner component
const Banner = ({ show, message, type, onClose }) => {
  if (!show) return null;

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-yellow-500';
  const textColor = 'text-white';

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center justify-between ${bgColor} ${textColor}`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white hover:bg-opacity-20">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]); // Store all logs for client-side pagination
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("list");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedResource, setSelectedResource] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 50;

  // Banner state
  const [banner, setBanner] = useState({ show: false, message: '', type: 'success' });
  
  // Modal states
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const showBanner = (message, type = 'success') => {
    setBanner({ show: true, message, type });
    setTimeout(() => {
      hideBanner();
    }, 5000);
  };

  const hideBanner = () => {
    setBanner({ show: false, message: '', type: 'success' });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.company_id) {
        console.log('Loading logs for company:', currentUser.company_id);
        
        // Load all logs at once - let client handle pagination and sorting
        const logList = await SystemLog.filter(
          { company_id: currentUser.company_id },
          '-created_date', // Sort by newest first
          200 // Limit to last 200 logs
        );

        console.log(`Loaded ${logList.length} logs`);
        setAllLogs(logList);
        setLogs(logList);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
      showBanner(`Erro ao carregar logs: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const handleSortChange = (newSortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'created_date' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      success: 'bg-green-100 text-green-800 border-green-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    
    const labels = {
      success: 'Sucesso',
      error: 'Erro',
      warning: 'Aviso'
    };

    return (
      <Badge className={`${colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'} border`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getActionBadge = (action) => {
    const colors = {
      create: 'bg-blue-100 text-blue-800',
      update: 'bg-purple-100 text-purple-800',
      delete: 'bg-red-100 text-red-800',
      send: 'bg-green-100 text-green-800',
      import: 'bg-orange-100 text-orange-800',
      export: 'bg-indigo-100 text-indigo-800'
    };
    
    return (
      <Badge variant="outline" className={colors[action] || 'bg-gray-100 text-gray-800'}>
        {action.toUpperCase()}
      </Badge>
    );
  };

  // Client-side filtering and sorting
  const filteredLogs = allLogs
    .filter(log => {
      const matchesSearch = !searchTerm ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.endpoint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.error_message?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === "all" || log.status === selectedStatus;
      const matchesAction = selectedAction === "all" || log.action === selectedAction;
      const matchesResource = selectedResource === "all" || log.resource_type === selectedResource;

      return matchesSearch && matchesStatus && matchesAction && matchesResource;
    })
    .sort((a, b) => {
      let aVal, bVal;
      
      switch(sortBy) {
        case 'created_date':
          aVal = new Date(a.created_date).getTime();
          bVal = new Date(b.created_date).getTime();
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'action':
          aVal = a.action || '';
          bVal = b.action || '';
          break;
        case 'duration_ms':
          aVal = a.duration_ms || 0;
          bVal = b.duration_ms || 0;
          break;
        default:
          aVal = a[sortBy] || '';
          bVal = b[sortBy] || '';
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

  const getLogsByTab = (tab) => {
    switch (tab) {
      case "success":
        return filteredLogs.filter(l => l.status === 'success');
      case "errors":
        return filteredLogs.filter(l => l.status === 'error');
      case "warnings":
        return filteredLogs.filter(l => l.status === 'warning');
      default:
        return filteredLogs;
    }
  };

  // Client-side pagination
  const paginatedLogs = getLogsByTab(activeTab);
  const totalLogs = paginatedLogs.length;
  const totalPages = Math.ceil(totalLogs / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const currentLogs = paginatedLogs.slice(startIndex, endIndex);

  // Compact card component for list view
  const CompactLogCard = ({ log }) => (
    <Card className="rounded-xl border-gray-200 hover:shadow-sm transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {getStatusIcon(log.status)}
              <Badge className={`text-xs px-2 py-1 ${
                log.status === 'success' ? 'bg-green-100 text-green-800 border-green-200' :
                log.status === 'error' ? 'bg-red-100 text-red-800 border-red-200' :
                'bg-yellow-100 text-yellow-800 border-yellow-200'
              } border`}>
                {log.status === 'success' ? 'Sucesso' : log.status === 'error' ? 'Erro' : 'Aviso'}
              </Badge>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900 truncate">{log.action}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-500 truncate">{log.resource_type}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {format(parseISO(log.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
                {log.duration_ms && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{log.duration_ms}ms</span>
                  </>
                )}
                {log.endpoint && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-600 truncate max-w-[100px]">
                      {log.endpoint}
                    </code>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => handleViewDetails(log)} className="rounded-lg">
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {log.error_message && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-xs truncate">{log.error_message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1da99ed30_LOGO_SPARTA_SYNC.png"
            alt="Sparta Sync"
            className="w-16 h-16 mx-auto object-contain mb-4"
            style={{
              animation: 'spartaFade 2s ease-in-out infinite'
            }}
          />
          <style>
            {`
              @keyframes spartaFade {
                0%, 100% {
                  opacity: 1;
                  transform: scale(1);
                }
                50% {
                  opacity: 0.5;
                  transform: scale(0.95);
                }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <Banner
        show={banner.show}
        message={banner.message}
        type={banner.type}
        onClose={hideBanner}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs do Sistema</h1>
            <p className="text-gray-600">
              {totalLogs} registros encontrados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Grid/List */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`rounded-xl ${viewMode === 'grid' ? 'bg-gray-600 hover:bg-gray-700 text-white' : ''}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-xl ${viewMode === 'list' ? 'bg-gray-600 hover:bg-gray-700 text-white' : ''}`}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Botão Atualizar */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1">
            <Button
              onClick={() => loadData()}
              variant="ghost"
              size="sm"
              disabled={isLoading}
              className="rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-2xl border-gray-200"
            />
          </div>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-40 rounded-2xl border-gray-200">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="created_date">Data</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="action">Ação</SelectItem>
              <SelectItem value="duration_ms">Duração</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => handleSortChange(sortBy)}
            className="rounded-2xl"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40 rounded-2xl border-gray-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="warning">Aviso</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedAction} onValueChange={setSelectedAction}>
          <SelectTrigger className="w-40 rounded-2xl border-gray-200">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">Todas as Ações</SelectItem>
            <SelectItem value="create">Criar</SelectItem>
            <SelectItem value="update">Atualizar</SelectItem>
            <SelectItem value="delete">Excluir</SelectItem>
            <SelectItem value="send">Enviar</SelectItem>
            <SelectItem value="import">Importar</SelectItem>
            <SelectItem value="export">Exportar</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedResource} onValueChange={setSelectedResource}>
          <SelectTrigger className="w-40 rounded-2xl border-gray-200">
            <SelectValue placeholder="Recurso" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">Todos os Recursos</SelectItem>
            <SelectItem value="contact">Contato</SelectItem>
            <SelectItem value="campaign">Campanha</SelectItem>
            <SelectItem value="message">Mensagem</SelectItem>
            <SelectItem value="session">Sessão</SelectItem>
            <SelectItem value="tag">Marcador</SelectItem>
            <SelectItem value="import">Importação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }} className="space-y-6">
        <TabsList className="grid grid-cols-4 rounded-2xl bg-gray-100 p-1">
          <TabsTrigger value="all" className="rounded-xl">
            Todos ({getLogsByTab('all').length})
          </TabsTrigger>
          <TabsTrigger value="success" className="rounded-xl">
            Sucesso ({getLogsByTab('success').length})
          </TabsTrigger>
          <TabsTrigger value="errors" className="rounded-xl">
            Erros ({getLogsByTab('errors').length})
          </TabsTrigger>
          <TabsTrigger value="warnings" className="rounded-xl">
            Avisos ({getLogsByTab('warnings').length})
          </TabsTrigger>
        </TabsList>

        {['all', 'success', 'errors', 'warnings'].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue}>
            {currentLogs.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : "space-y-2"}>
                {currentLogs.map((log) => 
                  viewMode === 'list' ? (
                    <CompactLogCard key={log.id} log={log} />
                  ) : (
                    <Card key={log.id} className="rounded-2xl border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className="font-medium text-gray-900">{log.action}</span>
                            {getActionBadge(log.action)}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(log.status)}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem onClick={() => handleViewDetails(log)} className="rounded-lg">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Recurso:</span>
                            <span className="font-medium">{log.resource_type}</span>
                          </div>
                          
                          {log.endpoint && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Endpoint:</span>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">{log.endpoint}</code>
                            </div>
                          )}
                          
                          {log.duration_ms && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Duração:</span>
                              <span className="font-medium">{log.duration_ms}ms</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between">
                            <span className="text-gray-500">Data:</span>
                            <span className="font-medium">
                              {format(parseISO(log.created_date), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                            </span>
                          </div>
                          
                          {log.error_message && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-red-800 text-xs font-medium">Erro:</p>
                              <p className="text-red-700 text-xs mt-1 truncate">{log.error_message}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            ) : (
              <Card className="rounded-3xl border-gray-200">
                <CardContent className="text-center py-16">
                  <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum log encontrado</h3>
                  <p className="text-gray-500">Não há logs correspondentes aos filtros selecionados</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            Mostrando {startIndex + 1} a {Math.min(endIndex, totalLogs)} de {totalLogs} logs
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              Anterior
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    variant={currentPage === pageNum ? 'default' : 'ghost'}
                    size="sm"
                    className={`rounded-xl w-8 h-8 p-0 ${currentPage === pageNum ? 'bg-gray-600 hover:bg-gray-700 text-white' : ''}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      // {/* Modals */}
      // <LogDetailsModal
      //   open={showLogDetails}
      //   log={selectedLog}
      //   onClose={() => {
      //     setShowLogDetails(false);
      //     setSelectedLog(null);
      //   }}
      />
    </div>
  );
}
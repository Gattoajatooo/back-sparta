import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Database,
  Search,
  Table,
  FileText,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  X
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DatabaseSection() {
  const [entities, setEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityRecords, setEntityRecords] = useState([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordFormData, setRecordFormData] = useState("{}");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [notification, setNotification] = useState(null);
  const [recordSearchTerm, setRecordSearchTerm] = useState("");
  const [expandedRecords, setExpandedRecords] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [availableFields, setAvailableFields] = useState([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const RECORDS_PER_PAGE = 100;

  useEffect(() => {
    loadEntities();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadEntities = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('getDatabaseEntities', {});
      
      if (response.data?.success) {
        setEntities(response.data.entities);
      } else {
        throw new Error(response.data?.error || 'Erro ao carregar entidades');
      }
    } catch (error) {
      console.error("Erro ao carregar entidades:", error);
      showNotification("Erro ao carregar entidades", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadEntityRecords = async (entityName, page = 0, searchTerm = "", filters = {}) => {
    console.log('[DatabaseSection] Carregando registros de:', entityName, 'página:', page, 'busca:', searchTerm, 'filtros:', filters);
    setIsLoadingRecords(true);
    try {
      const response = await base44.functions.invoke('getDatabaseRecords', {
        entityName,
        page,
        limit: RECORDS_PER_PAGE,
        searchTerm,
        filters
      });
      
      console.log('[DatabaseSection] Resposta:', response.data);
      
      if (response.data?.success) {
        const records = response.data.records;
        
        // Validar que é array
        if (!Array.isArray(records)) {
          console.error('[DatabaseSection] ❌ Records não é array:', typeof records, records);
          throw new Error('Formato de dados inválido - esperado array');
        }
        
        console.log('[DatabaseSection] ✅ Carregados', records.length, 'registros de', response.data.total);
        
        setEntityRecords(records);
        setTotalRecords(response.data.total || 0);
        setCurrentPage(page);
      } else {
        throw new Error(response.data?.error || 'Erro ao carregar registros');
      }
    } catch (error) {
      console.error("[DatabaseSection] Erro ao carregar registros:", error);
      showNotification(`Erro ao carregar registros: ${error.message}`, "error");
      setEntityRecords([]);
      setTotalRecords(0);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleViewEntity = async (entity) => {
    console.log('[DatabaseSection] Abrindo entidade:', entity.name);
    setSelectedEntity(entity);
    setCurrentPage(0);
    setRecordSearchTerm("");
    setExpandedRecords(new Set());
    setActiveFilters({});
    setShowFilters(false);
    
    // Carregar campos disponíveis
    await loadAvailableFields(entity.name);
    
    loadEntityRecords(entity.name, 0, "", {});
  };

  const loadAvailableFields = async (entityName) => {
    try {
      const response = await base44.functions.invoke('getDatabaseRecords', {
        entityName,
        page: 0,
        limit: 1
      });
      
      if (response.data?.success && response.data.records.length > 0) {
        const sampleRecord = response.data.records[0];
        const fields = Object.keys(sampleRecord).filter(key => 
          !['created_date', 'updated_date', 'created_by'].includes(key)
        );
        setAvailableFields(fields);
      }
    } catch (error) {
      console.error('Erro ao carregar campos:', error);
    }
  };

  const handleSearch = () => {
    setCurrentPage(0);
    loadEntityRecords(selectedEntity.name, 0, recordSearchTerm, activeFilters);
  };

  const handleAddFilter = (field, value, filterType = 'value') => {
    if (filterType === 'length') {
      const length = parseInt(value);
      if (isNaN(length)) {
        showNotification('Quantidade de caracteres deve ser um número', 'error');
        return;
      }
      setActiveFilters(prev => ({
        ...prev,
        [`${field}__length`]: length
      }));
    } else {
      setActiveFilters(prev => ({
        ...prev,
        [field]: { '$regex': value, '$options': 'i' }
      }));
    }
  };

  const handleRemoveFilter = (field) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  };

  const handleApplyFilters = () => {
    setCurrentPage(0);
    loadEntityRecords(selectedEntity.name, 0, recordSearchTerm, activeFilters);
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const response = await base44.functions.invoke('bulkDeleteDatabaseRecords', {
        entityName: selectedEntity.name,
        filters: activeFilters
      });
      
      if (response.data?.success) {
        showNotification(
          `${response.data.deletedCount} registros deletados com sucesso! ${response.data.failedCount > 0 ? `(${response.data.failedCount} falharam)` : ''}`
        );
        setShowBulkDeleteDialog(false);
        loadEntityRecords(selectedEntity.name, 0, recordSearchTerm, {});
        setActiveFilters({});
        loadEntities();
      } else {
        throw new Error(response.data?.error || 'Erro ao deletar registros');
      }
    } catch (error) {
      console.error('Erro na deleção em massa:', error);
      showNotification(`Erro ao deletar: ${error.message}`, 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleRecordExpansion = (recordId) => {
    setExpandedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const handleCreateRecord = () => {
    setEditingRecord(null);
    setRecordFormData("{}");
    setShowRecordModal(true);
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    const { id, created_date, updated_date, created_by, ...editableData } = record;
    setRecordFormData(JSON.stringify(editableData, null, 2));
    setShowRecordModal(true);
  };

  const handleSaveRecord = async () => {
    try {
      const data = JSON.parse(recordFormData);
      
      let response;
      if (editingRecord) {
        response = await base44.functions.invoke('updateDatabaseRecord', {
          entityName: selectedEntity.name,
          recordId: editingRecord.id,
          data
        });
      } else {
        response = await base44.functions.invoke('createDatabaseRecord', {
          entityName: selectedEntity.name,
          data
        });
      }
      
      if (response.data?.success) {
        showNotification(editingRecord ? "Registro atualizado com sucesso!" : "Registro criado com sucesso!");
        setShowRecordModal(false);
        loadEntityRecords(selectedEntity.name, currentPage);
        loadEntities();
      } else {
        throw new Error(response.data?.error || 'Erro ao salvar registro');
      }
    } catch (error) {
      console.error("Erro ao salvar registro:", error);
      showNotification(`Erro: ${error.message}`, "error");
    }
  };

  const handleDeleteRecord = async () => {
    try {
      const response = await base44.functions.invoke('deleteDatabaseRecord', {
        entityName: selectedEntity.name,
        recordId: deletingRecord.id
      });
      
      if (response.data?.success) {
        showNotification("Registro excluído com sucesso!");
        setShowDeleteDialog(false);
        setDeletingRecord(null);
        loadEntityRecords(selectedEntity.name, currentPage);
        loadEntities();
      } else {
        throw new Error(response.data?.error || 'Erro ao deletar registro');
      }
    } catch (error) {
      console.error("Erro ao deletar registro:", error);
      showNotification(`Erro ao deletar: ${error.message}`, "error");
    }
  };

  const totalPages = Math.ceil(totalRecords / RECORDS_PER_PAGE);

  const filteredEntities = entities.filter(entity =>
    entity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Card className={`rounded-2xl ${notification.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <CardContent className="p-4">
            <p className={notification.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {notification.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Se está vendo uma entidade específica */}
      {selectedEntity ? (
        <div className="space-y-4">
          {/* Header com botão voltar */}
          <Card className="rounded-3xl border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedEntity(null);
                      setEntityRecords([]);
                      setCurrentPage(0);
                    }}
                    className="rounded-xl"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Table className="w-5 h-5 text-blue-600" />
                      {selectedEntity.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {totalRecords.toLocaleString()} registros no total
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
  <Button
    variant="outline"
    size="icon"
    onClick={() => loadEntityRecords(selectedEntity.name, currentPage, recordSearchTerm, activeFilters)}
    className="rounded-xl"
  >
    <RefreshCw className="w-4 h-4" />
  </Button>
                  <Button
                    onClick={handleCreateRecord}
                    className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Registro
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Barra de Pesquisa e Filtros */}
          <Card className="rounded-3xl border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Pesquisar em todos os registros..."
                    value={recordSearchTerm}
                    onChange={(e) => setRecordSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 rounded-xl"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="rounded-xl"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros {Object.keys(activeFilters).length > 0 && `(${Object.keys(activeFilters).length})`}
                </Button>
                <Button
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
                {(recordSearchTerm || Object.keys(activeFilters).length > 0) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRecordSearchTerm("");
                      setActiveFilters({});
                      loadEntityRecords(selectedEntity.name, 0, "", {});
                    }}
                    className="rounded-xl"
                  >
                    Limpar Tudo
                  </Button>
                )}
              </div>

              {/* Filtros Avançados */}
              {showFilters && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm">Filtros Avançados</h4>
                    {Object.keys(activeFilters).length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowBulkDeleteDialog(true)}
                        className="rounded-xl"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar em Massa ({totalRecords})
                      </Button>
                    )}
                  </div>
                  
                  {/* Filtros Ativos */}
                  {Object.keys(activeFilters).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {Object.entries(activeFilters).map(([field, value]) => {
                        const isLengthFilter = field.endsWith('__length');
                        const displayField = isLengthFilter ? field.replace('__length', '') : field;
                        const displayValue = isLengthFilter ? `${value} caracteres` : JSON.stringify(value);

                        return (
                          <Badge key={field} variant="secondary" className="rounded-xl">
                            {displayField}: {displayValue}
                            <button
                              onClick={() => handleRemoveFilter(field)}
                              className="ml-2 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Adicionar Novo Filtro */}
                  <div className="grid grid-cols-4 gap-2">
                    <select
                      id="filterField"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="">Selecione um campo</option>
                      {availableFields.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </select>
                    <select
                      id="filterType"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="value">Contém valor</option>
                      <option value="length">Qtd. caracteres</option>
                    </select>
                    <Input
                      id="filterValue"
                      placeholder="Valor ou número"
                      className="rounded-xl"
                      type="text"
                    />
                    <Button
                      onClick={() => {
                        const field = document.getElementById('filterField').value;
                        const filterType = document.getElementById('filterType').value;
                        const value = document.getElementById('filterValue').value;
                        if (field && value) {
                          if (filterType === 'length') {
                            handleAddFilter(field, value, 'length');
                          } else {
                            handleAddFilter(field, value, 'value');
                          }
                          document.getElementById('filterField').value = '';
                          document.getElementById('filterValue').value = '';
                          document.getElementById('filterType').value = 'value';
                        }
                      }}
                      variant="outline"
                      className="rounded-xl"
                    >
                      Adicionar
                    </Button>
                  </div>
                  
                  {Object.keys(activeFilters).length > 0 && (
                    <Button
                      onClick={handleApplyFilters}
                      className="w-full mt-3 bg-blue-600 hover:bg-blue-700 rounded-xl"
                    >
                      Aplicar Filtros
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Registros */}
          <Card className="rounded-3xl border-gray-200">
            <CardContent className="p-6">
              {isLoadingRecords ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : entityRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Nenhum registro encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entityRecords.map((record) => {
                    const isExpanded = expandedRecords.has(record.id);
                    const recordPreview = JSON.stringify(record, null, 2);
                    const previewLines = recordPreview.split('\n').slice(0, 5).join('\n');
                    
                    return (
                      <div
                        key={record.id}
                        className="rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between p-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRecordExpansion(record.id)}
                                className="h-6 px-2 rounded-lg"
                              >
                                <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </Button>
                              <Badge variant="outline" className="font-mono text-xs">
                                ID: {record.id}
                              </Badge>
                              {record.created_date && (
                                <span className="text-xs text-gray-500">
                                  Criado: {new Date(record.created_date).toLocaleString('pt-BR')}
                                </span>
                              )}
                            </div>
                            <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap break-words ml-8">
                              {isExpanded ? recordPreview : previewLines + '...'}
                            </pre>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditRecord(record)}
                              className="rounded-xl h-8 w-8"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setDeletingRecord(record);
                                setShowDeleteDialog(true);
                              }}
                              className="rounded-xl h-8 w-8 hover:bg-red-50 hover:border-red-300"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Paginação */}
              {totalRecords > RECORDS_PER_PAGE && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Mostrando {currentPage * RECORDS_PER_PAGE + 1} - {Math.min((currentPage + 1) * RECORDS_PER_PAGE, totalRecords)} de {totalRecords}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => loadEntityRecords(selectedEntity.name, currentPage - 1, recordSearchTerm, activeFilters)}
                      disabled={currentPage === 0}
                      className="rounded-xl h-8 w-8"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage + 1} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => loadEntityRecords(selectedEntity.name, currentPage + 1, recordSearchTerm, activeFilters)}
                      disabled={currentPage >= totalPages - 1}
                      className="rounded-xl h-8 w-8"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Lista de entidades
        <div>
          {/* Header */}
          <Card className="rounded-3xl border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Banco de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Visualize e gerencie todas as entidades do sistema
              </p>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar entidades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Entidades</p>
                    <p className="text-2xl font-bold text-gray-900">{entities.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Table className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Registros</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {entities.reduce((sum, e) => sum + e.count, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Entidades Ativas</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {entities.filter(e => e.status === 'active').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                    <Database className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Entities List */}
          <Card className="rounded-3xl border-gray-200">
            <CardContent className="p-6">
              <div className="space-y-2">
                {filteredEntities.map((entity) => (
                  <div
                    key={entity.name}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Table className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{entity.name}</h3>
                        <p className="text-sm text-gray-500">
                          {entity.count.toLocaleString()} registros
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={entity.status === 'active' ? 'default' : 'secondary'}
                        className="rounded-full text-xs"
                      >
                        {entity.status === 'active' ? 'Ativo' : 'Erro'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg"
                        onClick={() => handleViewEntity(entity)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredEntities.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhuma entidade encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Criar/Editar Registro */}
      <Dialog open={showRecordModal} onOpenChange={setShowRecordModal}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Editar Registro' : 'Criar Novo Registro'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Dados do Registro (JSON)
              </label>
              <Textarea
                value={recordFormData}
                onChange={(e) => setRecordFormData(e.target.value)}
                className="font-mono text-sm h-96 rounded-xl"
                placeholder='{"field": "value"}'
              />
              <p className="text-xs text-gray-500 mt-2">
                Insira os dados em formato JSON. Campos built-in (id, created_date, updated_date, created_by) são gerenciados automaticamente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordModal(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSaveRecord} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
              {editingRecord ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Deleção em Massa */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Deleção em Massa</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p className="text-red-600 font-semibold">
                  ⚠️ ATENÇÃO: Esta ação é irreversível!
                </p>
                <p>
                  Você está prestes a deletar <strong>{totalRecords} registros</strong> da entidade{' '}
                  <strong>{selectedEntity?.name}</strong> com os seguintes filtros:
                </p>
                <div className="bg-gray-100 rounded-xl p-3 space-y-1">
                  {Object.entries(activeFilters).map(([field, value]) => (
                    <div key={field} className="text-sm">
                      <strong>{field}:</strong> {JSON.stringify(value)}
                    </div>
                  ))}
                  {Object.keys(activeFilters).length === 0 && (
                    <p className="text-sm text-gray-500">Nenhum filtro aplicado</p>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Tem certeza que deseja continuar?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isBulkDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                'Sim, Deletar Tudo'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
              {deletingRecord && (
                <pre className="mt-3 p-3 bg-gray-100 rounded-xl text-xs overflow-x-auto">
                  {JSON.stringify(deletingRecord, null, 2)}
                </pre>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecord}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
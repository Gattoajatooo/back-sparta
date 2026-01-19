import React, { useState, useEffect } from "react";
import { Task } from "@/entities/Task";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Bug,
  Lightbulb,
  Zap,
  CheckSquare,
  Clock,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  X,
  Settings,
  LayoutGrid,
  List,
  User as UserIcon,
  Calendar,
  TestTube,
  Brain,
  PackagePlus,
  Archive,
  Image as ImageIcon,
  Video,
  Music,
  File as FileIcon,
  Paperclip,
  Trash2,
  Download,
  Eye,
  Loader2,
  Code2,
  FileCode,
  FunctionSquare,
  Activity,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";

// Limites de tamanho (em MB)
const FILE_SIZE_LIMITS = {
  image: 5,
  video: 50,
  audio: 16,
  file: 100
};

export default function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("kanban");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(null);
  const [isOpeningModal, setIsOpeningModal] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('taskboard_visible_columns');
    return saved ? JSON.parse(saved) : {
      routines: true,
      ideas: true,
      pre_backlog: true,
      backlog: true,
      in_progress: true,
      staging: true,
      completed: true,
    };
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "task",
    priority: "medium",
    status: "ideas",
    estimated_hours: "",
    assigned_to: "",
    related_page: "",
    related_component: "",
    related_function: "",
    tags: [],
    attachments: [],
  });

  // Lista de páginas, componentes e funções do projeto
  const projectPages = [
    "Dashboard", "Contacts", "Team", "FirstLogin", "CompanyRegistration", 
    "ForgotPassword", "CompanySetup", "AcceptInvitation", "RolePermissions",
    "Sessions", "MessageTemplates", "History", "Scheduler", "Campaign", "Tags",
    "Tutorial", "Plans", "ProfileSettings", "Documentation", "FAQ", "ContactSupport",
    "SupportTickets", "GlobalSearch", "Notifications", "Reports", "UserPreferences",
    "CampaignHistory", "WhatsAppChat", "TargetAudience", "SystemLogs", "Billing",
    "PlansCatalog", "PlansAdmin", "SubscriptionsAdmin", "OffersAdmin", "TaskBoard",
    "Customers"
  ];

  const projectComponents = [
    "dashboard/StatsOverview", "dashboard/RecentActivity", "dashboard/TopContacts",
    "dashboard/CampaignPerformance", "dashboard/DashboardCard", "dashboard/AddCardModal",
    "dashboard/DashboardCardEditor", "contacts/ContactFilters", "contacts/ContactForm",
    "contacts/ContactCard", "contacts/ContactImportModal", "contacts/ContactDetailsModal",
    "contacts/ContactChatModal", "contacts/ContactFormSidebar", "contacts/ContactFormModal",
    "contacts/BulkDeleteModal", "contacts/ImportProgressModal", "contacts/DuplicateContactModal",
    "contacts/ContactReviewStep", "contacts/BulkDeleteProgressModal", "contacts/ContactHistoryModal",
    "team/TeamMembers", "team/RoleManagement", "team/CreateRoleForm", "team/InviteUserForm",
    "team/EditUserForm", "templates/TemplateCard", "templates/TemplateForm",
    "templates/TemplatePreviewModal", "templates/TemplateVariableHelper", "templates/TemplateHistoryModal",
    "templates/TemplateFormSidebar", "templates/TemplateDetailsSidebar", "templates/TemplateFormModal",
    "templates/TemplateDetailsModal", "messages/MessageDetailsModal", "messages/ResendMessageModal",
    "messages/ScheduleMessageModal", "scheduler/ScheduleMessageForm", "scheduler/ScheduledMessageDetails",
    "scheduler/ScheduleFormSidebar", "scheduler/ScheduleFormModal", "scheduler/ScheduleDetailsModal",
    "scheduler/RecipientDetailsModal", "scheduler/SyncProgressModal", "campaigns/CampaignForm",
    "campaigns/CampaignDetails", "campaigns/CampaignFormSidebar", "campaigns/CampaignDetailsSidebar",
    "campaigns/CampaignHistorySidebar", "campaigns/CampaignFormModal", "campaigns/CampaignDetailsModal",
    "campaigns/CampaignHistoryModal", "tags/TagForm", "tags/TagDetails", "tags/SmartTagRules",
    "tags/SmartTagRulesSidebar", "tags/TagFormModal", "tags/TagDetailsModal", "tags/SmartTagRulesModal",
    "reports/ReportBuilder", "reports/SavedReports", "reports/ReportTemplates", "reports/ReportPreview",
    "sessions/ConnectSessionModal", "logs/LogDetailsModal", "chat/MessageBubble", "AtenaChat",
    "plans/PlanFormModal", "plans/PlanDetailsModal", "plans/CustomPlanModal", "plans/UpgradeButton",
    "plans/SubscriptionStatus", "billing/InvoiceCard", "billing/InvoiceDetailsModal", "ui/banner"
  ];

  const projectFunctions = [
    "acceptInvitation", "inviteTeamMember", "createWhatsAppSession", "getSessionStatus",
    "updateSession", "startSession", "stopSession", "restartSession", "logoutSession",
    "deleteSession", "getSessionQR", "requestPairingCode", "getWaProfile", "sendText",
    "sendImage", "sendFile", "sendVideo", "sendVoice", "applySmartTags",
    "processSmartTagsBackgroundJob", "processScheduledMessage", "createSchedule",
    "importContacts", "getContactFilterOptions", "getFilteredContacts", "bulkDeleteContacts",
    "importContactsAsync", "getImportStatus", "createSystemLog", "lookupAddressByCep",
    "parseUploadedFile", "createSingleContact", "getBatchImportProgress", "retryFailedContacts",
    "processCampaignMessages", "checkContactDuplicates", "saveContact", "handleWahaWebhook",
    "sendWebSocketUpdate", "listWahaSessions", "deleteScheduledMessages", "getSessionsDetails",
    "updateMessageByJobId", "getFilteredContactsByRules", "getPendingApprovals", "approveBatch",
    "denyBatch", "generateCampaignReport", "updateMessageCampaignCloudFlare", "cancelScheduledMessage",
    "cancelBatchMessages", "getCatalogPlans", "getCatalogFeatures", "getSubscriptionDetails",
    "createOffer", "acceptOffer", "updatePlanFeature", "createPlanVersion", "getTeamMembers",
    "checkPendingInvitation", "updateTeamMember", "createStripeCheckoutSession", "handleStripeWebhook",
    "getSubscriptionStatus", "getPendingSubscriptions", "cancelPendingSubscription",
    "syncCampaignMessages", "activateFreePlan", "upgradePlan", "upgradeSubscription",
    "sendBatchToCloudflare", "migrateContactTagsToIds", "updateSubscriptionPlan",
    "migratePlansToNew", "getFilteredContactsByCampaign", "initializeSystemTags",
    "applySystemTag", "processMessageErrors", "processSyncCampaignMessages", "checkCampaignStatus"
  ];

  useEffect(() => {
    loadUser();
    loadTasks();
    loadAdminUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, searchTerm, filterType, filterPriority, filterAssignee]);

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const allUsers = await User.filter({ role: 'admin' });
      setAdminUsers(allUsers);
    } catch (error) {
      console.error("Erro ao carregar usuários admin:", error);
    }
  };

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const allTasks = await Task.list("-created_date");
      setTasks(allTasks);
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    if (searchTerm) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter((task) => task.type === filterType);
    }

    if (filterPriority !== "all") {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    if (filterAssignee !== "all") {
      if (filterAssignee === "unassigned") {
        filtered = filtered.filter((task) => !task.assigned_to);
      } else {
        filtered = filtered.filter((task) => task.assigned_to === filterAssignee);
      }
    }

    setFilteredTasks(filtered);
  };

  const toggleColumnVisibility = (columnId) => {
    const newVisibleColumns = {
      ...visibleColumns,
      [columnId]: !visibleColumns[columnId]
    };
    setVisibleColumns(newVisibleColumns);
    localStorage.setItem('taskboard_visible_columns', JSON.stringify(newVisibleColumns));
  };

  const handleCreateTask = async () => {
    setIsOpeningModal(true);
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      type: "task",
      priority: "medium",
      status: "ideas",
      estimated_hours: "",
      assigned_to: "",
      related_page: "",
      related_component: "",
      related_function: "",
      tags: [],
      attachments: [],
    });
    
    // Simular pequeno delay para mostrar o spinner
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setShowTaskModal(true);
    setShowAttachmentPreview(null);
    setIsOpeningModal(false);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      type: task.type,
      priority: task.priority,
      status: task.status,
      estimated_hours: task.estimated_hours || "",
      assigned_to: task.assigned_to || "",
      related_page: task.related_page || "",
      related_component: task.related_component || "",
      related_function: task.related_function || "",
      tags: task.tags || [],
      attachments: task.attachments || [],
    });
    setShowTaskModal(true);
    setShowAttachmentPreview(null);
  };

  const handleFileUpload = async (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

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

      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, attachment]
      }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload do arquivo');
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const getAttachmentIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'file': return <FileIcon className="w-4 h-4" />;
      default: return <FileIcon className="w-4 h-4" />;
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
          <div className="rounded-xl overflow-hidden border border-gray-200 max-h-[400px]">
            <img 
              src={attachment.url} 
              alt={attachment.filename}
              className="w-full h-auto object-contain bg-gray-50"
            />
          </div>
        );

      case 'video':
        return (
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-black max-h-[400px]">
            <video 
              controls
              className="w-full max-h-[400px]"
              src={attachment.url}
            >
              Seu navegador não suporta a reprodução de vídeos.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="p-4 rounded-xl border border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
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
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <FileIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{attachment.filename}</p>
                <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
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
                  <Download className="w-4 h-4 mr-2" />
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

  const handleSaveTask = async () => {
    setIsSavingTask(true);
    try {
      const taskData = {
        ...formData,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      };

      if (editingTask) {
        if (taskData.status === "in_progress" && !editingTask.started_at) {
          taskData.started_at = new Date().toISOString();
        }
        if (taskData.status === "completed" && !editingTask.completed_at) {
          taskData.completed_at = new Date().toISOString();
        }

        // Se mudou o responsável, atualizar assigned_by e assigned_at
        if (taskData.assigned_to && taskData.assigned_to !== editingTask.assigned_to) {
          taskData.assigned_by = user.id;
          taskData.assigned_at = new Date().toISOString();
        }

        await Task.update(editingTask.id, taskData);
      } else {
        taskData.assigned_by = user.id;
        taskData.assigned_at = new Date().toISOString();
        await Task.create(taskData);
      }

      await loadTasks();
      setShowTaskModal(false);
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Tem certeza que deseja deletar esta tarefa?")) return;
    
    setIsSavingTask(true);
    try {
      await Task.delete(taskId);
      await loadTasks();
      setShowTaskModal(false);
    } catch (error) {
      console.error("Erro ao deletar tarefa:", error);
      alert("Erro ao deletar tarefa");
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;

    const newStatus = destination.droppableId;
    const updateData = { status: newStatus };

    if (newStatus === "in_progress" && !task.started_at) {
      updateData.started_at = new Date().toISOString();
    }
    if (newStatus === "completed" && !task.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    try {
      await Task.update(task.id, updateData);
      await loadTasks();
    } catch (error) {
      console.error("Erro ao mover tarefa:", error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "bug":
        return <Bug className="w-4 h-4" />;
      case "improvement":
        return <Lightbulb className="w-4 h-4" />;
      case "feature":
        return <Zap className="w-4 h-4" />;
      default:
        return <CheckSquare className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "bug":
        return "bg-red-100 text-red-700 border-red-200";
      case "improvement":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "feature":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      bug: "Bug",
      improvement: "Melhoria",
      feature: "Feature",
      task: "Tarefa",
    };
    return labels[type] || type;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      urgent: "Urgente",
      high: "Alta",
      medium: "Média",
      low: "Baixa",
    };
    return labels[priority] || priority;
  };

  const getStatusLabel = (status) => {
    const labels = {
      routines: "Rotinas",
      ideas: "Ideias",
      pre_backlog: "Pré Backlog",
      backlog: "Backlog",
      in_progress: "Em Progresso",
      staging: "Homologação",
      completed: "Concluído",
    };
    return labels[status] || status;
  };

  const getUserName = (userId) => {
    const assignedUser = adminUsers.find(u => u.id === userId);
    return assignedUser?.full_name || "Não atribuído";
  };

  const getUserInitials = (userId) => {
    const assignedUser = adminUsers.find(u => u.id === userId);
    if (!assignedUser) return "?";
    return assignedUser.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || "U";
  };

  const columns = [
    { id: "routines", title: "Rotinas", icon: Archive, color: "text-slate-600" },
    { id: "ideas", title: "Ideias", icon: Brain, color: "text-purple-600" },
    { id: "pre_backlog", title: "Pré Backlog", icon: PackagePlus, color: "text-indigo-600" },
    { id: "backlog", title: "Backlog", icon: Clock, color: "text-gray-600" },
    { id: "in_progress", title: "Em Progresso", icon: PlayCircle, color: "text-blue-600" },
    { id: "staging", title: "Homologação", icon: TestTube, color: "text-orange-600" },
    { id: "completed", title: "Concluído", icon: CheckCircle, color: "text-green-600" },
  ];

  const getColumnTasks = (status) => {
    return filteredTasks.filter((task) => task.status === status);
  };

  const renderTaskCard = (task, index, isDragging = false) => {
    const assignedUser = adminUsers.find(u => u.id === task.assigned_to);
    const hasAttachments = task.attachments && task.attachments.length > 0;
    const hasRelatedCode = task.related_page || task.related_component || task.related_function;
    
    return (
      <Card
        className={`rounded-2xl border-gray-200 cursor-pointer hover:shadow-md transition-shadow ${
          isDragging ? "shadow-lg" : ""
        }`}
        onClick={() => handleEditTask(task)}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Type and Priority */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs ${getTypeColor(task.type)}`}>
                {getTypeIcon(task.type)}
                <span className="ml-1">{getTypeLabel(task.type)}</span>
              </Badge>
              <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                {getPriorityLabel(task.priority)}
              </Badge>
              {hasAttachments && (
                <Badge variant="outline" className="text-xs">
                  <Paperclip className="w-3 h-3 mr-1" />
                  {task.attachments.length}
                </Badge>
              )}
              {hasRelatedCode && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  <Code2 className="w-3 h-3 mr-1" />
                  Código
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-gray-900 line-clamp-2">
              {task.title}
            </h3>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Related Code */}
            {hasRelatedCode && (
              <div className="space-y-1 text-xs">
                {task.related_page && (
                  <div className="flex items-center gap-1 text-purple-700">
                    <FileCode className="w-3 h-3" />
                    <span className="truncate">{task.related_page}</span>
                  </div>
                )}
                {task.related_component && (
                  <div className="flex items-center gap-1 text-blue-700">
                    <Code2 className="w-3 h-3" />
                    <span className="truncate">{task.related_component}</span>
                  </div>
                )}
                {task.related_function && (
                  <div className="flex items-center gap-1 text-green-700">
                    <FunctionSquare className="w-3 h-3" />
                    <span className="truncate">{task.related_function}</span>
                  </div>
                )}
              </div>
            )}

            {/* Attachment Thumbnails */}
            {hasAttachments && (
              <div className="flex gap-2 overflow-x-auto">
                {task.attachments.slice(0, 3).map((attachment, idx) => (
                  <div key={idx} className="flex-shrink-0">
                    {attachment.type === 'image' ? (
                      <img 
                        src={attachment.url} 
                        alt={attachment.filename}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                        {getAttachmentIcon(attachment.type)}
                      </div>
                    )}
                  </div>
                ))}
                {task.attachments.length > 3 && (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-xs text-gray-600">
                    +{task.attachments.length - 3}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {task.estimated_hours && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.estimated_hours}h
                  </span>
                )}
                {task.started_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(task.started_at), "dd/MM", { locale: ptBR })}
                  </span>
                )}
              </div>

              {task.assigned_to && assignedUser && (
                <Avatar className="w-6 h-6">
                  <AvatarImage src={assignedUser.avatar_url} />
                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                    {getUserInitials(task.assigned_to)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderListItem = (task) => {
    const assignedUser = adminUsers.find(u => u.id === task.assigned_to);
    const hasAttachments = task.attachments && task.attachments.length > 0;
    const hasRelatedCode = task.related_page || task.related_component || task.related_function;
    
    return (
      <Card
        key={task.id}
        className="rounded-2xl border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleEditTask(task)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(task.type)}`}>
              {getTypeIcon(task.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
                <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                  {getPriorityLabel(task.priority)}
                </Badge>
                {hasAttachments && (
                  <Badge variant="outline" className="text-xs">
                    <Paperclip className="w-3 h-3 mr-1" />
                    {task.attachments.length}
                  </Badge>
                )}
                {hasRelatedCode && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                    <Code2 className="w-3 h-3 mr-1" />
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="truncate">{task.description || "Sem descrição"}</span>
                {task.related_page && (
                  <span className="flex items-center gap-1 text-xs text-purple-700">
                    <FileCode className="w-3 h-3" />
                    {task.related_page}
                  </span>
                )}
              </div>
            </div>

            <Badge variant="outline" className="text-xs">
              {getStatusLabel(task.status)}
            </Badge>

            {task.estimated_hours && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                {task.estimated_hours}h
              </div>
            )}

            {task.assigned_to && assignedUser ? (
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={assignedUser.avatar_url} />
                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                    {getUserInitials(task.assigned_to)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">{assignedUser.full_name}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-400">Não atribuído</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load on TaskBoard page');
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Ctext x="50%25" y="50%25" font-size="24" text-anchor="middle" dominant-baseline="middle"%3ESS%3C/text%3E%3C/svg%3E';
              }}
            />
            <div className="shine-effect"></div>
          </div>
          <style>
            {`
              @keyframes shine {
                0% {
                  transform: translateX(-100%) translateY(100%) rotate(-45deg);
                  opacity: 0;
                }
                50% {
                  opacity: 1;
                }
                100% {
                  transform: translateX(100%) translateY(-100%) rotate(-45deg);
                  opacity: 0;
                }
              }
              .shine-effect {
                position: absolute;
                top: -50%;
                left: -50%;
                width: 250%;
                height: 250%;
                background: linear-gradient(
                  to right,
                  rgba(255, 255, 255, 0) 0%,
                  rgba(255, 255, 255, 0) 20%,
                  rgba(255, 255, 255, 0.8) 50%,
                  rgba(255, 255, 255, 0) 80%,
                  rgba(255, 255, 255, 0) 100%
                );
                animation: shine 2.5s ease-in-out infinite;
                pointer-events: none;
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Tarefas</h1>
          <p className="text-sm text-gray-600">
            Organize melhorias, bugs e features
          </p>
        </div>
        <Button
          onClick={handleCreateTask}
          disabled={isOpeningModal}
          className="bg-blue-600 hover:bg-blue-700 rounded-xl ml-auto"
        >
          {isOpeningModal ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Abrindo...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </>
          )}
        </Button>
      </div>

      {/* Filters and Controls */}
      <Card className="rounded-2xl border-gray-200">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl w-full"
                />
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="improvement">Melhoria</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="task">Tarefa</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-full sm:w-[140px] rounded-xl">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unassigned">Não atribuído</SelectItem>
                  {adminUsers.map(adminUser => (
                    <SelectItem key={adminUser.id} value={adminUser.id}>
                      {adminUser.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchTerm || filterType !== "all" || filterPriority !== "all" || filterAssignee !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterType("all");
                    setFilterPriority("all");
                    setFilterAssignee("all");
                  }}
                  className="rounded-xl w-full sm:w-auto"
                >
                  <X className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={viewMode === "kanban" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("kanban")}
                className={`rounded-xl flex-1 sm:flex-none ${viewMode === "kanban" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              >
                <LayoutGrid className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Kanban</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-xl flex-1 sm:flex-none ${viewMode === "list" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              >
                <List className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Lista</span>
              </Button>

              {viewMode === "kanban" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl">
                    <div className="px-2 py-1.5 text-sm font-semibold">Colunas Visíveis</div>
                    <DropdownMenuSeparator />
                    {columns.map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={visibleColumns[column.id]}
                        onCheckedChange={() => toggleColumnVisibility(column.id)}
                      >
                        {column.title}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      {viewMode === "kanban" && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div 
              className="inline-flex md:grid gap-4 md:gap-6 pb-4 md:pb-0"
              style={{
                minWidth: 'fit-content',
                gridTemplateColumns: window.innerWidth >= 768 
                  ? `repeat(${Object.values(visibleColumns).filter(Boolean).length}, minmax(280px, 1fr))` 
                  : undefined
              }}
            >
              {columns.filter(col => visibleColumns[col.id]).map((column) => {
                const ColumnIcon = column.icon;
                const columnTasks = getColumnTasks(column.id);

                return (
                  <div key={column.id} className="flex flex-col w-[280px] md:w-auto">
                    <div className="flex items-center gap-2 mb-4">
                      <ColumnIcon className={`w-5 h-5 ${column.color}`} />
                      <h2 className="font-semibold text-gray-900 text-sm md:text-base">{column.title}</h2>
                      <Badge 
                        variant="outline" 
                        className="ml-auto text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (columnTasks.length > 0 && window.confirm(`Deletar todas as ${columnTasks.length} tarefas em ${column.title}?`)) {
                            for (const task of columnTasks) {
                              try {
                                await Task.delete(task.id);
                              } catch (error) {
                                console.error("Erro ao deletar tarefa:", error);
                              }
                            }
                            await loadTasks();
                          }
                        }}
                      >
                        {columnTasks.length}
                      </Badge>
                    </div>

                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 space-y-3 p-3 md:p-4 rounded-2xl transition-colors ${
                            snapshot.isDraggingOver ? "bg-gray-100" : "bg-gray-50"
                          }`}
                          style={{ minHeight: "400px" }}
                        >
                          {columnTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  {renderTaskCard(task, index, snapshot.isDragging)}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {filteredTasks.map((task) => renderListItem(task))}
          {filteredTasks.length === 0 && (
            <Card className="rounded-3xl border-gray-200">
              <CardContent className="text-center py-16">
                <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhuma tarefa encontrada
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filterType !== "all" || filterPriority !== "all" || filterAssignee !== "all" 
                    ? "Tente ajustar os filtros" 
                    : "Comece criando sua primeira tarefa"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título da tarefa..."
                className="rounded-xl mt-1"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva a tarefa..."
                className="rounded-xl mt-1 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="improvement">Melhoria</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routines">Rotinas</SelectItem>
                    <SelectItem value="ideas">Ideias</SelectItem>
                    <SelectItem value="pre_backlog">Pré Backlog</SelectItem>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="staging">Homologação</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Responsável</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Não atribuído</SelectItem>
                    {adminUsers.map(adminUser => (
                      <SelectItem key={adminUser.id} value={adminUser.id}>
                        {adminUser.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Localização do Bug/Melhoria */}
            <div className="p-4 bg-purple-50 rounded-2xl border-2 border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                Localização no Código
              </h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-purple-900">Página</Label>
                  <Select
                    value={formData.related_page}
                    onValueChange={(value) => setFormData({ ...formData, related_page: value })}
                  >
                    <SelectTrigger className="rounded-xl mt-1 bg-white">
                      <SelectValue placeholder="Selecione uma página..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value={null}>Nenhuma</SelectItem>
                      {projectPages.map(page => (
                        <SelectItem key={page} value={page}>
                          <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-purple-600" />
                            {page}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-purple-900">Componente</Label>
                  <Select
                    value={formData.related_component}
                    onValueChange={(value) => setFormData({ ...formData, related_component: value })}
                  >
                    <SelectTrigger className="rounded-xl mt-1 bg-white">
                      <SelectValue placeholder="Selecione um componente..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value={null}>Nenhum</SelectItem>
                      {projectComponents.map(component => (
                        <SelectItem key={component} value={component}>
                          <div className="flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-blue-600" />
                            {component}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-purple-900">Função</Label>
                  <Select
                    value={formData.related_function}
                    onValueChange={(value) => setFormData({ ...formData, related_function: value })}
                  >
                    <SelectTrigger className="rounded-xl mt-1 bg-white">
                      <SelectValue placeholder="Selecione uma função..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value={null}>Nenhuma</SelectItem>
                      {projectFunctions.map(func => (
                        <SelectItem key={func} value={func}>
                          <div className="flex items-center gap-2">
                            <FunctionSquare className="w-4 h-4 text-green-600" />
                            {func}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label>Tempo Estimado (horas)</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_hours: e.target.value })
                }
                placeholder="Ex: 2.5"
                className="rounded-xl mt-1"
              />
            </div>

            {/* Atribuído por - Read Only */}
            {editingTask?.assigned_by && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <Label className="text-xs font-medium text-gray-600 mb-2 block">Atribuído por</Label>
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={adminUsers.find(u => u.id === editingTask.assigned_by)?.avatar_url} />
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      {getUserInitials(editingTask.assigned_by)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {getUserName(editingTask.assigned_by)}
                    </div>
                    {editingTask.assigned_at && (
                      <div className="text-xs text-gray-500">
                        {format(new Date(editingTask.assigned_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Data de criação - Read Only */}
            {editingTask?.created_date && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <Label className="text-xs font-medium text-gray-600 mb-1 block">Criado em</Label>
                <div className="text-sm text-gray-900">
                  {format(new Date(editingTask.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            )}

            {/* Attachments Section */}
            <div>
              <Label className="mb-2 block">Anexos</Label>
              
              {/* Upload Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                  <label htmlFor="image-upload">
                    <div className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl transition-colors ${
                      uploadingFile 
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
                    disabled={uploadingFile}
                  />
                  <label htmlFor="video-upload">
                    <div className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl transition-colors ${
                      uploadingFile 
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
                  <input
                    type="file"
                    id="audio-upload"
                    accept="audio/*"
                    onChange={(e) => handleFileUpload(e, 'audio')}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                  <label htmlFor="audio-upload">
                    <div className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl transition-colors ${
                      uploadingFile 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-gray-50 cursor-pointer hover:border-blue-300'
                    }`}>
                      <Music className="w-6 h-6 text-blue-600" />
                      <span className="text-xs font-medium">Áudio</span>
                      <span className="text-xs text-gray-500">Até {FILE_SIZE_LIMITS.audio}MB</span>
                    </div>
                  </label>
                </div>

                <div>
                  <input
                    type="file"
                    id="file-upload"
                    onChange={(e) => handleFileUpload(e, 'file')}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                  <label htmlFor="file-upload">
                    <div className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl transition-colors ${
                      uploadingFile 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-gray-50 cursor-pointer hover:border-blue-300'
                    }`}>
                      <FileIcon className="w-6 h-6 text-blue-600" />
                      <span className="text-xs font-medium">Arquivo</span>
                      <span className="text-xs text-gray-500">Até {FILE_SIZE_LIMITS.file}MB</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Loading State */}
              {uploadingFile && (
                <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-xl mb-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Fazendo upload...</span>
                </div>
              )}

              {/* Attachments List */}
              {formData.attachments.length > 0 && (
                <div className="space-y-2">
                  {formData.attachments.map((attachment, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAttachmentPreview(showAttachmentPreview === index ? null : index);
                              }}
                              className="rounded-xl"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              {showAttachmentPreview === index ? 'Ocultar' : 'Ver'}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAttachment(index);
                            }}
                            className="hover:bg-red-100 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>

                      {/* Preview */}
                      {showAttachmentPreview === index && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                          {renderAttachmentPreview(attachment)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {editingTask && (
              <div className="grid grid-cols-2 gap-4">
                {editingTask.started_at && (
                  <div>
                    <Label>Iniciado em</Label>
                    <Input
                      value={format(new Date(editingTask.started_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                      disabled
                      className="rounded-xl mt-1 bg-gray-50"
                    />
                  </div>
                )}
                {editingTask.completed_at && (
                  <div>
                    <Label>Concluído em</Label>
                    <Input
                      value={format(new Date(editingTask.completed_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                      disabled
                      className="rounded-xl mt-1 bg-gray-50"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3">
            {editingTask && (
              <Button
                variant="outline"
                onClick={() => handleDeleteTask(editingTask.id)}
                disabled={isSavingTask}
                className="rounded-xl text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button
                variant="outline"
                onClick={() => setShowTaskModal(false)}
                disabled={isSavingTask}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveTask}
                disabled={!formData.title || isSavingTask}
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                {isSavingTask ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingTask ? "Atualizando..." : "Criando..."}
                  </>
                ) : (
                  editingTask ? "Atualizar" : "Criar Tarefa"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
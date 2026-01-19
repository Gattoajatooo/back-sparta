import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { Contact } from "@/entities/Contact";
import { Campaign } from "@/entities/Campaign";
import { Communication } from "@/entities/Communication";
import { Activity } from "@/entities/Activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Plus,
  Search,
  Filter,
  Download,
  Save,
  Edit,
  Trash2,
  Eye,
  Copy,
  Settings,
  Database,
  Calendar,
  Users,
  MessageSquare,
  Activity as ActivityIcon,
  FileText,
  PieChart,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";

import ReportBuilder from "../components/reports/ReportBuilder";
import SavedReports from "../components/reports/SavedReports";
import ReportTemplates from "../components/reports/ReportTemplates";
import ReportPreview from "../components/reports/ReportPreview";

export default function Reports() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("builder");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Report Builder States
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [reportPreview, setReportPreview] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  
  // Sample data for available data sources
  const [dataSources] = useState([
    {
      id: "contacts",
      name: "Contacts",
      icon: Users,
      color: "text-blue-600 bg-blue-50",
      description: "Customer and prospect information",
      fields: [
        { id: "first_name", name: "First Name", type: "text", category: "basic" },
        { id: "last_name", name: "Last Name", type: "text", category: "basic" },
        { id: "email", name: "Email", type: "email", category: "basic" },
        { id: "phone", name: "Phone", type: "text", category: "basic" },
        { id: "company_name", name: "Company", type: "text", category: "basic" },
        { id: "status", name: "Status", type: "select", category: "basic", options: ["lead", "prospect", "customer", "churned"] },
        { id: "source", name: "Source", type: "select", category: "basic", options: ["website", "referral", "social_media", "email_campaign"] },
        { id: "value", name: "Value", type: "number", category: "financial" },
        { id: "created_date", name: "Created Date", type: "date", category: "dates" },
        { id: "last_contact_date", name: "Last Contact", type: "date", category: "dates" },
        { id: "tags", name: "Tags", type: "array", category: "classification" }
      ],
      relationships: ["communications", "activities", "campaigns"]
    },
    {
      id: "communications",
      name: "Communications",
      icon: MessageSquare,
      color: "text-green-600 bg-green-50",
      description: "Messages, emails, and communication history",
      fields: [
        { id: "type", name: "Type", type: "select", category: "basic", options: ["email", "whatsapp", "sms", "voice_call"] },
        { id: "direction", name: "Direction", type: "select", category: "basic", options: ["inbound", "outbound"] },
        { id: "subject", name: "Subject", type: "text", category: "basic" },
        { id: "status", name: "Status", type: "select", category: "basic", options: ["sent", "delivered", "opened", "clicked", "replied", "failed"] },
        { id: "sent_date", name: "Sent Date", type: "date", category: "dates" },
        { id: "delivered_date", name: "Delivered Date", type: "date", category: "dates" },
        { id: "opened_date", name: "Opened Date", type: "date", category: "dates" },
        { id: "cost", name: "Cost", type: "number", category: "financial" },
        { id: "customer_id", name: "Customer ID", type: "text", category: "relations" },
        { id: "campaign_id", name: "Campaign ID", type: "text", category: "relations" }
      ],
      relationships: ["contacts", "campaigns"]
    },
    {
      id: "campaigns",
      name: "Campaigns",
      icon: BarChart3,
      color: "text-purple-600 bg-purple-50",
      description: "Marketing campaign data and metrics",
      fields: [
        { id: "name", name: "Campaign Name", type: "text", category: "basic" },
        { id: "type", name: "Type", type: "select", category: "basic", options: ["email", "whatsapp", "sms", "voice", "mixed"] },
        { id: "status", name: "Status", type: "select", category: "basic", options: ["draft", "running", "paused", "completed", "cancelled"] },
        { id: "budget", name: "Budget", type: "number", category: "financial" },
        { id: "start_date", name: "Start Date", type: "date", category: "dates" },
        { id: "end_date", name: "End Date", type: "date", category: "dates" },
        { id: "total_recipients", name: "Total Recipients", type: "number", category: "metrics" },
        { id: "messages_sent", name: "Messages Sent", type: "number", category: "metrics" },
        { id: "messages_delivered", name: "Messages Delivered", type: "number", category: "metrics" },
        { id: "messages_opened", name: "Messages Opened", type: "number", category: "metrics" },
        { id: "cost", name: "Total Cost", type: "number", category: "financial" }
      ],
      relationships: ["contacts", "communications"]
    },
    {
      id: "activities",
      name: "Activities",
      icon: ActivityIcon,
      color: "text-orange-600 bg-orange-50",
      description: "User activities and interactions",
      fields: [
        { id: "type", name: "Activity Type", type: "select", category: "basic", options: ["call", "email", "meeting", "note", "task", "follow_up"] },
        { id: "subject", name: "Subject", type: "text", category: "basic" },
        { id: "status", name: "Status", type: "select", category: "basic", options: ["completed", "pending", "cancelled"] },
        { id: "duration", name: "Duration (min)", type: "number", category: "metrics" },
        { id: "created_date", name: "Created Date", type: "date", category: "dates" },
        { id: "due_date", name: "Due Date", type: "date", category: "dates" },
        { id: "contact_id", name: "Contact ID", type: "text", category: "relations" },
        { id: "user_id", name: "User ID", type: "text", category: "relations" }
      ],
      relationships: ["contacts"]
    }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser?.role !== 'admin') {
        setIsLoading(false);
        return;
      }

      if (currentUser.company_id) {
        const companies = await Company.list();
        const userCompany = companies.find(c => c.id === currentUser.company_id);
        setCompany(userCompany);

        // Load saved reports from localStorage for now (in real app, would be from database)
        const saved = localStorage.getItem(`reports_${currentUser.company_id}`);
        if (saved) {
          setSavedReports(JSON.parse(saved));
        }
      }
    } catch (error) {
      console.error("Error loading reports data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReport = () => {
    setEditingReport(null);
    setShowBuilder(true);
  };

  const handleEditReport = (report) => {
    setEditingReport(report);
    setShowBuilder(true);
  };

  const handleSaveReport = (reportData) => {
    const reportToSave = {
      id: editingReport?.id || Date.now().toString(),
      ...reportData,
      created_date: editingReport?.created_date || new Date().toISOString(),
      updated_date: new Date().toISOString(),
      created_by: user.email
    };

    let updatedReports;
    if (editingReport) {
      updatedReports = savedReports.map(r => r.id === editingReport.id ? reportToSave : r);
    } else {
      updatedReports = [...savedReports, reportToSave];
    }

    setSavedReports(updatedReports);
    localStorage.setItem(`reports_${user.company_id}`, JSON.stringify(updatedReports));
    setShowBuilder(false);
    setEditingReport(null);
  };

  const handleDeleteReport = (reportId) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      const updatedReports = savedReports.filter(r => r.id !== reportId);
      setSavedReports(updatedReports);
      localStorage.setItem(`reports_${user.company_id}`, JSON.stringify(updatedReports));
    }
  };

  const handlePreviewReport = (report) => {
    setReportPreview(report);
  };

  const filteredReports = savedReports.filter(report =>
    !searchTerm || 
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="rounded-3xl border-red-200 max-w-md">
          <CardContent className="text-center p-8">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h3>
            <p className="text-gray-500">
              Apenas administradores podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Reports</h1>
          <p className="text-gray-600">
            Create, save and manage custom reports tailored to your business needs
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{savedReports.length}</p>
                <p className="text-sm text-gray-500">Saved Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center">
                <Database className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{dataSources.length}</p>
                <p className="text-sm text-gray-500">Data Sources</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center">
                <PieChart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-sm text-gray-500">Report Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">8</p>
                <p className="text-sm text-gray-500">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-3 rounded-2xl bg-gray-100 p-1">
            <TabsTrigger value="builder" className="rounded-xl">
              Report Builder
            </TabsTrigger>
            <TabsTrigger value="saved" className="rounded-xl">
              Saved Reports ({savedReports.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="rounded-xl">
              Templates
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-3">
            {activeTab === "saved" && (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 rounded-2xl border-gray-200"
                />
              </div>
            )}
            
            <Button
              onClick={handleCreateReport}
              className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </div>
        </div>

        <TabsContent value="builder" className="space-y-6">
          {showBuilder ? (
            <ReportBuilder
              dataSources={dataSources}
              editingReport={editingReport}
              onSave={handleSaveReport}
              onCancel={() => {
                setShowBuilder(false);
                setEditingReport(null);
              }}
            />
          ) : (
            <Card className="rounded-3xl border-gray-200">
              <CardContent className="text-center py-16">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Build Custom Reports
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Create powerful reports by combining data from multiple sources. 
                  Define filters, relationships, and visualizations to get exactly the insights you need.
                </p>
                <Button
                  onClick={handleCreateReport}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start Building
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-6">
          <SavedReports
            reports={filteredReports}
            onEdit={handleEditReport}
            onDelete={handleDeleteReport}
            onPreview={handlePreviewReport}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <ReportTemplates
            dataSources={dataSources}
            onUseTemplate={(template) => {
              setEditingReport(template);
              setShowBuilder(true);
              setActiveTab("builder");
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Report Preview Modal */}
      {reportPreview && (
        <ReportPreview
          report={reportPreview}
          dataSources={dataSources}
          onClose={() => setReportPreview(null)}
        />
      )}
    </div>
  );
}
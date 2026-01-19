import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  MoreVertical,
  Edit,
  Eye,
  Copy,
  Download,
  Trash2,
  Calendar,
  Database,
  Filter,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";

export default function SavedReports({ reports, onEdit, onDelete, onPreview }) {
  const handleDuplicateReport = (report) => {
    const duplicatedReport = {
      ...report,
      id: undefined,
      name: `${report.name} (Copy)`,
      created_date: undefined,
      updated_date: undefined
    };
    onEdit(duplicatedReport);
  };

  const handleExportReport = (report) => {
    // In a real implementation, this would generate and download the report
    console.log("Exporting report:", report.name);
    alert("Report export functionality would be implemented here");
  };

  if (reports.length === 0) {
    return (
      <Card className="rounded-3xl border-gray-200">
        <CardContent className="text-center py-16">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Saved Reports
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            You haven't created any custom reports yet. Use the Report Builder to create your first report.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reports.map((report) => (
        <Card key={report.id} className="rounded-3xl border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                  {report.name}
                </CardTitle>
                {report.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {report.description}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl">
                  <DropdownMenuItem
                    onClick={() => onPreview(report)}
                    className="rounded-xl"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onEdit(report)}
                    className="rounded-xl"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDuplicateReport(report)}
                    className="rounded-xl"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportReport(report)}
                    className="rounded-xl"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(report.id)}
                    className="rounded-xl text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Report Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Database className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">
                    {report.dataSources?.length || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Sources</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">
                    {report.fields?.length || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Fields</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">
                    {report.filters?.length || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Filters</p>
              </div>
            </div>

            {/* Data Sources */}
            {report.dataSources && report.dataSources.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Data Sources:</p>
                <div className="flex flex-wrap gap-1">
                  {report.dataSources.slice(0, 3).map((sourceId) => (
                    <Badge key={sourceId} variant="outline" className="text-xs rounded-full capitalize">
                      {sourceId}
                    </Badge>
                  ))}
                  {report.dataSources.length > 3 && (
                    <Badge variant="outline" className="text-xs rounded-full">
                      +{report.dataSources.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Created Info */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                    {report.created_by?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-500">
                  {report.created_by?.split('@')[0] || 'Unknown'}
                </span>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                {report.updated_date 
                  ? format(new Date(report.updated_date), 'MMM d')
                  : format(new Date(report.created_date), 'MMM d')
                }
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreview(report)}
                className="flex-1 rounded-xl"
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(report)}
                className="flex-1 rounded-xl"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
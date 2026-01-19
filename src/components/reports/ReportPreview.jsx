import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  X,
  Download,
  Printer,
  RefreshCw,
  Database,
  Filter,
  BarChart3,
  Eye,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

export default function ReportPreview({ report, dataSources, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (report) {
      generatePreviewData();
    }
  }, [report]);

  const generatePreviewData = async () => {
    setIsGenerating(true);
    
    // Simulate data generation delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate mock data based on report configuration
    const mockData = generateMockData(report);
    setReportData(mockData);
    setIsGenerating(false);
  };

  const generateMockData = (reportConfig) => {
    // This is a simplified mock data generator
    // In a real implementation, this would query the actual databases
    const numRows = Math.floor(Math.random() * 50) + 10;
    const data = [];

    for (let i = 0; i < numRows; i++) {
      const row = {};
      reportConfig.fields.forEach(field => {
        const [sourceId, fieldId] = field.fullId.split('.');
        const source = dataSources.find(ds => ds.id === sourceId);
        const fieldDef = source?.fields.find(f => f.id === fieldId);
        
        if (fieldDef) {
          row[field.fullId] = generateMockValue(fieldDef, i);
        }
      });
      data.push(row);
    }

    return data;
  };

  const generateMockValue = (fieldDef, index) => {
    switch (fieldDef.type) {
      case "text":
        if (fieldDef.id === "first_name") return ["John", "Jane", "Mike", "Sarah", "David", "Lisa"][index % 6];
        if (fieldDef.id === "last_name") return ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia"][index % 6];
        if (fieldDef.id === "email") return `user${index + 1}@example.com`;
        if (fieldDef.id === "company_name") return ["Acme Corp", "Tech Solutions", "Global Systems", "Digital Inc"][index % 4];
        return `Sample ${fieldDef.name} ${index + 1}`;
      
      case "select":
        if (fieldDef.options) return fieldDef.options[index % fieldDef.options.length];
        return "Unknown";
      
      case "number":
        if (fieldDef.id.includes("value") || fieldDef.id.includes("cost") || fieldDef.id.includes("budget")) {
          return Math.floor(Math.random() * 10000) + 100;
        }
        return Math.floor(Math.random() * 100) + 1;
      
      case "date":
        const now = new Date();
        const pastDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        return pastDate.toISOString().split('T')[0];
      
      case "email":
        return `user${index + 1}@example.com`;
      
      default:
        return `Sample ${index + 1}`;
    }
  };

  const handleExport = (format) => {
    console.log(`Exporting report in ${format} format`);
    // In a real implementation, this would generate and download the file
    alert(`Report would be exported as ${format.toUpperCase()}`);
  };

  const getFieldDisplayName = (fieldId) => {
    const field = report.fields.find(f => f.fullId === fieldId);
    return field?.display || fieldId;
  };

  return (
    <Dialog open={!!report} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] rounded-3xl">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {report?.name}
              </DialogTitle>
              {report?.description && (
                <p className="text-gray-600 mt-1">{report.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Database className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900">
                    {report?.dataSources?.length || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Data Sources</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Eye className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900">
                    {report?.fields?.length || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Fields</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900">
                    {report?.filters?.length || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Filters</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900">
                    {reportData?.length || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Records</p>
              </CardContent>
            </Card>
          </div>

          {/* Data Sources & Filters */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Data Sources</h4>
              <div className="flex flex-wrap gap-2">
                {report?.dataSources?.map((sourceId) => {
                  const source = dataSources.find(ds => ds.id === sourceId);
                  return (
                    <Badge key={sourceId} variant="outline" className="rounded-full capitalize">
                      {source?.name || sourceId}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Active Filters ({report?.filters?.length || 0})
              </h4>
              <div className="space-y-1">
                {report?.filters?.length > 0 ? (
                  report.filters.slice(0, 3).map((filter, index) => (
                    <p key={index} className="text-sm text-gray-600">
                      {getFieldDisplayName(filter.fieldId)} {filter.operator} {filter.value}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No filters applied</p>
                )}
                {report?.filters?.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{report.filters.length - 3} more filters
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              Generated on {format(new Date(), 'MMM d, yyyy HH:mm')}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => generatePreviewData()}
                disabled={isGenerating}
                className="rounded-2xl"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                className="rounded-2xl"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExport('csv')}
                className="rounded-2xl"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Report Data */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            {isGenerating ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
                <p className="text-gray-500">Generating report data...</p>
              </div>
            ) : reportData && reportData.length > 0 ? (
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      {report.fields.map((field) => (
                        <TableHead key={field.fullId} className="font-medium text-gray-900">
                          {field.display}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.slice(0, 20).map((row, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        {report.fields.map((field) => (
                          <TableCell key={field.fullId} className="text-gray-900">
                            {row[field.fullId] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {reportData.length > 20 && (
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500 text-center">
                      Showing first 20 of {reportData.length} records
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No data available</p>
                <p className="text-sm text-gray-400 mt-1">
                  Check your filters and data sources
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
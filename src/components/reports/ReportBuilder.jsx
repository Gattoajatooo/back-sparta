import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Database,
  Plus,
  X,
  Filter,
  Settings,
  Eye,
  Save,
  ArrowRight,
  Link,
  BarChart3,
  PieChart,
  LineChart,
  Table
} from "lucide-react";

export default function ReportBuilder({ dataSources, editingReport, onSave, onCancel }) {
  const [reportConfig, setReportConfig] = useState({
    name: "",
    description: "",
    dataSources: [],
    fields: [],
    filters: [],
    groupBy: [],
    orderBy: [],
    visualizations: [],
    relationships: []
  });

  const [activeStep, setActiveStep] = useState("datasources");
  const [availableFields, setAvailableFields] = useState([]);

  useEffect(() => {
    if (editingReport) {
      setReportConfig(editingReport);
    }
  }, [editingReport]);

  useEffect(() => {
    // Update available fields when data sources change
    const fields = [];
    reportConfig.dataSources.forEach(sourceId => {
      const source = dataSources.find(ds => ds.id === sourceId);
      if (source) {
        source.fields.forEach(field => {
          fields.push({
            ...field,
            sourceId: sourceId,
            sourceName: source.name,
            fullId: `${sourceId}.${field.id}`,
            display: `${source.name}.${field.name}`
          });
        });
      }
    });
    setAvailableFields(fields);
  }, [reportConfig.dataSources, dataSources]);

  const handleDataSourceToggle = (sourceId) => {
    const updatedSources = reportConfig.dataSources.includes(sourceId)
      ? reportConfig.dataSources.filter(id => id !== sourceId)
      : [...reportConfig.dataSources, sourceId];
    
    setReportConfig(prev => ({
      ...prev,
      dataSources: updatedSources,
      fields: prev.fields.filter(field => updatedSources.includes(field.sourceId)),
      filters: prev.filters.filter(filter => updatedSources.includes(filter.sourceId))
    }));
  };

  const handleFieldToggle = (field) => {
    const fieldExists = reportConfig.fields.some(f => f.fullId === field.fullId);
    const updatedFields = fieldExists
      ? reportConfig.fields.filter(f => f.fullId !== field.fullId)
      : [...reportConfig.fields, field];
    
    setReportConfig(prev => ({
      ...prev,
      fields: updatedFields
    }));
  };

  const handleAddFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      fieldId: "",
      operator: "equals",
      value: "",
      sourceId: ""
    };
    
    setReportConfig(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  };

  const handleRemoveFilter = (filterId) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }));
  };

  const handleFilterChange = (filterId, updates) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.map(f => 
        f.id === filterId ? { ...f, ...updates } : f
      )
    }));
  };

  const handleSave = () => {
    if (!reportConfig.name.trim()) {
      alert("Please enter a report name");
      return;
    }

    if (reportConfig.dataSources.length === 0) {
      alert("Please select at least one data source");
      return;
    }

    if (reportConfig.fields.length === 0) {
      alert("Please select at least one field");
      return;
    }

    onSave(reportConfig);
  };

  const getOperatorOptions = (fieldType) => {
    switch (fieldType) {
      case "number":
        return [
          { value: "equals", label: "Equals" },
          { value: "not_equals", label: "Not Equals" },
          { value: "greater_than", label: "Greater Than" },
          { value: "less_than", label: "Less Than" },
          { value: "between", label: "Between" }
        ];
      case "date":
        return [
          { value: "equals", label: "On Date" },
          { value: "after", label: "After" },
          { value: "before", label: "Before" },
          { value: "between", label: "Between" },
          { value: "last_7_days", label: "Last 7 Days" },
          { value: "last_30_days", label: "Last 30 Days" },
          { value: "this_month", label: "This Month" }
        ];
      case "select":
        return [
          { value: "equals", label: "Equals" },
          { value: "not_equals", label: "Not Equals" },
          { value: "in", label: "In List" }
        ];
      default:
        return [
          { value: "equals", label: "Equals" },
          { value: "not_equals", label: "Not Equals" },
          { value: "contains", label: "Contains" },
          { value: "starts_with", label: "Starts With" },
          { value: "ends_with", label: "Ends With" }
        ];
    }
  };

  const steps = [
    { id: "datasources", title: "Data Sources", icon: Database },
    { id: "fields", title: "Fields", icon: Table },
    { id: "filters", title: "Filters", icon: Filter },
    { id: "visualization", title: "Visualization", icon: BarChart3 },
    { id: "settings", title: "Settings", icon: Settings }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {editingReport ? 'Edit Report' : 'Create New Report'}
          </h2>
          <p className="text-gray-600">Build a custom report with multiple data sources</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="rounded-2xl">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl">
            <Save className="w-4 h-4 mr-2" />
            Save Report
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <Card className="rounded-2xl border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setActiveStep(step.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                    activeStep === step.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <step.icon className="w-4 h-4" />
                  <span className="font-medium">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-3">
          <Card className="rounded-3xl border-gray-200">
            <CardContent className="p-6">
              {activeStep === "datasources" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Select Data Sources
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Choose which data sources to include in your report. You can combine multiple sources if they have relationships.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {dataSources.map((source) => (
                      <div
                        key={source.id}
                        onClick={() => handleDataSourceToggle(source.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          reportConfig.dataSources.includes(source.id)
                            ? 'border-indigo-300 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${source.color}`}>
                            <source.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{source.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{source.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {source.fields.length} fields
                              </Badge>
                              {source.relationships.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Link className="w-3 h-3 mr-1" />
                                  {source.relationships.length} relations
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            reportConfig.dataSources.includes(source.id)
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-gray-300'
                          }`}>
                            {reportConfig.dataSources.includes(source.id) && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeStep === "fields" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Select Fields
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Choose which fields to include in your report output.
                    </p>
                  </div>

                  {availableFields.length > 0 ? (
                    <div className="space-y-4">
                      {dataSources
                        .filter(ds => reportConfig.dataSources.includes(ds.id))
                        .map(source => (
                          <div key={source.id} className="space-y-3">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                              <source.icon className="w-4 h-4" />
                              {source.name}
                            </h4>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {source.fields.map(field => {
                                const fullField = {
                                  ...field,
                                  sourceId: source.id,
                                  sourceName: source.name,
                                  fullId: `${source.id}.${field.id}`,
                                  display: `${source.name}.${field.name}`
                                };
                                const isSelected = reportConfig.fields.some(f => f.fullId === fullField.fullId);

                                return (
                                  <div
                                    key={field.id}
                                    onClick={() => handleFieldToggle(fullField)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'border-indigo-300 bg-indigo-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                                      }`}>
                                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900 text-sm">{field.name}</p>
                                        <p className="text-xs text-gray-500">{field.type}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Select data sources first to see available fields</p>
                    </div>
                  )}
                </div>
              )}

              {activeStep === "filters" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Add Filters
                      </h3>
                      <p className="text-gray-600">
                        Filter your data to show only the records that match your criteria.
                      </p>
                    </div>
                    <Button
                      onClick={handleAddFilter}
                      variant="outline"
                      className="rounded-2xl"
                      disabled={availableFields.length === 0}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Filter
                    </Button>
                  </div>

                  {reportConfig.filters.length > 0 ? (
                    <div className="space-y-4">
                      {reportConfig.filters.map((filter, index) => (
                        <Card key={filter.id} className="rounded-2xl border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <Select
                                value={filter.fieldId}
                                onValueChange={(value) => {
                                  const field = availableFields.find(f => f.fullId === value);
                                  handleFilterChange(filter.id, {
                                    fieldId: value,
                                    sourceId: field?.sourceId || "",
                                    fieldType: field?.type || "text"
                                  });
                                }}
                              >
                                <SelectTrigger className="w-64 rounded-xl">
                                  <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {availableFields.map(field => (
                                    <SelectItem key={field.fullId} value={field.fullId}>
                                      {field.display}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={filter.operator}
                                onValueChange={(value) => handleFilterChange(filter.id, { operator: value })}
                              >
                                <SelectTrigger className="w-40 rounded-xl">
                                  <SelectValue placeholder="Operator" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {getOperatorOptions(filter.fieldType).map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Input
                                placeholder="Value"
                                value={filter.value}
                                onChange={(e) => handleFilterChange(filter.id, { value: e.target.value })}
                                className="flex-1 rounded-xl"
                              />

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveFilter(filter.id)}
                                className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No filters added yet</p>
                      <p className="text-sm">Click "Add Filter" to start filtering your data</p>
                    </div>
                  )}
                </div>
              )}

              {activeStep === "visualization" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Visualization Options
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Choose how to display your report data.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { id: "table", name: "Table", icon: Table, description: "Tabular data view" },
                      { id: "bar", name: "Bar Chart", icon: BarChart3, description: "Compare values" },
                      { id: "pie", name: "Pie Chart", icon: PieChart, description: "Show proportions" },
                      { id: "line", name: "Line Chart", icon: LineChart, description: "Trends over time" }
                    ].map(viz => (
                      <div
                        key={viz.id}
                        className="p-4 rounded-2xl border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
                      >
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <viz.icon className="w-6 h-6 text-gray-600" />
                          </div>
                          <h4 className="font-medium text-gray-900">{viz.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">{viz.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeStep === "settings" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Report Settings
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Configure your report details and options.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Report Name *
                      </label>
                      <Input
                        value={reportConfig.name}
                        onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter report name"
                        className="rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <Textarea
                        value={reportConfig.description}
                        onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what this report shows"
                        className="rounded-xl h-24"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Panel */}
        <div className="space-y-4">
          <Card className="rounded-2xl border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Report Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Data Sources</p>
                <div className="space-y-2">
                  {reportConfig.dataSources.map(sourceId => {
                    const source = dataSources.find(ds => ds.id === sourceId);
                    return source ? (
                      <div key={sourceId} className="flex items-center gap-2">
                        <source.icon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-900">{source.name}</span>
                      </div>
                    ) : null;
                  })}
                  {reportConfig.dataSources.length === 0 && (
                    <p className="text-sm text-gray-500">None selected</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Fields ({reportConfig.fields.length})
                </p>
                <div className="space-y-1">
                  {reportConfig.fields.slice(0, 5).map(field => (
                    <p key={field.fullId} className="text-xs text-gray-600">
                      {field.display}
                    </p>
                  ))}
                  {reportConfig.fields.length > 5 && (
                    <p className="text-xs text-gray-500">
                      +{reportConfig.fields.length - 5} more
                    </p>
                  )}
                  {reportConfig.fields.length === 0 && (
                    <p className="text-sm text-gray-500">None selected</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Filters ({reportConfig.filters.length})
                </p>
                {reportConfig.filters.length > 0 ? (
                  <p className="text-xs text-gray-600">
                    {reportConfig.filters.length} filter{reportConfig.filters.length !== 1 ? 's' : ''} applied
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">None applied</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSave}
            className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-2xl"
            disabled={!reportConfig.name || reportConfig.dataSources.length === 0 || reportConfig.fields.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Report
          </Button>
        </div>
      </div>
    </div>
  );
}
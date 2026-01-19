import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  MessageSquare,
  BarChart3,
  Activity,
  DollarSign,
  Calendar,
  TrendingUp,
  PieChart,
  Database,
  Eye
} from "lucide-react";

export default function ReportTemplates({ dataSources, onUseTemplate }) {
  const templates = [
    {
      id: "contact-overview",
      name: "Contact Overview",
      description: "Complete overview of your contact database with status breakdown and source analysis",
      icon: Users,
      color: "text-blue-600 bg-blue-50",
      category: "Contacts",
      dataSources: ["contacts"],
      fields: [
        "contacts.first_name",
        "contacts.last_name", 
        "contacts.email",
        "contacts.company_name",
        "contacts.status",
        "contacts.source",
        "contacts.created_date",
        "contacts.value"
      ],
      filters: [],
      popular: true
    },
    {
      id: "communication-performance",
      name: "Communication Performance",
      description: "Track message delivery rates, open rates, and communication effectiveness",
      icon: MessageSquare,
      color: "text-green-600 bg-green-50",
      category: "Communications",
      dataSources: ["communications", "contacts"],
      fields: [
        "communications.type",
        "communications.status",
        "communications.sent_date",
        "communications.delivered_date",
        "contacts.first_name",
        "contacts.last_name"
      ],
      filters: [
        {
          id: "recent",
          fieldId: "communications.sent_date",
          operator: "last_30_days",
          value: ""
        }
      ],
      popular: true
    },
    {
      id: "campaign-roi",
      name: "Campaign ROI Analysis",
      description: "Analyze campaign return on investment with cost breakdown and conversion metrics",
      icon: BarChart3,
      color: "text-purple-600 bg-purple-50",
      category: "Campaigns",
      dataSources: ["campaigns"],
      fields: [
        "campaigns.name",
        "campaigns.type",
        "campaigns.budget",
        "campaigns.total_recipients",
        "campaigns.messages_sent",
        "campaigns.messages_delivered",
        "campaigns.cost"
      ],
      filters: [
        {
          id: "active",
          fieldId: "campaigns.status",
          operator: "equals",
          value: "completed"
        }
      ],
      popular: false
    },
    {
      id: "sales-pipeline",
      name: "Sales Pipeline Report",
      description: "Track contact progression through your sales funnel with value analysis",
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50",
      category: "Sales",
      dataSources: ["contacts", "activities"],
      fields: [
        "contacts.first_name",
        "contacts.last_name",
        "contacts.status",
        "contacts.value",
        "contacts.source",
        "activities.type",
        "activities.created_date"
      ],
      filters: [
        {
          id: "has_value",
          fieldId: "contacts.value",
          operator: "greater_than",
          value: "0"
        }
      ],
      popular: true
    },
    {
      id: "activity-summary",
      name: "Team Activity Summary",
      description: "Overview of team activities, productivity metrics, and task completion rates",
      icon: Activity,
      color: "text-orange-600 bg-orange-50",
      category: "Team",
      dataSources: ["activities", "contacts"],
      fields: [
        "activities.type",
        "activities.status",
        "activities.duration",
        "activities.created_date",
        "contacts.first_name",
        "contacts.last_name"
      ],
      filters: [
        {
          id: "this_month",
          fieldId: "activities.created_date",
          operator: "this_month",
          value: ""
        }
      ],
      popular: false
    },
    {
      id: "monthly-growth",
      name: "Monthly Growth Report",
      description: "Track monthly growth in contacts, communications, and campaign performance",
      icon: TrendingUp,
      color: "text-indigo-600 bg-indigo-50",
      category: "Analytics",
      dataSources: ["contacts", "communications", "campaigns"],
      fields: [
        "contacts.created_date",
        "contacts.status",
        "communications.sent_date",
        "communications.type",
        "campaigns.start_date",
        "campaigns.messages_sent"
      ],
      filters: [
        {
          id: "last_6_months",
          fieldId: "contacts.created_date",
          operator: "after",
          value: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ],
      popular: false
    }
  ];

  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div className="space-y-6">
      {/* Popular Templates */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Templates</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.filter(t => t.popular).map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={onUseTemplate}
            />
          ))}
        </div>
      </div>

      {/* All Templates by Category */}
      <div className="space-y-8">
        {categories.map(category => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{category}</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.filter(t => t.category === category).map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={onUseTemplate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ template, onUse }) {
  return (
    <Card className="rounded-3xl border-gray-200 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${template.color}`}>
            <template.icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">
                {template.name}
              </CardTitle>
              {template.popular && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                  Popular
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {template.description}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Template Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Database className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">
                {template.dataSources.length}
              </span>
            </div>
            <p className="text-xs text-gray-500">Sources</p>
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Eye className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">
                {template.fields.length}
              </span>
            </div>
            <p className="text-xs text-gray-500">Fields</p>
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">
                {template.filters.length}
              </span>
            </div>
            <p className="text-xs text-gray-500">Filters</p>
          </div>
        </div>

        {/* Data Sources */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Uses:</p>
          <div className="flex flex-wrap gap-1">
            {template.dataSources.map((sourceId) => (
              <Badge key={sourceId} variant="outline" className="text-xs rounded-full capitalize">
                {sourceId}
              </Badge>
            ))}
          </div>
        </div>

        {/* Use Template Button */}
        <Button
          onClick={() => onUse({
            name: template.name,
            description: template.description,
            dataSources: template.dataSources,
            fields: template.fields.map(fieldPath => {
              const [sourceId, fieldId] = fieldPath.split('.');
              return {
                sourceId,
                fieldId,
                fullId: fieldPath,
                display: fieldPath.replace('.', ' > ')
              };
            }),
            filters: template.filters,
            groupBy: [],
            orderBy: [],
            visualizations: [],
            relationships: []
          })}
          className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-2xl"
        >
          Use This Template
        </Button>
      </CardContent>
    </Card>
  );
}
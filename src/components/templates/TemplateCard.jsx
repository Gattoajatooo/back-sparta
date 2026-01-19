import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Edit,
  Eye,
  Copy,
  Trash2,
  Send,
  Pause,
  Play,
  MessageSquare,
  Mail,
  Zap,
  Calendar,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";

export default function TemplateCard({ 
  template, 
  viewMode, 
  listCompactness, 
  templateCategories,
  templateTypes,
  onEdit, 
  onPreview, 
  onDuplicate, 
  onDelete, 
  onToggleActive 
}) {
  const category = templateCategories.find(cat => cat.id === template.category);
  const type = templateTypes.find(t => t.id === template.type);
  
  const CategoryIcon = category?.icon;
  const TypeIcon = type?.icon;

  if (viewMode === 'list') {
    const isCompact = listCompactness === 'compact';
    const isExtraCompact = listCompactness === 'extra-compact';

    return (
      <Card className="rounded-2xl border-gray-200 hover:shadow-md transition-shadow">
        <CardContent className={`${isExtraCompact ? 'p-3' : isCompact ? 'p-4' : 'p-6'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={`flex-shrink-0 ${isExtraCompact ? 'w-8 h-8' : 'w-12 h-12'} ${category?.color || 'bg-gray-100 text-gray-600'} rounded-2xl flex items-center justify-center`}>
                {CategoryIcon && <CategoryIcon className={`${isExtraCompact ? 'w-4 h-4' : 'w-6 h-6'}`} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold text-gray-900 truncate ${isExtraCompact ? 'text-sm' : 'text-base'}`}>
                    {template.name}
                  </h3>
                  <Badge variant="outline" className={`rounded-full text-xs flex-shrink-0 ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                {!isExtraCompact && (
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      {TypeIcon && <TypeIcon className="w-4 h-4" />}
                      <span>{type?.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      <span>{template.usage_count} uses</span>
                    </div>
                    {!isCompact && template.last_used && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Last used {format(new Date(template.last_used), 'MMM d')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!isExtraCompact && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPreview(template)}
                    className="h-8 w-8 rounded-full"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleActive(template)}
                    className="h-8 w-8 rounded-full"
                  >
                    {template.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                </>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl">
                  <DropdownMenuItem onClick={() => onPreview(template)} className="rounded-xl">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(template)} className="rounded-xl">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(template)} className="rounded-xl">
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleActive(template)} className="rounded-xl">
                    {template.is_active ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {template.is_active ? 'Deactivate' : 'Activate'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(template)} 
                    className="rounded-xl text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-gray-200 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${category?.color || 'bg-gray-100 text-gray-600'} rounded-2xl flex items-center justify-center`}>
              {CategoryIcon && <CategoryIcon className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{template.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{category?.name}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl">
              <DropdownMenuItem onClick={() => onPreview(template)} className="rounded-xl">
                <Eye className="w-4 h-4 mr-2" />
                Preview Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(template)} className="rounded-xl">
                <Edit className="w-4 h-4 mr-2" />
                Edit Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template)} className="rounded-xl">
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(template)} className="rounded-xl">
                {template.is_active ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {template.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(template)} 
                className="rounded-xl text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Content Preview */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-700 line-clamp-3">
            {template.content.substring(0, 150)}
            {template.content.length > 150 && '...'}
          </p>
        </div>

        {/* Variables */}
        {template.variables && template.variables.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Variables Used:</p>
            <div className="flex flex-wrap gap-1">
              {template.variables.slice(0, 3).map((variable, index) => (
                <Badge key={index} variant="outline" className="text-xs rounded-full bg-blue-50 text-blue-700 border-blue-200">
                  {variable}
                </Badge>
              ))}
              {template.variables.length > 3 && (
                <Badge variant="outline" className="text-xs rounded-full bg-gray-50 text-gray-600 border-gray-200">
                  +{template.variables.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              {TypeIcon && <TypeIcon className="w-4 h-4" />}
              <span>{type?.name}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span>{template.usage_count}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`rounded-full text-xs ${template.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {template.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreview(template)}
              className="rounded-xl"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
          </div>
        </div>

        {template.last_used && (
          <p className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
            Last used {format(new Date(template.last_used), 'PPP')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
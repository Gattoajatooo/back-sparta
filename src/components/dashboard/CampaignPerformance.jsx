import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tag, ArrowUpRight, TrendingUp, Users, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignPerformance({ campaigns, isLoading }) {
  const activeCampaigns = campaigns.filter(c => c.status === 'active').slice(0, 4);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200 rounded-full">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 rounded-full">Paused</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 rounded-full">Completed</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200 rounded-full">Draft</Badge>;
      default:
        return null;
    }
  };

  const getCampaignTypeColor = (type) => {
    switch (type) {
      case 'email': return 'text-blue-600 bg-blue-50';
      case 'social_media': return 'text-purple-600 bg-purple-50';
      case 'direct_mail': return 'text-green-600 bg-green-50';
      case 'phone': return 'text-orange-600 bg-orange-50';
      case 'event': return 'text-pink-600 bg-pink-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const calculateROI = (campaign) => {
    const cost = campaign.metrics?.cost || 0;
    const conversions = campaign.metrics?.conversions || 0;
    if (cost === 0) return 0;
    return Math.round(((conversions * 100) - cost) / cost * 100);
  };

  return (
    <Card className="rounded-3xl border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Campaign Performance</CardTitle>
          <Link to={createPageUrl("Campaigns")}>
            <Button variant="ghost" size="sm" className="rounded-2xl">
              View All
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <Skeleton className="h-3 w-12 mb-1" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-12 mb-1" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))
          ) : activeCampaigns.length > 0 ? (
            activeCampaigns.map((campaign) => {
              const colorClass = getCampaignTypeColor(campaign.type);
              const conversionRate = campaign.metrics?.contacts_reached > 0 
                ? Math.round((campaign.metrics.conversions / campaign.metrics.contacts_reached) * 100)
                : 0;
              const roi = calculateROI(campaign);
              
              return (
                <div key={campaign.id} className="p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colorClass}`}>
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{campaign.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    {getStatusBadge(campaign.status)}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Reached</p>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <p className="font-semibold text-gray-900">
                          {campaign.metrics?.contacts_reached || 0}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Conversions</p>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <p className="font-semibold text-gray-900">
                          {campaign.metrics?.conversions || 0}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">ROI</p>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-blue-500" />
                        <p className={`font-semibold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {roi >= 0 ? '+' : ''}{roi}%
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Conversion Rate</span>
                      <span className="font-medium">{conversionRate}%</span>
                    </div>
                    <Progress value={conversionRate} className="h-2 rounded-full" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium mb-1">No active campaigns</p>
              <p className="text-sm">Create your first campaign to start tracking performance</p>
              <Link to={createPageUrl("Campaigns?action=create")}>
                <Button variant="outline" size="sm" className="mt-4 rounded-2xl">
                  Create Campaign
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
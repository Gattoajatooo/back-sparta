import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Tag, Activity, TrendingUp, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsOverview({ stats, isLoading }) {
  const statCards = [
    {
      title: "Total Contacts",
      value: stats.totalContacts,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: "+12%",
      changeType: "positive"
    },
    {
      title: "Active Campaigns",
      value: stats.activeCampaigns,
      icon: Tag,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      change: "+5%",
      changeType: "positive"
    },
    {
      title: "Recent Activities",
      value: stats.recentActivities,
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: "+18%",
      changeType: "positive"
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      change: "+2.1%",
      changeType: "positive"
    }
  ];

  if (stats.totalValue !== undefined) {
    statCards.push({
      title: "Total Value",
      value: `$${stats.totalValue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      change: "+8.2%",
      changeType: "positive"
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="rounded-3xl border-gray-200 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-2xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="text-right">
                <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.changeType === 'positive' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {stat.change}
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
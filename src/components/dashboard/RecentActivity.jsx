import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Phone, 
  Mail, 
  Calendar, 
  StickyNote, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Activity as ActivityIcon
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecentActivity({ activities, isLoading }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'call': return Phone;
      case 'email': return Mail;
      case 'meeting': return Calendar;
      case 'note': return StickyNote;
      case 'task': return CheckCircle2;
      case 'follow_up': return Clock;
      default: return ActivityIcon;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'call': return 'text-blue-600 bg-blue-50';
      case 'email': return 'text-purple-600 bg-purple-50';
      case 'meeting': return 'text-green-600 bg-green-50';
      case 'note': return 'text-yellow-600 bg-yellow-50';
      case 'task': return 'text-emerald-600 bg-emerald-50';
      case 'follow_up': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-full">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 rounded-full">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-full">Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="rounded-3xl border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
          <Link to={createPageUrl("Activities")}>
            <Button variant="ghost" size="sm" className="rounded-2xl">
              View All
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))
          ) : activities.length > 0 ? (
            activities.slice(0, 8).map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.type);
              
              return (
                <div key={activity.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {activity.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-500 truncate">
                        {activity.description || `${activity.type} activity`}
                      </p>
                      {activity.duration && (
                        <span className="text-xs text-gray-400">
                          • {activity.duration}min
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(activity.created_date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(activity.status)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500">
              <ActivityIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium mb-1">No activities yet</p>
              <p className="text-sm">Start tracking your customer interactions</p>
              <Link to={createPageUrl("Activities?action=create")}>
                <Button variant="outline" size="sm" className="mt-4 rounded-2xl">
                  Add Activity
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
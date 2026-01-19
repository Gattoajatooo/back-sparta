import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, ArrowUpRight, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function TopContacts({ contacts, isLoading }) {
  const topValueContacts = contacts
    .filter(contact => contact.value && contact.value > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 5);

  return (
    <Card className="rounded-3xl border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Top Value Contacts</CardTitle>
          <Link to={createPageUrl("Contacts")}>
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
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))
          ) : topValueContacts.length > 0 ? (
            topValueContacts.map((contact, index) => (
              <div key={contact.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-sm font-medium">
                      {contact.first_name?.[0]}{contact.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {index < 3 && (
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                    }`}>
                      {index + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {contact.first_name} {contact.last_name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{contact.company_name}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600 font-semibold">
                    <DollarSign className="w-4 h-4" />
                    <span>{contact.value?.toLocaleString()}</span>
                  </div>
                  <Badge variant="outline" className={`text-xs rounded-full mt-1 ${
                    contact.status === 'customer' ? 'bg-green-50 text-green-700 border-green-200' :
                    contact.status === 'prospect' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                  }`}>
                    {contact.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No valued contacts yet</p>
              <p className="text-sm text-gray-400 mt-1">Add contact values to see top performers</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
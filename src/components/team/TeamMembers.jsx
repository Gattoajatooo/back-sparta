import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Edit,
  UserX,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  Eye,
  Users
} from "lucide-react";
import { format } from "date-fns";

export default function TeamMembers({ members, roles, currentUser, onEditUser, onReloadData }) {
  const getUserRole = (member) => {
    if (member.role_id) {
      return roles.find(r => r.id === member.role_id);
    }
    return roles.find(r => r.name === member.system_role?.charAt(0).toUpperCase() + member.system_role?.slice(1));
  };

  const getStatusBadge = (member) => {
    if (!member.is_active) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-full">Inactive</Badge>;
    }
    
    switch (member.invitation_status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 rounded-full">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-full">Active</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-full">Expired</Badge>;
      default:
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-full">Active</Badge>;
    }
  };

  const getRoleIcon = (role) => {
    if (!role) return <Eye className="w-3 h-3" />;
    
    if (role.name === 'Owner') return <Shield className="w-3 h-3" />;
    if (role.name === 'Administrator') return <Users className="w-3 h-3" />;
    return <Eye className="w-3 h-3" />;
  };

  const getRoleBadgeColor = (role) => {
    if (!role) return "bg-gray-100 text-gray-800 border-gray-200";
    
    if (role.name === 'Owner') return "bg-purple-100 text-purple-800 border-purple-200";
    if (role.name === 'Administrator') return "bg-blue-100 text-blue-800 border-blue-200";
    if (role.is_system_role) return "bg-gray-100 text-gray-800 border-gray-200";
    return "bg-indigo-100 text-indigo-800 border-indigo-200";
  };

  const canEditUser = (member) => {
    // Owners can edit anyone except other owners
    if (currentUser.system_role === 'owner') {
      return member.system_role !== 'owner' || member.id === currentUser.id;
    }
    // Admins can edit users but not other admins or owners
    if (currentUser.system_role === 'admin') {
      return member.system_role === 'user';
    }
    // Regular users can only edit themselves
    return member.id === currentUser.id;
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No team members</h3>
        <p className="text-gray-500">Start building your team by inviting members</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {members.map((member) => {
        const role = getUserRole(member);
        const canEdit = canEditUser(member);
        
        return (
          <Card key={member.id} className="rounded-2xl border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white font-medium">
                      {member.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {member.full_name || 'Unnamed User'}
                      {member.id === currentUser.id && (
                        <span className="text-sm text-gray-500 ml-2">(You)</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{member.email}</p>
                  </div>
                </div>
                
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-2xl">
                      <DropdownMenuItem onClick={() => onEditUser(member)} className="rounded-xl">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      {member.id !== currentUser.id && member.system_role !== 'owner' && (
                        <DropdownMenuItem className="rounded-xl text-red-600">
                          <UserX className="w-4 h-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="space-y-3">
                {member.department && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Department:</span> {member.department}
                  </p>
                )}
                
                {member.phone && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Phone:</span> {member.phone}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`rounded-full text-xs px-3 py-1 border ${getRoleBadgeColor(role)}`}>
                      {getRoleIcon(role)}
                      <span className="ml-1">{role?.name || 'No Role'}</span>
                    </Badge>
                  </div>
                  {getStatusBadge(member)}
                </div>

                {member.invitation_status === 'pending' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
                    <div className="flex items-center gap-2 text-yellow-800 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Invitation pending</span>
                    </div>
                    <p className="text-xs text-yellow-600 mt-1">
                      Expires: {format(new Date(member.invitation_expires), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}

                {member.last_login && (
                  <p className="text-xs text-gray-400">
                    Last login: {format(new Date(member.last_login), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
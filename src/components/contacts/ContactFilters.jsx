import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function ContactFilters({
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter
}) {
  return (
    <div className="flex gap-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 rounded-2xl border-gray-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Select value={sourceFilter} onValueChange={setSourceFilter}>
        <SelectTrigger className="w-36 rounded-2xl border-gray-200">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="website">Website</SelectItem>
          <SelectItem value="referral">Referral</SelectItem>
          <SelectItem value="social_media">Social Media</SelectItem>
          <SelectItem value="email_campaign">Email Campaign</SelectItem>
          <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
          <SelectItem value="event">Event</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
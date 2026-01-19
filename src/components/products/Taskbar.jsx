import React from 'react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function Taskbar({ windows, modules, onRestore, onClose }) {
  return (
    <div className="flex items-center gap-2">
      {windows.map((window) => {
        const module = modules.find(m => m.id === window.moduleId);
        
        return (
          <div
            key={window.id}
            className="relative group"
          >
            <Button
              variant="ghost"
              onClick={() => onRestore(window.id)}
              className="flex items-center gap-2 rounded-xl hover:bg-gray-100 px-3 py-2 h-auto w-32"
            >
              {module && (
                <div className={`w-6 h-6 rounded-lg ${module.color} flex items-center justify-center flex-shrink-0`}>
                  <module.icon className="w-4 h-4" />
                </div>
              )}
              <span className="text-xs font-medium text-gray-700 truncate flex-1">
                {window.title}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onClose(window.id);
              }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-0"
            >
              <X className="w-3 h-3 text-white" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
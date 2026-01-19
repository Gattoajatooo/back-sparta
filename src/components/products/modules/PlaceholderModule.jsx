import React from 'react';
import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PlaceholderModule({ module }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
          <Construction className="w-10 h-10 text-gray-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {module?.title || 'Módulo'}
          </h3>
          <p className="text-gray-600 mb-4">
            {module?.description || 'Este módulo está em desenvolvimento'}
          </p>
          <Badge variant="secondary" className="rounded-full">
            Em Construção
          </Badge>
        </div>
        <p className="text-sm text-gray-500">
          Este módulo estará disponível em breve com todas as funcionalidades necessárias para gerenciar este aspecto do seu negócio.
        </p>
      </div>
    </div>
  );
}
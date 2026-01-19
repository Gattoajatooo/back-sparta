import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Eye, X, Upload, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ImportProgressFloating({ 
  isVisible, 
  progress = { total: 0, processed: 0, successful: 0, failed: 0, isProcessing: false }, 
  onViewDetails, 
  onClose 
}) {
  if (!isVisible || !progress?.isProcessing) return null;

  const progressPercentage = progress?.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  const isCompleted = progress?.processed >= progress?.total && progress?.total > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[9998] cursor-pointer"
        onClick={onViewDetails}
      >
        <Card
          className="rounded-2xl shadow-2xl w-80 bg-white border-2"
          style={{
            borderColor: isCompleted ? '#22c55e' : '#10b981'
          }}
        >
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: isCompleted ? '#dcfce7' : '#d1fae5' }}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Upload className="w-5 h-5 text-green-600 animate-pulse" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  {isCompleted ? '✓ Importação Concluída' : '📥 Importando Contatos'}
                </div>
                <div className="text-xs text-gray-500">
                  {progress?.processed || 0} de {progress?.total || 0}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {progressPercentage}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="h-2 rounded-full bg-green-500 transition-all duration-300"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                {progress?.successful || 0}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-600" />
                {progress?.failed || 0}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl"
              >
                <Eye className="w-3 h-3 mr-1" />
                Detalhes
              </Button>
              {isCompleted && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  size="sm"
                  className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                >
                  <X className="w-3 h-3 mr-1" />
                  Fechar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
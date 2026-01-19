import React, { useEffect } from 'react';
import Window from './Window';
import Taskbar from './Taskbar';
import { Button } from "@/components/ui/button";
import { Grid3x3 } from "lucide-react";

export default function WindowManager({ windows, onClose, onMinimize, onRestore, onFocus, onMinimizeAll, modules }) {
  const activeWindows = windows.filter(w => !w.isMinimized);
  const minimizedWindows = windows.filter(w => w.isMinimized);

  // Salvar estado das janelas no localStorage
  useEffect(() => {
    if (windows.length > 0) {
      localStorage.setItem('windowsState', JSON.stringify(windows));
    } else {
      localStorage.removeItem('windowsState');
    }
  }, [windows]);

  return (
    <>
      {/* Janelas Ativas */}
      <div className="relative w-full h-full">
        {activeWindows.map((window, index) => {
          const module = modules.find(m => m.id === window.moduleId);
          
          return (
            <Window
              key={window.id}
              window={window}
              module={module}
              isActive={window.isActive}
              zIndex={window.isActive ? 50 : 40 + index}
              onClose={() => onClose(window.id)}
              onMinimize={() => onMinimize(window.id)}
              onFocus={() => onFocus(window.id)}
            />
          );
        })}
      </div>

      {/* Barra de Tarefas com Botão de Voltar e Janelas Minimizadas */}
      {(minimizedWindows.length > 0 || activeWindows.length > 0) && (
        <div className="fixed bottom-6 z-[60] left-1/2 transform -translate-x-1/2">
          <div className="bg-white rounded-2xl shadow-2xl px-3 py-2 border border-gray-200 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMinimizeAll}
              className="rounded-xl flex items-center gap-2 h-auto py-2 px-3"
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="text-xs font-medium">Módulos</span>
            </Button>
            
            {minimizedWindows.length > 0 && (
              <>
                <div className="h-6 w-px bg-gray-300" />
                <Taskbar
                  windows={minimizedWindows}
                  modules={modules}
                  onRestore={onRestore}
                  onClose={onClose}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
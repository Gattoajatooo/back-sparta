import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote } from "lucide-react";

/**
 * Componente que alterna entre nome e apelido com animação de fade
 * @param {string} name - Nome completo do contato
 * @param {string} nickname - Apelido/nickname do WhatsApp
 * @param {string} className - Classes CSS adicionais
 */
export default function AnimatedContactName({ name, nickname, className = "" }) {
  const [showNickname, setShowNickname] = useState(false);

  useEffect(() => {
    // Só ativar animação se houver apelido
    if (!nickname) return;

    const interval = setInterval(() => {
      setShowNickname(prev => !prev);
    }, 5000); // Alterna a cada 5 segundos

    return () => clearInterval(interval);
  }, [nickname]);

  // Se não houver apelido, mostrar apenas o nome sem animação
  if (!nickname) {
    return <span className={className}>{name}</span>;
  }

  return (
    <span className={`relative inline-flex items-center gap-1 ${className}`} style={{ minWidth: '100px' }}>
      <AnimatePresence mode="wait">
        {showNickname ? (
          <motion.span
            key="nickname"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-1 italic"
          >
            <Quote className="w-3 h-3 text-blue-500 flex-shrink-0" />
            {nickname}
          </motion.span>
        ) : (
          <motion.span
            key="name"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {name}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
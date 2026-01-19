import React from 'react';

export default function LogisticsModule() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto overflow-hidden mb-4">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
            alt="Sparta Sync"
            className="w-16 h-16 object-contain"
          />
          <div className="shine-effect"></div>
        </div>
        <style>
          {`
            @keyframes shine {
              0% {
                transform: translateX(-100%) translateY(100%) rotate(-45deg);
                opacity: 0;
              }
              50% {
                opacity: 1;
              }
              100% {
                transform: translateX(100%) translateY(-100%) rotate(-45deg);
                opacity: 0;
              }
            }
            .shine-effect {
              position: absolute;
              top: -50%;
              left: -50%;
              width: 250%;
              height: 250%;
              background: linear-gradient(
                to right,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0) 20%,
                rgba(255, 255, 255, 0.8) 50%,
                rgba(255, 255, 255, 0) 80%,
                rgba(255, 255, 255, 0) 100%
              );
              animation: shine 2.5s ease-in-out infinite;
              pointer-events: none;
            }
          `}
        </style>
        <p className="text-gray-500">Carregando módulo de logística...</p>
      </div>
    </div>
  );
}
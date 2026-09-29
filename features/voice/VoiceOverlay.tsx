"use client";

import React from 'react';

interface VoiceOverlayProps {
  show: boolean;
  onClose: () => void;
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ show, onClose }) => {
  return (
    <div className={`voice-overlay ${show ? 'show' : ''}`} id="voiceOverlay">
      <div className="voice-modal">
        <div className="voice-ring">🎙</div>
        <div className="voice-title">VMIND ÉCOUTE</div>
        <div className="voice-sub">
          Parlez en français, arabe ou anglais<br />
          L'IA analyse votre intention en temps réel
        </div>
        <button className="voice-close" onClick={onClose}>✕ Arrêter</button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export type GuideMood = 'curious' | 'focused' | 'convinced' | 'settled';

export interface VMindGuideProps {
  title?: string;
  message: string | null;
  isOpen: boolean;
  mood?: GuideMood;
}

export const VMindGuide: React.FC<VMindGuideProps> = ({
  title,
  message,
  isOpen,
  mood = 'focused'
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce state to handle rapid field swapping
  const [activeMessage, setActiveMessage] = useState(message);
  const [activeTitle, setActiveTitle] = useState(title);
  const [activeMood, setActiveMood] = useState(mood);
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isOpen && message) {
      setActiveMessage(message);
      setActiveTitle(title);
      setActiveMood(mood);
      setInternalIsOpen(true);
    } else {
      timeout = setTimeout(() => {
        setInternalIsOpen(false);
      }, 250); // Delay closing by 250ms to survive fast field swaps
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isOpen, message, title, mood]);

  useEffect(() => {
    if (!internalIsOpen || !activeMessage) {
      setDisplayedText('');
      return;
    }

    // Reset typing index when active message changes
    let currentIndex = 0;
    setDisplayedText('');

    const interval = setInterval(() => {
      if (currentIndex < activeMessage.length) {
        setDisplayedText(activeMessage.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 15); // Fast, efficient typing

    return () => clearInterval(interval);
  }, [activeMessage, internalIsOpen]);

  const getMoodStyles = (currentMood: GuideMood) => {
    switch (currentMood) {
      case 'curious':
        return { 
          animationDuration: '0.8s', 
          opacity: 1, 
          glow: '0 0 20px rgba(0, 229, 200, 0.8)', 
          borderColor: 'rgba(0, 229, 200, 0.6)',
          textColor: '#00e5c8',
          lineGradient: 'linear-gradient(90deg, transparent, #00e5c8, transparent)'
        };
      case 'focused':
        return { 
          animationDuration: '2s', 
          opacity: 0.9, 
          glow: '0 0 15px rgba(255, 71, 87, 0.4)', 
          borderColor: 'rgba(255, 71, 87, 0.4)',
          textColor: '#FF4757',
          lineGradient: 'linear-gradient(90deg, transparent, #FF4757, transparent)'
        };
      case 'convinced':
        return { 
          animationDuration: '0.5s', 
          opacity: 1, 
          glow: '0 0 35px rgba(255, 71, 87, 1)', 
          borderColor: 'rgba(255, 71, 87, 1)',
          textColor: '#FF4757',
          lineGradient: 'linear-gradient(90deg, transparent, #FF4757, transparent)'
        };
      case 'settled':
        return { 
          animationDuration: '4s', 
          opacity: 0.5, 
          glow: '0 0 10px rgba(255, 255, 255, 0.2)', 
          borderColor: 'rgba(255, 255, 255, 0.2)',
          textColor: '#b2bec3',
          lineGradient: 'linear-gradient(90deg, transparent, #b2bec3, transparent)'
        };
      default:
        return { 
          animationDuration: '2s', 
          opacity: 0.9, 
          glow: '0 0 15px rgba(255, 71, 87, 0.4)', 
          borderColor: 'rgba(255, 71, 87, 0.4)',
          textColor: '#FF4757',
          lineGradient: 'linear-gradient(90deg, transparent, #FF4757, transparent)'
        };
    }
  };

  const moodStyle = getMoodStyles(activeMood);

  const guideContent = (
    <AnimatePresence>
      {internalIsOpen && activeMessage && (
        <motion.div
          key="vmind-guide-panel"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '360px',
            backgroundColor: 'rgba(9, 13, 20, 0.90)',
            backdropFilter: 'blur(24px)',
            border: `1px solid ${moodStyle.borderColor}`,
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            boxShadow: `0 10px 40px rgba(0, 0, 0, 0.8), ${moodStyle.glow}`,
            zIndex: 999999,
            overflow: 'hidden',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            transition: 'all 0.5s ease-in-out'
          }}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: moodStyle.lineGradient,
            opacity: moodStyle.opacity,
            animation: `vmindPulseLine ${moodStyle.animationDuration} infinite ease-in-out`,
            transition: 'all 0.5s ease-in-out'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              width: '42px', 
              height: '42px',
              borderRadius: '50%',
              flexShrink: 0,
              boxShadow: moodStyle.glow,
              opacity: moodStyle.opacity,
              animation: `vmindAvatarPulse ${moodStyle.animationDuration} infinite alternate ease-in-out`,
              backgroundImage: 'url(/vmind-guide-avatar.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: `2px solid ${moodStyle.borderColor}`,
              transition: 'all 0.5s ease-in-out'
            }} />
            
            <div style={{ flex: 1, marginTop: '2px' }}>
              {activeTitle && (
                <h5 style={{ 
                  color: moodStyle.textColor, 
                  fontSize: '0.65rem', 
                  margin: '0 0 0.4rem 0', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1.5px',
                  fontWeight: 700,
                  opacity: 0.9,
                  transition: 'color 0.5s ease-in-out'
                }}>
                  {activeTitle}
                </h5>
              )}
              <p style={{ 
                margin: 0, 
                color: '#e2e8f0', 
                fontSize: '0.9rem', 
                lineHeight: 1.6,
                fontWeight: 400,
                minHeight: '40px' // Prevent layout shift while typing
              }}>
                {displayedText}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                  style={{ 
                    display: 'inline-block', 
                    width: '6px', 
                    height: '14px', 
                    backgroundColor: moodStyle.textColor, 
                    marginLeft: '6px', 
                    verticalAlign: 'middle',
                    boxShadow: moodStyle.glow,
                    transition: 'all 0.5s ease-in-out'
                  }}
                />
              </p>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes vmindPulseLine {
              0% { opacity: 0.1; transform: translateX(-20%); }
              50% { opacity: 0.8; transform: translateX(20%); }
              100% { opacity: 0.1; transform: translateX(-20%); }
            }
            @keyframes vmindAvatarPulse {
              0% { filter: brightness(0.9); transform: scale(1); }
              100% { filter: brightness(1.3); transform: scale(1.05); }
            }
          `}} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(guideContent, document.body);
};

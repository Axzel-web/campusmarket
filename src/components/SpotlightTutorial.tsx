import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Sparkles, Hand } from 'lucide-react';
import { cn } from '../lib/utils';

interface Step {
  targetId: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface SpotlightTutorialProps {
  steps: Step[];
  onComplete: () => void;
  onSkip: () => void;
  isActive: boolean;
}

export const SpotlightTutorial: React.FC<SpotlightTutorialProps> = ({ 
  steps, 
  onComplete, 
  onSkip,
  isActive 
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];

  const updateTargetRect = () => {
    if (!isActive) return;
    const element = document.getElementById(currentStep.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateTargetRect, true);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isActive, currentStepIndex]);

  useLayoutEffect(() => {
    if (isActive) {
      updateTargetRect();
      const interval = setInterval(updateTargetRect, 500);
      return () => clearInterval(interval);
    }
  }, [isActive, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  if (!isActive) return null;

  const getSpotlightPath = () => {
    const { width, height } = windowSize;
    if (!targetRect) return `M 0 0 H ${width} V ${height} H 0 Z`;

    const { left, top, width: tWidth, height: tHeight } = targetRect;
    const r = 12;
    
    return `
      M 0 0 H ${width} V ${height} H 0 Z
      M ${left + r} ${top}
      h ${tWidth - 2 * r}
      a ${r} ${r} 0 0 1 ${r} ${r}
      v ${tHeight - 2 * r}
      a ${r} ${r} 0 0 1 -${r} ${r}
      h -${tWidth - 2 * r}
      a ${r} ${r} 0 0 1 -${r} -${r}
      v -${tHeight - 2 * r}
      a ${r} ${r} 0 0 1 ${r} -${r}
      Z
    `;
  };

  const getTooltipPosition = () => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const padding = 40;
    const { left, top, width: tWidth, height: tHeight } = targetRect;
    const { width: wWidth, height: wHeight } = windowSize;

    let style: React.CSSProperties = {
      left: Math.max(20, Math.min(left + tWidth / 2, wWidth - 300)),
      top: top + tHeight + padding,
    };

    if (top + tHeight + 350 > wHeight) {
      style.top = top - padding;
      style.transform = 'translate(-50%, -100%)';
    } else {
      style.transform = 'translateX(-50%)';
    }

    return style;
  };

  const getHandPosition = () => {
    if (!targetRect) return null;
    const { left, top, width: tWidth, height: tHeight } = targetRect;
    const { width: wWidth, height: wHeight } = windowSize;

    // Position hand based on where tooltip is NOT
    const tooltipStyle = getTooltipPosition();
    const isTooltipBelow = (tooltipStyle.top as number) > top;

    if (isTooltipBelow) {
      return {
        left: left + tWidth / 2 - 20,
        top: top - 40,
        rotate: 180
      };
    } else {
      return {
        left: left + tWidth / 2 - 20,
        top: top + tHeight + 10,
        rotate: 0
      };
    }
  };

  const handPos = getHandPosition();

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[1000] pointer-events-none overflow-hidden"
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <motion.path
          d={getSpotlightPath()}
          fill="rgba(0, 0, 0, 0.75)"
          fillRule="evenodd"
          initial={false}
          animate={{ d: getSpotlightPath() }}
          transition={{ type: 'spring', stiffness: 150, damping: 25 }}
          className="pointer-events-auto cursor-default"
        />
      </svg>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={getTooltipPosition()}
          className="absolute w-full max-w-[320px] pointer-events-auto"
        >
          <div className="flex flex-col gap-4">
            {/* Guide Avatar */}
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 ml-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white shadow-xl shadow-brand-primary/20 ring-4 ring-white/10">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                <span className="text-[10px] font-black text-white uppercase tracking-wider">Campus Guide</span>
              </div>
            </motion.div>

            {/* Speech Bubble Tooltip */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-border-main relative">
              <div 
                className={cn(
                  "absolute left-8 w-6 h-6 bg-white border-l border-t border-border-main rotate-45",
                  targetRect && (getTooltipPosition().top as number) > targetRect.top ? "-top-3" : "-bottom-3 rotate-[225deg]"
                )}
              />
              
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">
                  {currentStepIndex + 1} / {steps.length}
                </span>
                <button 
                  onClick={onSkip}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-light transition-colors text-text-muted hover:text-text-main"
                >
                  <X size={18} />
                </button>
              </div>
              
              <h3 className="text-xl font-black text-text-main mb-2 leading-tight">{currentStep.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed font-medium mb-8">{currentStep.content}</p>
              
              <div className="flex items-center justify-between">
                <button 
                  onClick={onSkip}
                  className="text-[11px] font-black text-text-muted hover:text-brand-primary transition-colors uppercase tracking-widest px-2"
                >
                  Skip
                </button>
                
                <div className="flex gap-2">
                  {currentStepIndex > 0 && (
                    <button 
                      onClick={handleBack}
                      className="w-11 h-11 flex items-center justify-center rounded-2xl border border-border-main hover:bg-bg-light hover:border-text-main transition-all text-text-main"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <button 
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 h-11 bg-brand-primary text-white rounded-2xl text-xs font-black shadow-xl shadow-brand-primary/30 hover:scale-[1.05] active:scale-95 transition-all uppercase tracking-wider"
                  >
                    {currentStepIndex === steps.length - 1 ? 'Got it!' : 'Next'}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Animated Pointing Hand */}
      {handPos && (
        <motion.div
          key={`hand-${currentStepIndex}`}
          initial={{ opacity: 0, scale: 0.5, ...handPos }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: handPos.rotate === 0 ? [0, 15, 0] : [0, -15, 0]
          }}
          transition={{
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 },
            y: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
          }}
          style={{
            position: 'absolute',
            left: handPos.left,
            top: handPos.top,
            transform: `rotate(${handPos.rotate}deg)`,
            color: '#ff4b4b',
            filter: 'drop-shadow(0 0 10px rgba(255, 75, 75, 0.3))'
          }}
          className="pointer-events-none"
        >
          <Hand size={40} fill="currentColor" strokeWidth={1} />
        </motion.div>
      )}
    </div>
  );
};


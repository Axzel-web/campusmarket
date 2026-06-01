import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Compass } from 'lucide-react';
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

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[1000] pointer-events-none overflow-hidden"
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <motion.path
          d={getSpotlightPath()}
          fill="rgba(11, 61, 46, 0.45)"
          fillRule="evenodd"
          initial={false}
          animate={{ d: getSpotlightPath() }}
          transition={{ type: 'spring', stiffness: 150, damping: 25 }}
          className="pointer-events-auto cursor-default backdrop-blur-[2px]"
        />
      </svg>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          style={getTooltipPosition()}
          className="absolute w-full max-w-[320px] pointer-events-auto"
        >
          <div className="flex flex-col gap-3">
            {/* Speech Bubble Tooltip */}
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 relative">
              <div 
                className={cn(
                  "absolute left-8 w-4 h-4 bg-white border-l border-t border-slate-100 rotate-45",
                  targetRect && (getTooltipPosition().top as number) > targetRect.top ? "-top-2" : "-bottom-2 rotate-[225deg]"
                )}
              />
              
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0B3D2E]/10 rounded-full text-[10px] font-black text-[#0B3D2E] uppercase tracking-wider">
                  <Compass size={12} className="animate-spin-slow" />
                  <span>Campus Guide</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400">
                    {currentStepIndex + 1} of {steps.length}
                  </span>
                  <button 
                    onClick={onSkip}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-base font-extrabold text-slate-800 mb-1.5 leading-tight">{currentStep.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-6">{currentStep.content}</p>
              
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button 
                  onClick={onSkip}
                  className="text-[10.5px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Skip
                </button>
                
                <div className="flex gap-1.5">
                  {currentStepIndex > 0 && (
                    <button 
                      onClick={handleBack}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  <button 
                    onClick={handleNext}
                    className="flex items-center gap-1 px-4 h-9 bg-[#0B3D2E] hover:bg-[#072d21] text-white rounded-xl text-xs font-black transition-all uppercase tracking-wider cursor-pointer"
                  >
                    {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};


import React, { useEffect, useState, useRef } from 'react';

interface StartupScreenProps {
  onComplete: () => void;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<number>(0); // 0: 0s, 1: 0.5s, 2: 1.0s
  const [progress, setProgress] = useState<number>(0);

  const hasSpokenRef = useRef<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Stage 1 at 0.5s: Full form appears
    const t0 = setTimeout(() => {
      setStage(1);
    }, 500);

    // Stage 2 at 1.0s: Initialization status begins and voice attempts once
    const t1 = setTimeout(() => {
      setStage(2);
      attemptWelcomeVoice();
    }, 1000);

    // Progress bar tracking from 1.0s to 5.0s (4000ms duration)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return Math.min(prev + 2.5, 100);
      });
    }, 100);

    // Exact transition to Operations at ~5.0 seconds (independent of speech)
    const completionTimer = setTimeout(() => {
      onCompleteRef.current();
    }, 5000);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearInterval(progressInterval);
      clearTimeout(completionTimer);

      // Clean up any ongoing speech on unmount
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const attemptWelcomeVoice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;

    const synth = window.speechSynthesis;

    // Reset synthesis queue safely
    try {
      if (synth.paused) {
        synth.resume();
      }
      synth.cancel();
    } catch {
      // Ignore reset errors
    }

    const speak = (voices: SpeechSynthesisVoice[]) => {
      try {
        const text =
          'Welcome to ASTRA. Adaptive Space Task Recognition and Assistance. Onboard assistance system is initializing.';
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (voices.length > 0) {
          const selectedVoice =
            voices.find(
              (v) =>
                v.lang.startsWith('en') &&
                (v.name.includes('Natural') ||
                  v.name.includes('Samantha') ||
                  v.name.includes('Google') ||
                  v.name.includes('Daniel') ||
                  v.name.includes('David'))
            ) || voices.find((v) => v.lang.startsWith('en'));

          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }

        utterance.onend = () => {
          utteranceRef.current = null;
        };

        utterance.onerror = () => {
          utteranceRef.current = null;
        };

        synth.speak(utterance);

        // Resume engine in case Chrome paused speech queue
        if (synth.paused) {
          synth.resume();
        }
      } catch {
        // Autoplay policy or speech synthesis blocked - fail silently without retry loop
      }
    };

    const existingVoices = synth.getVoices();
    if (existingVoices && existingVoices.length > 0) {
      speak(existingVoices);
    } else {
      // In Chromium browsers, voices load asynchronously on page refresh
      let voicesLoaded = false;

      const handleVoicesChanged = () => {
        if (voicesLoaded) return;
        voicesLoaded = true;
        synth.removeEventListener('voiceschanged', handleVoicesChanged);
        speak(synth.getVoices());
      };

      synth.addEventListener('voiceschanged', handleVoicesChanged);

      // Fallback timeout in case voiceschanged doesn't fire
      setTimeout(() => {
        if (!voicesLoaded) {
          voicesLoaded = true;
          synth.removeEventListener('voiceschanged', handleVoicesChanged);
          speak(synth.getVoices());
        }
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070a10] flex flex-col items-center justify-center p-6 select-none transition-opacity duration-700">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        {/* 0.0s: ASTRA Identity */}
        <div className="transition-all duration-700 ease-out transform opacity-100 translate-y-0">
          <div className="inline-block px-3 py-1 mb-3 rounded border border-sky-900/60 bg-[#0c1422] font-mono text-[11px] font-semibold tracking-widest text-sky-400 uppercase">
            SYSTEM BOOT
          </div>
          <h1 className="font-mono text-3xl sm:text-4xl font-bold tracking-[0.25em] text-slate-100 uppercase">
            ASTRA
          </h1>
        </div>

        {/* 0.5s: Full form appears */}
        <div
          className={`mt-2 transition-all duration-500 ease-out ${
            stage >= 1
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <p className="text-xs sm:text-sm font-sans text-slate-400 font-medium tracking-wide">
            Adaptive Space Task Recognition & Assistance
          </p>
        </div>

        {/* 1.0s: Initialization Status & System Modules */}
        <div
          className={`w-full mt-10 transition-all duration-700 ease-out ${
            stage >= 2
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase mb-4">
            INITIALIZING ONBOARD ASSISTANCE
          </div>

          {/* Restrained Progress Line */}
          <div className="w-full h-1 bg-[#141b27] rounded-full overflow-hidden mb-6 border border-[#1b2536]">
            <div
              className="h-full bg-sky-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Module Labels */}
          <div className="grid grid-cols-2 gap-2 text-left font-mono text-[10px]">
            <div className="flex items-center justify-between px-3 py-2 rounded bg-[#0d131f] border border-[#172233]">
              <span className="text-slate-300">LOCAL PROCESSING</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded bg-[#0d131f] border border-[#172233]">
              <span className="text-slate-300">VOICE SYSTEM</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded bg-[#0d131f] border border-[#172233]">
              <span className="text-slate-300">ACTIVITY RECOGNITION</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded bg-[#0d131f] border border-[#172233]">
              <span className="text-slate-300">EXPERIMENT CONTEXT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

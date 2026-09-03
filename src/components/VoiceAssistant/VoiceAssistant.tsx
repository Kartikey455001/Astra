import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Radio, Sparkles, RotateCcw, ListOrdered } from 'lucide-react';
import type {
  ActivityResult,
  ExperimentProfile,
  ProcedureState,
  DemoProcedureStage,
  AstronautTrackingStatus,
  PoseEstimationStatus,
  CameraFeedStatus,
  GroundSupportStatus,
} from '../../types/astra';
import { resolveAssistantResponse } from '../../utils/assistantResponses';

export type AssistantState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'RESPONDING';

interface VoiceAssistantProps {
  currentActivity?: ActivityResult | null;
  selectedExperiment?: ExperimentProfile | null;
  procedureState?: ProcedureState;
  groundSupportStatus?: GroundSupportStatus;
  trackingStatus?: AstronautTrackingStatus;
  poseStatus?: PoseEstimationStatus;
  cameraStatus?: CameraFeedStatus;
  onRequestGroundSupport?: (reason: string) => void;
  onCancelGroundSupport?: () => void;
  onRecordInteraction?: (query: string, response: string) => void;
  externalQueryTrigger?: { query: string; id: number } | null;
  workspaceZone?: string;
  onAssistantStateChange?: (state: AssistantState) => void;
}

const COMMON_QUERIES = [
  'What am I doing?',
  'Where am I working?',
  'What experiment is this?',
  'What is Cytoskeleton?',
  'Current procedure',
  "What's next?",
  'I need ground support',
  'Are you tracking me?',
  'Is everything ready?',
  'Repeat that',
];

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  currentActivity = null,
  selectedExperiment = null,
  procedureState,
  groundSupportStatus = 'NO_REQUEST',
  trackingStatus = 'ACTIVE',
  poseStatus = 'ACTIVE',
  cameraStatus = 'LIVE',
  onRequestGroundSupport,
  onCancelGroundSupport,
  onRecordInteraction,
  externalQueryTrigger,
  workspaceZone,
  onAssistantStateChange,
}) => {
  const [assistantState, setAssistantState] = useState<AssistantState>('IDLE');
  const [assistantText, setAssistantText] = useState<string>('ASTRA is ready to assist.');
  const [activeTranscript, setActiveTranscript] = useState<string>('');
  const [activeProcedureStage, setActiveProcedureStage] = useState<DemoProcedureStage | null>(null);
  const [nextProcedureStage, setNextProcedureStage] = useState<DemoProcedureStage | null>(null);

  const recognitionRef = useRef<any>(null);
  const isHoldingRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpokenInitRef = useRef<boolean>(false);
  const lastSpokenResponseRef = useRef<string>('ASTRA is ready to assist.');
  const onAssistantStateChangeRef = useRef(onAssistantStateChange);
  onAssistantStateChangeRef.current = onAssistantStateChange;

  // Emit assistant state changes to parent observer (for ValidationModule) — passive, no ownership
  useEffect(() => {
    onAssistantStateChangeRef.current?.(assistantState);
  }, [assistantState]);

  // Spoken voice synthesis helper (clear, concise 1-2 sentences)
  const speakResponse = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      setAssistantState('IDLE');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('David'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        setAssistantState('IDLE');
      };
      utterance.onerror = () => {
        setAssistantState('IDLE');
      };

      window.speechSynthesis.speak(utterance);

      // Fallback timer in case speech synthesis callback is delayed
      const maxDuration = Math.max(2800, text.length * 65);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setAssistantState((prev: AssistantState) => (prev === 'RESPONDING' ? 'IDLE' : prev));
      }, maxDuration);
    } catch {
      setAssistantState('IDLE');
    }
  }, []);

  // One-time initial greeting speaking
  useEffect(() => {
    if (!hasSpokenInitRef.current) {
      hasSpokenInitRef.current = true;
      try {
        if ('speechSynthesis' in window) {
          const initUtterance = new SpeechSynthesisUtterance('ASTRA is ready to assist.');
          initUtterance.rate = 1.0;
          initUtterance.lang = 'en-US';
          window.speechSynthesis.speak(initUtterance);
        }
      } catch {
        // Autoplay policy fallback
      }
    }
  }, []);

  // Execute an operational query against the active context
  const processQuery = useCallback(
    (query: string) => {
      setAssistantState('PROCESSING');
      setAssistantText('Processing request...');

      setTimeout(() => {
        const response = resolveAssistantResponse(query, {
          currentActivity,
          selectedExperiment,
          procedureState,
          groundSupportStatus,
          lastSpokenResponse: lastSpokenResponseRef.current,
          trackingStatus,
          poseStatus,
          cameraStatus,
          workspaceZone,
        });

        // Store for "Repeat that" intent
        if (response.intent !== 'REPEAT_LAST' && response.intent !== 'REPEAT_EMPTY') {
          lastSpokenResponseRef.current = response.text;
        }

        // Record interaction for ground support transcript and session trace FIRST
        if (onRecordInteraction) {
          onRecordInteraction(query, response.text);
        }

        // Trigger ground support escalation if requested
        if (response.groundSupportAction === 'REQUEST' && onRequestGroundSupport) {
          onRequestGroundSupport(response.requestReason || 'Human assistance requested');
        } else if (response.groundSupportAction === 'CANCEL' && onCancelGroundSupport) {
          onCancelGroundSupport();
        }

        // Update demonstration workflow preview if applicable
        if (response.currentStage) {
          setActiveProcedureStage(response.currentStage);
        }
        if (response.nextStage) {
          setNextProcedureStage(response.nextStage);
        }

        setAssistantText(response.text);
        setAssistantState('RESPONDING');
        speakResponse(response.text);
      }, 350);
    },
    [
      currentActivity,
      selectedExperiment,
      procedureState,
      groundSupportStatus,
      trackingStatus,
      poseStatus,
      cameraStatus,
      workspaceZone,
      onRequestGroundSupport,
      onCancelGroundSupport,
      onRecordInteraction,
      speakResponse,
    ]
  );

  const processQueryRef = useRef(processQuery);
  processQueryRef.current = processQuery;
  const lastProcessedQueryIdRef = useRef<number>(0);

  // Trigger external queries from Context Assistance if provided (strictly one-shot per unique ID)
  useEffect(() => {
    if (
      externalQueryTrigger &&
      externalQueryTrigger.query &&
      externalQueryTrigger.id &&
      externalQueryTrigger.id !== lastProcessedQueryIdRef.current
    ) {
      lastProcessedQueryIdRef.current = externalQueryTrigger.id;
      processQueryRef.current(externalQueryTrigger.query);
    }
  }, [externalQueryTrigger]);

  // Initialize browser speech recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setActiveTranscript(transcript);
      };

      recognition.onerror = () => {
        // Maintain graceful fallback if error occurs
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignored
        }
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // HOLD TO SPEAK handlers
  const handleHoldStart = () => {
    isHoldingRef.current = true;
    setActiveTranscript('');
    setAssistantState('LISTENING');
    setAssistantText('Listening...');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        // Recognition already active
      }
    }
  };

  const handleHoldEnd = () => {
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
    }

    const query = activeTranscript.trim() || 'What am I doing?';
    processQuery(query);
  };

  const getStatusBadge = () => {
    switch (assistantState) {
      case 'LISTENING':
        return (
          <div className="flex items-center gap-1 font-mono text-[10px] text-amber-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            LISTENING
          </div>
        );
      case 'PROCESSING':
        return (
          <div className="flex items-center gap-1 font-mono text-[10px] text-sky-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
            PROCESSING
          </div>
        );
      case 'RESPONDING':
        return (
          <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            RESPONDING
          </div>
        );
      case 'IDLE':
      default:
        return (
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            READY
          </div>
        );
    }
  };

  return (
    <section className="bg-[#0b1018] border border-[#1b2535] rounded overflow-hidden flex flex-col shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#0e1522] border-b border-[#1b2535] select-none">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <h2 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
            ASTRA ASSISTANT
          </h2>
        </div>
        {getStatusBadge()}
      </div>

      {/* Operational Assistant Area */}
      <div className="p-3.5 bg-[#090e16] flex flex-col gap-3">
        {/* Assistant Speech / Prompt Box */}
        <div className="min-h-[46px] p-2.5 rounded bg-[#070b12] border border-[#162030] flex items-center">
          <p className="text-xs text-slate-200 font-sans leading-relaxed">
            “{assistantText}”
          </p>
        </div>

        {/* Compact Requested Demonstration Workflow Preview */}
        {(activeProcedureStage || nextProcedureStage) && (
          <div className="p-2.5 rounded bg-[#0a121e] border border-[#1a293d] flex flex-col gap-1.5 font-mono text-[11px] animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-[#152335] pb-1">
              <span className="flex items-center gap-1.5 text-sky-400 font-bold tracking-wider uppercase">
                <ListOrdered className="w-3 h-3" />
                DEMONSTRATION WORKFLOW
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#101b2a] border border-[#1c2e47] text-slate-400">
                DEMO / NON-FLIGHT
              </span>
            </div>

            <div className="flex flex-col gap-1 pt-0.5">
              {activeProcedureStage && (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-slate-400 text-[10px]">Current:</span>
                    <span className="text-slate-100 font-semibold font-sans">
                      {activeProcedureStage.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans leading-tight">
                    {activeProcedureStage.description}
                  </p>
                </div>
              )}

              {nextProcedureStage && (
                <div className="flex items-baseline gap-1.5 pt-1 border-t border-[#131e2d] text-[10px]">
                  <span className="text-slate-500">Next:</span>
                  <span className="text-slate-300 font-sans">
                    {nextProcedureStage.title}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prominent Hands-Free Voice Trigger */}
        <button
          type="button"
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          aria-label="Hold to speak to ASTRA Assistant"
          className={`w-full py-2.5 px-3 rounded flex items-center justify-center gap-2.5 font-mono text-xs font-semibold tracking-wider transition-all cursor-pointer border select-none ${
            assistantState === 'LISTENING'
              ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-300 shadow-md shadow-sky-500/20'
              : assistantState === 'PROCESSING'
              ? 'bg-[#152338] text-sky-300 border-sky-600/50'
              : assistantState === 'RESPONDING'
              ? 'bg-[#0f1f1d] text-emerald-300 border-emerald-600/50'
              : 'bg-[#121a28] hover:bg-[#182338] text-slate-200 border-[#202d44]'
          }`}
        >
          <Mic
            className={`w-4 h-4 ${
              assistantState === 'LISTENING'
                ? 'text-white animate-pulse'
                : assistantState === 'RESPONDING'
                ? 'text-emerald-400'
                : 'text-sky-400'
            }`}
          />
          <span>
            {assistantState === 'LISTENING'
              ? 'LISTENING... (HOLD)'
              : assistantState === 'PROCESSING'
              ? 'PROCESSING REQUEST...'
              : assistantState === 'RESPONDING'
              ? 'RESPONDING...'
              : 'HOLD TO SPEAK'}
          </span>
        </button>

        {/* Operational Query Shortcuts for Fast Hands-on Interaction */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-[#131d2c]">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>OPERATIONAL QUERIES</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Radio className="w-2.5 h-2.5 text-emerald-400" />
              OFFLINE / LOCAL
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {COMMON_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => processQuery(q)}
                disabled={assistantState !== 'IDLE'}
                className="text-[11px] font-sans px-2 py-1 rounded bg-[#0d1522] hover:bg-[#132034] text-slate-300 hover:text-sky-200 border border-[#1b283d] hover:border-sky-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left flex items-center gap-1"
              >
                {q === 'Repeat that' && <RotateCcw className="w-2.5 h-2.5 text-slate-400" />}
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

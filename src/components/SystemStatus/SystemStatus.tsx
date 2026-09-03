import React from 'react';
import type { CameraFeedStatus } from '../../types/astra';

interface SystemStatusProps {
  localProcessing?: 'READY' | 'ACTIVE';
  voiceAssistance?: 'READY' | 'ACTIVE';
  cameraStatus?: CameraFeedStatus;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  localProcessing = 'READY',
  voiceAssistance = 'READY',
  cameraStatus = 'LIVE',
}) => {
  const getCameraDotColor = () => {
    switch (cameraStatus) {
      case 'LIVE':
        return 'bg-emerald-400';
      case 'INITIALIZING':
        return 'bg-amber-400';
      case 'OFFLINE':
      default:
        return 'bg-rose-500';
    }
  };

  return (
    <div className="bg-[#0b1018] border border-[#1b2535] rounded px-3.5 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
      <div className="flex items-center gap-1.5">
        <span className="text-slate-300">LOCAL PROCESSING</span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            localProcessing === 'ACTIVE' || localProcessing === 'READY'
              ? 'bg-emerald-400'
              : 'bg-amber-400'
          }`}
        ></span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-slate-300">VOICE ASSISTANCE</span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            voiceAssistance === 'ACTIVE' || voiceAssistance === 'READY'
              ? 'bg-emerald-400'
              : 'bg-amber-400'
          }`}
        ></span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-slate-300">CAMERA 01</span>
        <span className={`w-1.5 h-1.5 rounded-full ${getCameraDotColor()}`}></span>
      </div>
    </div>
  );
};

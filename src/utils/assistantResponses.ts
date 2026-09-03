import type {
  ActivityResult,
  ExperimentProfile,
  ProcedureState,
  DemoProcedureStage,
  AstronautTrackingStatus,
  PoseEstimationStatus,
  CameraFeedStatus,
  GroundSupportStatus,
} from '../types/astra';

export interface AssistantContext {
  currentActivity: ActivityResult | null;
  selectedExperiment: ExperimentProfile | null;
  procedureState?: ProcedureState;
  groundSupportStatus?: GroundSupportStatus;
  lastSpokenResponse?: string;
  trackingStatus?: AstronautTrackingStatus;
  poseStatus?: PoseEstimationStatus;
  cameraStatus?: CameraFeedStatus;
  workspaceZone?: string;
}

export interface AssistantResponse {
  intent: string;
  text: string;
  currentStage?: DemoProcedureStage;
  nextStage?: DemoProcedureStage;
  groundSupportAction?: 'REQUEST' | 'CANCEL';
  requestReason?: string;
}

/**
 * Deterministic, offline, context-aware intent resolver for ASTRA Assistant (Part 10).
 * Grounded in ESA Cytoskeleton experiment knowledge and local computer-vision outputs.
 * Zero external LLMs, zero cloud dependencies.
 */
export function resolveAssistantResponse(
  query: string,
  context: AssistantContext
): AssistantResponse {
  const q = query.trim().toLowerCase();
  const {
    currentActivity,
    selectedExperiment,
    procedureState,
    groundSupportStatus = 'NO_REQUEST',
    lastSpokenResponse,
    trackingStatus = 'ACTIVE',
    cameraStatus = 'LIVE',
  } = context;

  const demoProcedure = selectedExperiment?.demoProcedure;
  const currentStageNum = procedureState?.currentStage ?? 1;
  const currentStage = demoProcedure?.find((s) => s.stageNumber === currentStageNum);
  const nextStage = demoProcedure?.find((s) => s.stageNumber === currentStageNum + 1);

  // 0a. Explicit Ground Support Request
  if (
    q.includes('need ground support') ||
    q.includes('request ground support') ||
    q.includes('call ground support') ||
    q.includes('need help from ground') ||
    q.includes('help from ground') ||
    q === 'ground support' ||
    q === 'request ground' ||
    q.includes('need help with the experiment')
  ) {
    const isExpHelp = q.includes('experiment') || q.includes('help with the experiment');
    const reason = isExpHelp
      ? 'Experiment assistance requested'
      : 'Human assistance requested';
    return {
      intent: 'GROUND_SUPPORT_REQUEST',
      text: 'Ground support request recorded.',
      groundSupportAction: 'REQUEST',
      requestReason: reason,
    };
  }

  // 0b. Cancel Ground Support Request
  if (
    q.includes('cancel ground support') ||
    q.includes('cancel support request') ||
    q.includes('cancel request')
  ) {
    if (groundSupportStatus === 'REQUESTED' || groundSupportStatus === 'ACKNOWLEDGED') {
      return {
        intent: 'GROUND_SUPPORT_CANCEL',
        text: 'Ground support request cancelled.',
        groundSupportAction: 'CANCEL',
      };
    }
    return {
      intent: 'GROUND_SUPPORT_CANCEL_EMPTY',
      text: 'There is no active ground support request to cancel.',
    };
  }

  // 1. "Repeat that" / "Repeat"
  if (
    q === 'repeat that' ||
    q === 'repeat' ||
    q.includes('repeat that') ||
    q.includes('repeat last') ||
    q.includes('say that again')
  ) {
    if (lastSpokenResponse && lastSpokenResponse.trim()) {
      return {
        intent: 'REPEAT_LAST',
        text: lastSpokenResponse,
      };
    }
    return {
      intent: 'REPEAT_EMPTY',
      text: 'I have not provided a previous instruction.',
    };
  }

  // 2. "Did I complete the previous stage?" / "Did I finish the step?" / "Is stage complete?"
  if (
    q.includes('complete the previous') ||
    q.includes('completed the previous') ||
    q.includes('did i finish') ||
    q.includes('is the stage complete') ||
    q.includes('is stage complete') ||
    q.includes('did i complete')
  ) {
    return {
      intent: 'STAGE_COMPLETION_INQUIRY',
      text: "I don't have enough validated information to confirm completion of that stage.",
    };
  }

  // 3. "What is Cytoskeleton?" / "Tell me about this experiment"
  if (
    q.includes('what is cytoskeleton') ||
    q.includes('about this experiment') ||
    q.includes('tell me about the experiment') ||
    q.includes('explain cytoskeleton')
  ) {
    if (selectedExperiment?.id === 'cytoskeleton' || q.includes('cytoskeleton')) {
      return {
        intent: 'CYTOSKELETON_EXPLANATION',
        text: 'Cytoskeleton is a biological experiment studying how human cells behave under weightlessness, including changes in RhoGTPase function.',
      };
    }
    if (selectedExperiment) {
      return {
        intent: 'EXPERIMENT_EXPLANATION',
        text: `${selectedExperiment.name} is an onboard experiment studying ${selectedExperiment.description.toLowerCase()}`,
      };
    }
    return {
      intent: 'EXPERIMENT_QUERY_EMPTY',
      text: 'No experiment context has been selected.',
    };
  }

  // 4. "What is the purpose of this experiment?" / "Purpose"
  if (
    q.includes('purpose') ||
    q.includes('scientific objective') ||
    q.includes('goal of this experiment') ||
    q.includes('what is the objective')
  ) {
    if (selectedExperiment) {
      return {
        intent: 'EXPERIMENT_PURPOSE',
        text: 'The experiment studies changes in human cell function when in-vitro cell cultures are exposed to weightlessness.',
      };
    }
    return {
      intent: 'EXPERIMENT_QUERY_EMPTY',
      text: 'No experiment context has been selected.',
    };
  }

  // 5. "What experiment is this?" / "What experiment is active?"
  if (
    q.includes('what experiment') ||
    q.includes('which experiment') ||
    q.includes('experiment is this') ||
    q.includes('experiment is active') ||
    q.includes('active experiment') ||
    q === 'experiment?'
  ) {
    if (selectedExperiment) {
      const mission = selectedExperiment.mission ? `, part of the ${selectedExperiment.mission} mission` : '';
      const env = selectedExperiment.environment === 'ISS' ? ' on the International Space Station' : '';
      return {
        intent: 'EXPERIMENT_QUERY',
        text: `The active experiment is ${selectedExperiment.name}${mission}${env}.`,
      };
    }
    return {
      intent: 'EXPERIMENT_QUERY_EMPTY',
      text: 'No experiment context has been selected.',
    };
  }

  // 6. "Where am I in the procedure?" / "Where am I in procedure?"
  if (
    q.includes('where am i in the procedure') ||
    q.includes('where am i in procedure') ||
    q.includes('procedure status') ||
    q.includes('where are we')
  ) {
    if (!selectedExperiment) {
      return {
        intent: 'PROCEDURE_NO_CONTEXT',
        text: 'No experiment context is selected, so I cannot provide experiment-specific assistance.',
      };
    }
    if (!demoProcedure || demoProcedure.length === 0) {
      return {
        intent: 'PROCEDURE_NONE_LOADED',
        text: 'No validated procedure is loaded for this experiment.',
      };
    }
    if (procedureState?.status === 'ACTIVE' && currentStage) {
      return {
        intent: 'PROCEDURE_ACTIVE',
        text: `The current demonstration stage is ${currentStage.title.toLowerCase()}.`,
        currentStage,
        nextStage,
      };
    }
    if (procedureState?.status === 'COMPLETED') {
      return {
        intent: 'PROCEDURE_COMPLETED',
        text: 'The demonstration workflow has been completed.',
      };
    }
    return {
      intent: 'PROCEDURE_NOT_STARTED',
      text: 'The demonstration workflow has not been started.',
    };
  }

  // 7. "What is the current procedure?" / "What is the current stage?" / "Current procedure" / "Current stage"
  if (
    q.includes('current procedure') ||
    q.includes('current stage') ||
    q.includes('active stage') ||
    q.includes('what procedure') ||
    q === 'current procedure' ||
    q === 'current stage'
  ) {
    if (!selectedExperiment) {
      return {
        intent: 'TASK_NO_CONTEXT',
        text: 'No experiment context has been selected.',
      };
    }
    if (!demoProcedure || demoProcedure.length === 0) {
      return {
        intent: 'TASK_NONE_LOADED',
        text: 'No validated procedure is loaded for this experiment.',
      };
    }
    if (procedureState?.status === 'ACTIVE' && currentStage) {
      return {
        intent: 'TASK_ACTIVE',
        text: `The current demonstration stage is ${currentStage.title.toLowerCase()}.`,
        currentStage,
        nextStage,
      };
    }
    if (procedureState?.status === 'NOT_STARTED') {
      return {
        intent: 'TASK_NOT_STARTED',
        text: 'The demonstration workflow has not been started.',
      };
    }
    return {
      intent: 'TASK_INACTIVE',
      text: 'No demonstration stage is currently active.',
    };
  }

  // 8. "What's next?" / "What should I do next?" / "What now?"
  if (
    q.includes("what's next") ||
    q.includes('what next') ||
    q.includes('what should i do next') ||
    q.includes('what should i do') ||
    q.includes('what do i do') ||
    q.includes('what now') ||
    q.includes('next stage') ||
    q.includes('next step')
  ) {
    if (!selectedExperiment) {
      return {
        intent: 'WHATS_NEXT_UNSET',
        text: 'No experiment context is selected, so I cannot provide experiment-specific assistance.',
      };
    }
    if (!demoProcedure || demoProcedure.length === 0) {
      return {
        intent: 'WHATS_NEXT_NO_PROCEDURE',
        text: 'No validated procedure is loaded for this experiment.',
      };
    }

    // Return the next stage (or stage 2 if stage 1 is current)
    const targetStage = nextStage || currentStage;

    if (targetStage) {
      return {
        intent: 'WHATS_NEXT_ASSIGNED',
        text: `The next demonstration stage is ${targetStage.title.toLowerCase()}.`,
        currentStage,
        nextStage: targetStage,
      };
    }

    return {
      intent: 'WHATS_NEXT_CONCLUDED',
      text: 'All demonstration stages for this experiment have been concluded.',
    };
  }

  // 8b. "Where am I working?" / "Which workspace area am I in?" / "Where am I?" / "What area is this?"
  if (
    q.includes('where am i working') ||
    q.includes('which workspace area') ||
    q.includes('where am i') ||
    q.includes('what area is this') ||
    q.includes('which area am i in') ||
    q.includes('what zone')
  ) {
    if (trackingStatus !== 'ACTIVE') {
      return {
        intent: 'WORKSPACE_ZONE_UNAVAILABLE',
        text: 'Astronaut tracking is currently unavailable. No workspace area can be identified.',
      };
    }

    const zone = context.workspaceZone;
    if (zone && zone !== 'NO SPECIFIC ZONE' && zone !== 'UNAVAILABLE') {
      const titleCaseZone = zone
        .toLowerCase()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return {
        intent: 'WORKSPACE_ZONE_IDENTIFIED',
        text: `You are currently in the ${titleCaseZone} of the configured experiment workspace.`,
      };
    }

    const act = currentActivity?.activity;
    if (act === 'WORKING AT WORKSPACE' || act === 'POSITIONING AT WORKSPACE') {
      return {
        intent: 'WORKSPACE_ZONE_GENERAL',
        text: 'You are currently working in the configured experiment workspace.',
      };
    }

    return {
      intent: 'WORKSPACE_ZONE_NONE',
      text: 'No specific workspace zone is currently identified.',
    };
  }

  // 9. "What am I doing?" / "What activity do you see?" / "What activity?"
  if (
    q.includes('what am i doing') ||
    q.includes('what activity') ||
    q.includes('current activity') ||
    q.includes('activity do you see') ||
    q.includes('what do you see') ||
    q.includes('my activity')
  ) {
    const act = currentActivity?.activity;

    if (act === 'WORKING AT WORKSPACE') {
      if (selectedExperiment) {
        return {
          intent: 'ACTIVITY_WORKING_CONTEXT',
          text: `You are currently working at the experiment workspace. The active experiment context is ${selectedExperiment.name}.`,
        };
      }
      return {
        intent: 'ACTIVITY_WORKING',
        text: 'The astronaut is currently working at the experiment workspace.',
      };
    }

    if (act === 'POSITIONING AT WORKSPACE' || act === 'POSITIONING') {
      if (selectedExperiment) {
        return {
          intent: 'ACTIVITY_POSITIONING_CONTEXT',
          text: `The astronaut is currently positioning at the experiment workspace for ${selectedExperiment.name}.`,
        };
      }
      return {
        intent: 'ACTIVITY_POSITIONING',
        text: 'The astronaut is currently positioning at the experiment workspace.',
      };
    }

    if (act === 'REPOSITIONING') {
      return {
        intent: 'ACTIVITY_REPOSITIONING',
        text: 'The astronaut is currently repositioning.',
      };
    }

    if (act === 'APPROACHING WORKSPACE') {
      return {
        intent: 'ACTIVITY_APPROACHING',
        text: 'The astronaut is currently approaching the workspace.',
      };
    }

    if (act === 'AWAY / IDLE') {
      return {
        intent: 'ACTIVITY_AWAY',
        text: 'The astronaut is currently away from the main workstation.',
      };
    }

    if (act === 'ACTIVITY UNCERTAIN') {
      return {
        intent: 'ACTIVITY_UNCERTAIN',
        text: "I can't confidently determine the current activity yet.",
      };
    }

    return {
      intent: 'ACTIVITY_AWAITING',
      text: 'No active astronaut activity is currently detected.',
    };
  }

  // 10. "Are you tracking me?" / "Are you tracking?"
  if (
    q.includes('tracking me') ||
    q.includes('are you tracking') ||
    q.includes('tracking active') ||
    q.includes('track me')
  ) {
    if (trackingStatus === 'ACTIVE') {
      return {
        intent: 'TRACKING_QUERY_ACTIVE',
        text: 'Yes. Astronaut tracking is active.',
      };
    }
    if (trackingStatus === 'SEARCHING') {
      return {
        intent: 'TRACKING_QUERY_SEARCHING',
        text: 'Astronaut tracking is currently searching for target.',
      };
    }
    return {
      intent: 'TRACKING_QUERY_NO_TARGET',
      text: "I don't currently have a reliable astronaut target.",
    };
  }

  // 11. "Which camera is active?" / "What camera?"
  if (
    q.includes('camera') ||
    q.includes('which camera') ||
    q.includes('what camera') ||
    q.includes('feed')
  ) {
    if (cameraStatus === 'LIVE') {
      return {
        intent: 'CAMERA_QUERY',
        text: 'Camera 01 is active and assigned to this workstation.',
      };
    }
    return {
      intent: 'CAMERA_QUERY_OFFLINE',
      text: 'Camera 01 is currently offline.',
    };
  }

  // 12. "Is everything ready?" / "Is the system ready?" / "System status?"
  if (
    q.includes('ready') ||
    q.includes('is everything ready') ||
    q.includes('system ready') ||
    q.includes('system status')
  ) {
    if (selectedExperiment) {
      if (trackingStatus === 'ACTIVE' && cameraStatus === 'LIVE') {
        return {
          intent: 'STATUS_ALL_READY',
          text: 'Camera is live, astronaut tracking is active, and the experiment context is ready.',
        };
      }
      return {
        intent: 'STATUS_PARTIAL_READY',
        text: `Camera is ${cameraStatus.toLowerCase()} and experiment context is ready, but astronaut tracking is ${trackingStatus.toLowerCase()}.`,
      };
    }
    return {
      intent: 'STATUS_NO_CONTEXT',
      text: 'Camera is live and tracking is active, but no experiment context has been selected.',
    };
  }

  // 13. Fallback
  return {
    intent: 'GENERAL_FALLBACK',
    text: 'I am monitoring the workstation. You can ask about current activity, experiment context, or procedure stages.',
  };
}

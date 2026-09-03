import type { ExperimentProfile } from '../types/astra';

export const EXPERIMENT_PROFILES: ExperimentProfile[] = [
  {
    id: 'cytoskeleton',
    name: 'Cytoskeleton',
    mission: 'Cosmic Kiss',
    environment: 'ISS',
    astronaut: 'Matthias Maurer',
    camera: 'CAMERA 01',
    payload: 'COL-BIOLAB-LSG',
    description: 'ESA biological study on the behavior of human cell cultures in weightlessness.',
    objective:
      'Study how human cells behave in weightlessness, including changes in RhoGTPase function in in-vitro cell cultures.',
    documentedActivities: [
      'Remove Cytoskeleton cell cultures from the Minus Eighty Lab Freezer ISS (MELFI).',
      'Prepare the cell cultures in the Life Sciences Glovebox (LSG).',
      'Install the experiment in Columbus\'s BioLab.',
    ],
    demoProcedure: [
      {
        stageNumber: 1,
        title: 'Cell culture retrieval',
        description: 'Retrieve the Cytoskeleton cell cultures from the designated cold-storage location.',
      },
      {
        stageNumber: 2,
        title: 'Cell culture preparation',
        description: 'Prepare the cell cultures in the Life Sciences Glovebox.',
      },
      {
        stageNumber: 3,
        title: 'Experiment installation',
        description: 'Install the prepared experiment in Columbus\'s BioLab.',
      },
    ],
  },
  {
    id: 'exp-capillary-flow',
    name: 'Capillary Flow & Fluid Physics',
    mission: 'Cosmic Kiss',
    environment: 'ISS',
    camera: 'CAMERA 01',
    payload: 'BAS-EXP-02',
    description: 'Observation of liquid interface dynamics and capillary migration inside test channels.',
    // Intentionally no procedure loaded to test: "No validated procedure is loaded for this experiment."
  },
];

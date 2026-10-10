import type { Project } from './schema';

export type WorkflowStep = 0 | 1 | 2 | 3 | 4 | 5;

type StoredProject = Omit<Project, 'completedThrough'> & { completedThrough?: number };

function inferLegacyProgress(project: StoredProject): number {
  if (project.released) return 6;
  if (project.evaluation && project.messages.some((message) => message.role === 'assistant') && project.feedback.trim() && project.verdict) return 5;
  if (project.agent) return 4;
  if (project.materials.length) return 3;
  if (project.brief && project.skills.length) return 1;
  return 0;
}

export function normalizeProject(project: StoredProject): Project {
  const progress = project.completedThrough ?? inferLegacyProgress(project);
  return { ...project, completedThrough: Math.max(0, Math.min(6, progress)) };
}

export function getResumeStep(project: Project): WorkflowStep {
  return Math.min(project.completedThrough, 5) as WorkflowStep;
}

export function canOpenStep(project: Project, step: WorkflowStep): boolean {
  return step <= getResumeStep(project);
}

export function completeThrough(project: Project, completed: number): Project {
  return { ...project, completedThrough: Math.max(project.completedThrough, Math.min(6, completed)) };
}

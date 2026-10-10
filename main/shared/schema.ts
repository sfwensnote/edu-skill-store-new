import { z } from 'zod';

const short = z.string().trim().min(1).max(2000);
const briefSchema = z.object({ audience: short, goal: short, task: short, boundary: short });
const skillSchema = z.object({
  id: z.string().min(1).max(80),
  name: short,
  description: short,
  reason: short,
  education: short,
  technology: short,
  instruction: short,
  enabled: z.boolean(),
});
export const designSchema = z.object({ brief: briefSchema, skills: z.array(skillSchema).min(1).max(6) });
const materialSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  text: z.string().min(1).max(16000),
});
export const agentSchema = z
  .object({
    name: short,
    version: z.number().int().positive(),
    brief: briefSchema,
    skills: z.array(skillSchema).min(1).max(6),
    materials: z.array(materialSchema).max(5),
  })
  .refine((a) => a.materials.reduce((n, m) => n + m.text.length, 0) <= 24000, '材料总量超过 24,000 字符');
export const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(12000),
});
export type Brief = z.infer<typeof briefSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Material = z.infer<typeof materialSchema>;
export type Agent = z.infer<typeof agentSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Mode = 'demo' | 'live';
export type Check = {
  name: string;
  kind: 'technical' | 'education';
  status: 'pass' | 'review' | 'pending';
  reason: string;
  input?: string;
  output?: string;
  latency?: number;
};
export type Evaluation = { version: number; mode: Mode; time: string; checks: Check[] };
export type Project = {
  id: string;
  name: string;
  demand: string;
  brief: Brief | null;
  skills: Skill[];
  materials: Material[];
  agent: Agent | null;
  revision: number;
  evaluation: Evaluation | null;
  messages: Message[];
  feedback: string;
  verdict: '' | 'yes' | 'adjust';
  released: boolean;
  completedThrough: number;
  updatedAt: string;
};
export type Status = { mode: Mode; designReady: boolean; teachingReady: boolean };

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { seedPlatform } from './platform/seed';
mkdirSync('data', { recursive: true });
export const db = new DatabaseSync(path.resolve(process.env.DATABASE_PATH || 'data/workspace.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, hash TEXT, salt TEXT);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT, expires INTEGER);
CREATE TABLE IF NOT EXISTS projects (id TEXT, user_id TEXT, payload TEXT, updated_at TEXT, PRIMARY KEY(id,user_id));
CREATE TABLE IF NOT EXISTS assistants (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, goal TEXT NOT NULL,
  grade TEXT NOT NULL, subject TEXT NOT NULL, activity TEXT NOT NULL,
  status TEXT NOT NULL, is_public INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS designer_messages (
  id TEXT PRIMARY KEY, assistant_id TEXT NOT NULL, role TEXT NOT NULL,
  content TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY, assistant_id TEXT NOT NULL, name TEXT NOT NULL,
  summary TEXT NOT NULL, purpose TEXT NOT NULL, trigger TEXT NOT NULL,
  behavior_steps TEXT NOT NULL, constraints TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assistant_versions (
  id TEXT PRIMARY KEY, assistant_id TEXT NOT NULL, version TEXT NOT NULL,
  name TEXT NOT NULL, goal TEXT NOT NULL, skills_snapshot TEXT NOT NULL,
  compiled_prompt TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS test_runs (
  id TEXT PRIMARY KEY, assistant_id TEXT NOT NULL, version_id TEXT NOT NULL,
  status TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT
);
CREATE TABLE IF NOT EXISTS test_cases (
  id TEXT PRIMARY KEY, test_run_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  type TEXT NOT NULL, title TEXT NOT NULL, scenario TEXT NOT NULL,
  student_input TEXT NOT NULL, expected TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY, test_case_id TEXT NOT NULL, agent_response TEXT NOT NULL,
  activated_skill_ids TEXT NOT NULL, trigger_result TEXT NOT NULL,
  behavior_result TEXT NOT NULL, constraint_result TEXT NOT NULL,
  verdict TEXT NOT NULL, summary TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS usage_sessions (
  id TEXT PRIMARY KEY, assistant_id TEXT NOT NULL, started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL, turn_count INTEGER NOT NULL, anomaly_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS usage_messages (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, role TEXT NOT NULL,
  content TEXT NOT NULL, active_skill_ids TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS anomalies (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, skill_id TEXT,
  type TEXT NOT NULL, description TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS run_reports (
  id TEXT PRIMARY KEY, assistant_id TEXT NOT NULL, period_start TEXT NOT NULL,
  period_end TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assistants_user ON assistants(user_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_skills_assistant ON skills(assistant_id);
CREATE INDEX IF NOT EXISTS idx_usage_assistant ON usage_sessions(assistant_id,started_at);
`);
seedPlatform(db);

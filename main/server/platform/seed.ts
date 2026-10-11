import { randomUUID, scryptSync } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { createDefaultSkills } from './mock-ai';

const demoUserId = 'demo-teacher';
const demoEmail = 'teacher@example.com';
const demoPassword = 'teacher123';

const publicAssistants = [
  ['library-equation', '一元一次方程错因诊断助手', '先理解学生的解题过程，再判断错误发生在哪一步，并通过逐步提示帮助学生自行修正。', '初中', '数学', '错因诊断'],
  ['library-reading', '阅读理解引导助手', '通过追问帮助学生梳理文章信息、把握主旨，并形成自己的观点。', '初中', '语文', '阅读'],
  ['library-writing', '英语写作指导助手', '从审题、构思到表达，逐步引导学生完成英文写作并提供修改建议。', '高中', '英语', '写作'],
  ['library-experiment', '实验探究辅助助手', '帮助学生理解实验原理、设计探究步骤，并引导分析实验结果。', '高中', '化学', '实验探究'],
  ['library-homework', '作业讲评助手', '根据学生作业情况定位共性与个性问题，提供有针对性的讲评思路。', '初中', '数学', '作业讲评'],
  ['library-thinking', '解题思路引导助手', '通过启发式提问帮助学生理清题目条件，逐步找到解题思路。', '高中', '物理', '思路引导'],
  ['library-layered', '分层练习推荐助手', '根据学生当前掌握情况推荐不同难度的练习，帮助学生巩固提升。', '小学', '数学', '分层练习'],
  ['library-check', '学习检测助手', '通过有针对性的提问检测知识掌握情况，并给出反馈与建议。', '高中', '生物', '学习检测'],
  ['library-geography', '地理读图引导助手', '引导学生观察地图信息，建立空间联系并解释地理现象。', '初中', '地理', '课堂练习'],
  ['library-history', '历史材料分析助手', '帮助学生提取史料信息，区分观点与事实并形成证据链。', '高中', '历史', '阅读'],
  ['library-primary-read', '小学语文朗读助手', '用短问题帮助学生理解段落意思，并关注朗读节奏与情感。', '小学', '语文', '阅读'],
  ['library-science', '科学观察记录助手', '引导学生描述观察证据、提出猜想并记录简单结论。', '小学', '科学', '实验探究'],
] as const;

export function seedPlatform(db: DatabaseSync) {
  const now = new Date().toISOString();
  if (!db.prepare('SELECT id FROM users WHERE id=?').get(demoUserId)) {
    const salt = 'demo-teacher-salt';
    db.prepare('INSERT INTO users(id,email,name,hash,salt) VALUES(?,?,?,?,?)').run(
      demoUserId,
      demoEmail,
      '张老师',
      scryptSync(demoPassword, salt, 64).toString('hex'),
      salt,
    );
  }

  const addAssistant = db.prepare(
    `INSERT OR IGNORE INTO assistants
      (id,user_id,name,goal,grade,subject,activity,status,is_public,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const addSkill = db.prepare(
    `INSERT OR IGNORE INTO skills
      (id,assistant_id,name,summary,purpose,trigger,behavior_steps,constraints,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?)`,
  );

  const defaultSkills = createDefaultSkills();
  for (const [id, name, goal, grade, subject, activity] of publicAssistants) {
    addAssistant.run(id, demoUserId, name, goal, grade, subject, activity, 'ACTIVE', 1, now, now);
    defaultSkills.forEach((skill, index) => {
      const adaptedId = `${id}-${index + 1}`;
      addSkill.run(
        adaptedId,
        id,
        skill.name,
        skill.summary,
        skill.purpose,
        skill.trigger,
        JSON.stringify(skill.behaviorSteps),
        JSON.stringify(skill.constraints),
        now,
        now,
      );
    });
  }

  addAssistant.run(
    'assistant-demo-active',
    demoUserId,
    '七年级数学教学助手',
    '帮助七年级学生理解一元一次方程，在出现错误时先引导学生解释思路，再根据需要逐步提供帮助。',
    '初中',
    '数学',
    '错因诊断',
    'ACTIVE',
    0,
    now,
    now,
  );
  addAssistant.run(
    'assistant-demo-draft',
    demoUserId,
    '课堂提问设计助手',
    '帮助教师把教学目标转化为层层推进的课堂问题。',
    '初中',
    '数学',
    '课堂练习',
    'DRAFT',
    0,
    now,
    now,
  );
  for (const assistantId of ['assistant-demo-active', 'assistant-demo-draft']) {
    defaultSkills.forEach((skill) =>
      addSkill.run(
        `${assistantId}-${skill.id}`,
        assistantId,
        skill.name,
        skill.summary,
        skill.purpose,
        skill.trigger,
        JSON.stringify(skill.behaviorSteps),
        JSON.stringify(skill.constraints),
        now,
        now,
      ),
    );
  }

  seedUsage(db, now);
}

function seedUsage(db: DatabaseSync, now: string) {
  const count = Number(
    (db.prepare('SELECT COUNT(*) AS count FROM usage_sessions WHERE assistant_id=?').get('assistant-demo-active') as {
      count: number;
    }).count,
  );
  if (count) return;
  const sessions = [
    ['demo-session-1', '2026-09-09T14:32:00.000Z', 8, 0],
    ['demo-session-2', '2026-09-09T10:15:00.000Z', 5, 0],
    ['demo-session-3', '2026-09-08T16:20:00.000Z', 12, 1],
    ['demo-session-4', '2026-09-08T09:41:00.000Z', 6, 0],
    ['demo-session-5', '2026-09-07T15:03:00.000Z', 10, 1],
    ['demo-session-6', '2026-09-07T11:18:00.000Z', 4, 0],
  ] as const;
  const insertSession = db.prepare(
    'INSERT INTO usage_sessions(id,assistant_id,started_at,ended_at,turn_count,anomaly_count) VALUES(?,?,?,?,?,?)',
  );
  const insertMessage = db.prepare(
    'INSERT INTO usage_messages(id,session_id,role,content,active_skill_ids,created_at) VALUES(?,?,?,?,?,?)',
  );
  const insertAnomaly = db.prepare(
    'INSERT INTO anomalies(id,session_id,skill_id,type,description,created_at) VALUES(?,?,?,?,?,?)',
  );
  sessions.forEach(([id, startedAt, turnCount, anomalyCount], index) => {
    insertSession.run(id, 'assistant-demo-active', startedAt, startedAt, turnCount, anomalyCount);
    const skillIds = index % 2 ? ['assistant-demo-active-progressive-hint'] : ['assistant-demo-active-reflect'];
    insertMessage.run(randomUUID(), id, 'user', '这道一元一次方程我不知道哪里做错了。', '[]', startedAt);
    insertMessage.run(
      randomUUID(),
      id,
      'assistant',
      '先把你从原式到现在结果的计算过程写出来，我们从这一步一起看。',
      JSON.stringify(skillIds),
      startedAt,
    );
    if (anomalyCount) {
      insertAnomaly.run(
        randomUUID(),
        id,
        skillIds[0],
        'CONSTRAINT_VIOLATION',
        index === 2 ? '第二次提示过于直接' : '未能识别学生的知识点混淆',
        now,
      );
    }
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRunMetrics, type CompanionRunDetail } from '../src/features/execution/companion-run-metrics';
import type { Activation, RecordedMessage, Trial, TrialSession } from '../shared/execution';

function activation(entryId: string, ended = false): Activation {
  return { entryId, step: 0, ended, reason: '记录触发', evidence: [{ messageId: 'record', quote: '引文' }] };
}

function message(
  id: string,
  role: 'user' | 'assistant',
  content: string,
  at: string,
  activations: Activation[] = [],
): RecordedMessage {
  return { id, role, content, at, activations };
}

function method(entryId: string, name: string): Trial['methods'][number] {
  return { entryId, skill: { name } } as Trial['methods'][number];
}

function trial(overrides: Partial<Trial> = {}): Trial {
  return {
    id: 'trial-1',
    ownerId: 'owner-1',
    companion: { id: 'companion-1' } as Trial['companion'],
    methods: [method('entry-a', '方法甲')],
    verifications: [],
    model: 'model-x',
    status: 'open',
    createdAt: '2026-10-13T01:00:00.000Z',
    expiresAt: '2026-10-20T01:00:00.000Z',
    capacity: 10,
    ...overrides,
  };
}

function session(overrides: Partial<TrialSession> & { id: string }): TrialSession {
  return {
    trialId: 'trial-1',
    audience: 'student',
    name: '学伴一',
    messages: [],
    pending: false,
    error: '',
    createdAt: '2026-10-13T01:00:00.000Z',
    ...overrides,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

const at = (iso: string) => `2026-10-13T${iso}`;
const nowAt = (iso: string) => Date.parse(iso);

test('空数据返回零值与空趋势，不抛出', () => {
  const metrics = buildRunMetrics([{ trial: trial(), sessions: [] }]);
  assert.deepEqual(metrics, {
    activationCount: 0,
    assistantTurns: 0,
    conversationCount: 0,
    methodUsage: [{ entryId: 'entry-a', name: '方法甲', count: 0 }],
    durationTrend: [],
    rows: [],
  });
});

test('按实际 assistant 激活与回复统计，方法频次取运行快照名称', () => {
  const details: CompanionRunDetail = {
    trial: trial({ methods: [method('entry-a', '追问方法'), method('entry-b', '错因方法')] }),
    sessions: [
      session({
        id: 's1', name: '甲',
        messages: [
          message('m1', 'user', '老师你好', at('01:00:00.000Z')),
          message('m2', 'assistant', '同学你好', at('01:02:00.000Z'), [activation('entry-a'), activation('entry-a', true)]),
          message('m3', 'assistant', '再想一想', at('01:05:00.000Z'), [activation('entry-b')]),
        ],
      }),
      session({
        id: 's2', name: '乙', audience: 'teacher',
        messages: [
          message('m4', 'user', '试一下', at('02:00:00.000Z')),
          message('m5', 'assistant', '我来回答', at('02:01:30.000Z'), [activation('entry-b')]),
        ],
      }),
    ],
  };

  const metrics = buildRunMetrics([details], nowAt('2026-10-13T03:00:00.000Z'));

  assert.equal(metrics.activationCount, 4);
  assert.equal(metrics.assistantTurns, 3);
  assert.equal(metrics.conversationCount, 2);
  assert.equal(metrics.rows.length, 2);
  assert.deepEqual(metrics.methodUsage, [
    { entryId: 'entry-a', name: '追问方法', count: 2 },
    { entryId: 'entry-b', name: '错因方法', count: 2 },
  ]);

  const [first, second] = metrics.rows;
  assert.equal(first.sessionId, 's1');
  assert.equal(first.trialId, 'trial-1');
  assert.equal(first.audience, 'student');
  assert.equal(first.messageCount, 3);
  assert.equal(first.assistantTurns, 2);
  assert.equal(first.activationCount, 3);
  assert.equal(first.durationSeconds, 300);
  assert.equal(first.status, 'running');
  assert.equal(first.endingObserved, true);
  assert.equal(second.audience, 'teacher');
  assert.equal(second.durationSeconds, 90);
  assert.equal(second.endingObserved, false);

  assert.deepEqual(metrics.durationTrend, [{ day: '2026-10-13', minutes: 6.5 }]);
});

test('上海日期趋势按会话开始时间分日累计', () => {
  const details = {
    trial: trial(),
    sessions: [
      session({ id: 's1', messages: [
        message('m1', 'assistant', '早安', '2026-10-13T15:00:00.000Z'),
        message('m2', 'assistant', '早读结束', '2026-10-13T15:05:00.000Z'),
      ] }),
      session({ id: 's2', messages: [
        message('m3', 'assistant', '凌晨', '2026-10-13T16:00:00.000Z'),
        message('m4', 'assistant', '凌晨继续', '2026-10-13T16:20:00.000Z'),
      ] }),
    ],
  };

  const metrics = buildRunMetrics([details], nowAt('2026-10-14T00:00:00.000Z'));

  assert.deepEqual(metrics.durationTrend, [
    { day: '2026-10-13', minutes: 5 },
    { day: '2026-10-14', minutes: 20 },
  ]);
});

test('不足两条有效时间或时间损坏时不填造时长', () => {
  const details = {
    trial: trial(),
    sessions: [
      session({ id: 's1', messages: [message('m1', 'assistant', '只有一条', at('01:00:00.000Z'))] }),
      session({ id: 's2', messages: [
        message('m1', 'user', '你好', '不是时间'),
        message('m2', 'assistant', '回复', '也坏了'),
      ] }),
      session({ id: 's3', messages: [
        message('m1', 'user', '你好', at('03:00:00.000Z')),
        message('m2', 'assistant', '回复', '坏时间'),
      ] }),
    ],
  };

  const metrics = buildRunMetrics([details], nowAt('2026-10-13T05:00:00.000Z'));

  assert.equal(metrics.rows[0].durationSeconds, null);
  assert.equal(metrics.rows[1].durationSeconds, null);
  assert.equal(metrics.rows[2].durationSeconds, null);
  assert.equal(metrics.rows[1].messageCount, 2);
  assert.deepEqual(metrics.durationTrend, []);
});

test('运行状态按关闭、撤销与过期时间判定', () => {
  const now = nowAt('2026-10-13T12:00:00.000Z');
  const messages = [message('m1', 'assistant', '回复', at('01:00:00.000Z'))];
  const statusOf = (overrides: Partial<Trial>) => buildRunMetrics(
    [{ trial: trial(overrides), sessions: [session({ id: 's1', messages })] }],
    now,
  ).rows[0].status;

  assert.equal(statusOf({ status: 'closed' }), 'ended');
  assert.equal(statusOf({ status: 'revoked' }), 'revoked');
  assert.equal(statusOf({ status: 'open', expiresAt: '2026-10-13T06:00:00.000Z' }), 'expired');
  assert.equal(statusOf({ status: 'open', expiresAt: '2026-10-13T18:00:00.000Z' }), 'running');
  assert.equal(statusOf({ status: 'open', expiresAt: '坏时间' }), 'running');
});

test('只统计实际回复，空占位消息不构成对话', () => {
  const details = {
    trial: trial(),
    sessions: [
      session({ id: 'pending', pending: true, messages: [
        message('m1', 'user', '', at('01:00:00.000Z')),
        message('m2', 'assistant', '   ', at('01:00:00.000Z')),
      ] }),
      session({ id: 'real', messages: [
        message('m3', 'assistant', '真实回复', at('01:00:00.000Z'), [activation('entry-a')]),
      ] }),
    ],
  };

  const metrics = buildRunMetrics([details], nowAt('2026-10-13T03:00:00.000Z'));

  assert.equal(metrics.rows.length, 1);
  assert.equal(metrics.rows[0].sessionId, 'real');
  assert.equal(metrics.rows.some(row => row.sessionId === 'pending'), false);
  assert.equal(metrics.conversationCount, 1);
  assert.equal(metrics.assistantTurns, 1);
  assert.equal(metrics.activationCount, 1);
});

test('按 session 与 message ID 去重后再统计', () => {
  const details: CompanionRunDetail = {
    trial: trial(),
    sessions: [
      session({ id: 's1', messages: [
        message('m1', 'assistant', '回复一', at('01:00:00.000Z'), [activation('entry-a')]),
        message('m1', 'assistant', '回复一', at('01:00:00.000Z'), [activation('entry-a')]),
        message('m2', 'assistant', '回复二', at('01:02:00.000Z'), [activation('entry-a')]),
      ] }),
      session({ id: 's1', messages: [
        message('m9', 'assistant', '重复会话', at('01:00:00.000Z'), [activation('entry-a')]),
      ] }),
    ],
  };

  const metrics = buildRunMetrics([details], nowAt('2026-10-13T03:00:00.000Z'));

  assert.equal(metrics.rows.length, 1);
  assert.equal(metrics.rows[0].messageCount, 2);
  assert.equal(metrics.rows[0].assistantTurns, 2);
  assert.equal(metrics.rows[0].activationCount, 2);
  assert.equal(metrics.rows[0].durationSeconds, 120);
  assert.equal(metrics.activationCount, 2);
  assert.equal(metrics.conversationCount, 1);
  assert.deepEqual(metrics.methodUsage, [{ entryId: 'entry-a', name: '方法甲', count: 2 }]);
});

test('不修改传入的运行快照与消息顺序', () => {
  const input: CompanionRunDetail = {
    trial: trial(),
    sessions: [
      session({ id: 's1', messages: [
        message('m2', 'assistant', '回复', at('01:02:00.000Z'), [activation('entry-a')]),
        message('m1', 'user', '你好', at('01:00:00.000Z')),
      ] }),
    ],
  };
  const snapshot = JSON.stringify(input);
  deepFreeze(input);

  const metrics = buildRunMetrics([input], nowAt('2026-10-13T03:00:00.000Z'));

  assert.equal(JSON.stringify(input), snapshot);
  assert.deepEqual(metrics.rows[0].messages.map(item => item.id), ['m2', 'm1']);
  assert.equal(metrics.rows[0].durationSeconds, 120);
  assert.equal(metrics.rows[0].messages[0], input.sessions[0].messages[0]);
});

test('只计 assistant 消息的激活，user 消息的激活不串入统计', () => {
  const details: CompanionRunDetail = {
    trial: trial({ methods: [method('entry-a', '方法甲'), method('entry-b', '方法乙')] }),
    sessions: [
      session({ id: 's1', messages: [
        message('m1', 'user', '我提交了', at('01:00:00.000Z'), [activation('entry-a', true)]),
        message('m2', 'assistant', '真实触发', at('01:02:00.000Z'), [activation('entry-b')]),
      ] }),
    ],
  };

  const metrics = buildRunMetrics([details], nowAt('2026-10-13T03:00:00.000Z'));

  assert.equal(metrics.activationCount, 1);
  assert.equal(metrics.rows[0].activationCount, 1);
  assert.equal(metrics.rows[0].endingObserved, false);
  assert.deepEqual(metrics.methodUsage, [
    { entryId: 'entry-a', name: '方法甲', count: 0 },
    { entryId: 'entry-b', name: '方法乙', count: 1 },
  ]);
});

test('多个运行时各快照只累加自身 session，外来与未触发方法按快照保留', () => {
  const detailA: CompanionRunDetail = {
    trial: trial({ id: 'run-a', methods: [method('entry-a', '快照甲'), method('entry-b', '未触发')] }),
    sessions: [
      session({ id: 's1', trialId: 'run-a', messages: [
        message('m1', 'assistant', '甲的回复', at('01:00:00.000Z'), [activation('entry-a')]),
      ] }),
      session({ id: 's-foreign', trialId: 'run-b', messages: [
        message('m2', 'assistant', '外来数据', at('01:01:00.000Z'), [activation('entry-a')]),
      ] }),
    ],
  };
  const detailB: CompanionRunDetail = {
    trial: trial({ id: 'run-b', methods: [method('entry-a', '快照乙')] }),
    sessions: [
      session({ id: 's2', trialId: 'run-b', messages: [
        message('m3', 'assistant', '乙的回复', at('02:00:00.000Z'), [activation('entry-a'), activation('entry-a')]),
      ] }),
    ],
  };

  const metrics = buildRunMetrics([detailA, detailB], nowAt('2026-10-13T04:00:00.000Z'));

  assert.deepEqual(metrics.rows.map(row => row.sessionId), ['s1', 's2']);
  assert.equal(metrics.activationCount, 3);
  assert.equal(metrics.assistantTurns, 2);
  assert.deepEqual(metrics.methodUsage, [
    { entryId: 'entry-a', name: '快照甲', count: 1 },
    { entryId: 'entry-b', name: '未触发', count: 0 },
    { entryId: 'entry-a', name: '快照乙', count: 2 },
  ]);
});

test('同一 session 跨 details 重复出现只统计一次', () => {
  const makeDetail = (): CompanionRunDetail => ({
    trial: trial(),
    sessions: [
      session({ id: 's1', messages: [
        message('m1', 'assistant', '回复', at('01:00:00.000Z'), [activation('entry-a')]),
      ] }),
    ],
  });

  const metrics = buildRunMetrics([makeDetail(), makeDetail()], nowAt('2026-10-13T04:00:00.000Z'));

  assert.equal(metrics.rows.length, 1);
  assert.equal(metrics.activationCount, 1);
  assert.equal(metrics.conversationCount, 1);
  assert.deepEqual(metrics.methodUsage, [{ entryId: 'entry-a', name: '方法甲', count: 1 }]);
});

import path from 'node:path';
import { appRoot, assertNodeVersion, pcEnvironment, readPrivateConfig, validateLiveSettings } from './pc-config';

try {
  assertNodeVersion();
  const env = pcEnvironment(await readPrivateConfig(path.join(appRoot, '.env')));
  validateLiveSettings(env);
  const checked = new Set<string>();
  for (const role of ['DESIGN', 'TEACHING']) {
    const url = env[`${role}_MODEL_URL`]!.replace(/\/$/, ''), model = env[`${role}_MODEL_NAME`]!, key = env[`${role}_MODEL_KEY`]!;
    if (checked.has(`${url}\n${model}\n${key}`)) continue;
    const response = await fetch(`${url}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: '请只回复：连接正常。' }], max_tokens: 256, temperature: 0 }),
      signal: AbortSignal.timeout(60000),
    }).catch(() => { throw new Error('模型中转连接失败或超时，请检查这台 PC 的网络和本机配置。'); });
    if (!response.ok) throw new Error(`模型中转返回 HTTP ${response.status}，请检查本机模型配置。`);
    const result = await response.json().catch(() => { throw new Error('模型中转没有返回有效 JSON。'); });
    if (typeof result.choices?.[0]?.message?.content !== 'string' || !result.choices[0].message.content.trim())
      throw new Error('模型没有返回有效回复，请检查模型名称。');
    checked.add(`${url}\n${model}\n${key}`);
    console.log(`${role === 'DESIGN' ? '检测' : '教学'}模型调用成功。`);
  }
  console.log('模型连通检查完成；教学方法仍需分别执行 SKILL 检测。');
} catch (error) { console.error(error instanceof Error ? error.message : '模型连通检查未完成。'); process.exitCode = 1; }

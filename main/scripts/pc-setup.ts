import path from 'node:path';
import { parse } from 'dotenv';
import { appRoot, assertNodeVersion, configurePc, readPrivateConfig, savePrivateConfig, secretInput } from './pc-config';

try {
  assertNodeVersion();
  const file = path.join(appRoot, '.env');
  const contents = await readPrivateConfig(file), existing = parse(contents);
  const missingKey = ['DESIGN', 'TEACHING'].some(role => !existing[`${role}_MODEL_KEY`]);
  const key = missingKey ? await secretInput('模型中转密钥（输入不会显示）：') : '';
  const next = configurePc(contents, key);
  if (next !== contents) await savePrivateConfig(file, next);
  console.log('本机配置已保存；已有模型和数据库设置保留，前后端使用同源本机地址。');
  console.log('模型使用 HTTP 中转时，后端按已指定的地址直接调用。密钥只保存在私有 .env。');
} catch (error) { console.error(error instanceof Error ? error.message : '本机配置未完成。'); process.exitCode = 1; }

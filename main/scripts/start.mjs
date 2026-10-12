import { fileURLToPath } from 'node:url';
import { register } from 'tsx/esm/api';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
process.env.NODE_ENV = 'production';
register();
await import('../server/index.ts');

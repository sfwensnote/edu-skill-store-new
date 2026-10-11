import { createProtocolModel } from './fixtures/execution-model';

const { server } = createProtocolModel();
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address !== 'object') throw new Error('模型协议服务器未启动');
for (const role of ['DESIGN', 'TEACHING']) {
  process.env[`${role}_MODEL_URL`] = `http://127.0.0.1:${address.port}/v1`;
  process.env[`${role}_MODEL_NAME`] = `protocol-${role}`;
  delete process.env[`${role}_MODEL_KEY`];
}
await import('../server/index');

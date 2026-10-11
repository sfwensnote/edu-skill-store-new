import { ExecutionError } from './repository';

let active = 0;
const queue: (() => Promise<void>)[] = [];
export function assertJobCapacity() {
  if (queue.length >= 16) throw new ExecutionError('服务正在处理较多任务，请稍后重试。', 429);
}
export function schedule(work: () => Promise<void>) {
  assertJobCapacity();
  queue.push(work);
  function drain() {
    while (active < 2 && queue.length) {
      active++;
      void queue.shift()!().catch(() => { /* 任务自行记录失败；存储失败不会生成成功结果。 */ }).finally(() => { active--; drain(); });
    }
  }
  drain();
}

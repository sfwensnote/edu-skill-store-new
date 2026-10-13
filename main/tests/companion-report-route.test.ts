import test from 'node:test';
import assert from 'node:assert/strict';
import { activeNavigationPage, navigationRoute, readRoute, returnRoute, routeHash } from '../src/lib/routes';

test('学伴报告保留对应学伴与运行记录，返回链和主导航保持一致', () => {
  const detail = { page: 'companion-detail', companionId: '学伴/一' } as const;
  const report = navigationRoute(detail, { page: 'companion-report', companionId: detail.companionId, trialId: '运行/一' });
  assert.deepEqual(readRoute(routeHash(report)), report);
  assert.equal(activeNavigationPage(report), 'companions');
  assert.deepEqual(returnRoute(report, { page: 'companions' }), detail);
  const practice = navigationRoute(report, { page: 'companion-practice', companionId: detail.companionId });
  assert.deepEqual(returnRoute(practice, detail), report);
  assert.deepEqual(readRoute('#/companions/one/report'), { page: 'companion-report', companionId: 'one', trialId: undefined });
});

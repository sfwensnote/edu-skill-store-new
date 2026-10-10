import { ArrowRight, BookOpenCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppRoute } from '@/lib/routes';
export { HomePage } from './HomePage';

export function DailyPage({ navigate }: { navigate: (route: AppRoute) => void }) {
  return (
    <main className="page-frame market-page daily-page">
      <header className="page-title-block">
        <button className="back-link" onClick={() => navigate({ page: 'home' })}>
          ← 返回首页
        </button>
        <h1>日常教学</h1>
      </header>
      <section className="market-panel daily-entry">
        <BookOpenCheck />
        <h2>从一个教学想法开始</h2>
        <Button onClick={() => navigate({ page: 'create', assistantId: crypto.randomUUID() })}>
          梳理我的教学方法
          <ArrowRight />
        </Button>
      </section>
      <div className="inline-actions">
        <Button variant="outline" onClick={() => navigate({ page: 'market' })}>
          参考集市中的方法
        </Button>
        <Button variant="outline" onClick={() => navigate({ page: 'workshop' })}>
          继续编辑我的 SKILL
        </Button>
      </div>
    </main>
  );
}

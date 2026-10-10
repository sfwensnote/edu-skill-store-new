import { Box, Bot, ChevronRight, FileCheck2, FileText, Heart, Images, Network } from 'lucide-react';
import { workshopTabs, type WorkshopTab, type WorkItem } from './workshop-catalog';

export const workshopIcons = {
  skills: FileCheck2,
  problems: FileText,
  chains: Network,
  pbl: Box,
  favorites: Heart,
  showcase: Images,
  assistants: Bot,
};
export function WorkshopOverview({
  collections,
  tab,
  onTab,
}: {
  collections: Record<WorkshopTab, WorkItem[]>;
  tab: WorkshopTab;
  onTab: (tab: WorkshopTab) => void;
}) {
  return (
    <section className="workshop-overview" aria-label="作品概览">
      {workshopTabs.slice(0, 4).map(([key, label]) => {
        const Icon = workshopIcons[key];
        const drafts = collections[key].filter((item) => item.kind === 'method-draft').length;
        return (
          <button
            key={key}
            className="workshop-stat"
            data-kind={key}
            aria-label={`查看${label}`}
            aria-pressed={tab === key}
            onClick={() => onTab(key)}
          >
            <span className="workshop-type-icon">
              <Icon aria-hidden="true" />
            </span>
            <span className="workshop-stat-info">
              <span>{label}</span>
              <strong>
                {collections[key].length - drafts}
                <small>个</small>
                {!!drafts && <small> · {drafts} 份草稿</small>}
              </strong>
            </span>
            <ChevronRight className="workshop-stat-arrow" aria-hidden="true" />
          </button>
        );
      })}
    </section>
  );
}
export function WorkshopNavigation({
  tab,
  counts,
  onTab,
}: {
  tab: WorkshopTab;
  counts: Record<WorkshopTab, number>;
  onTab: (tab: WorkshopTab) => void;
}) {
  return (
    <aside className="workshop-sidebar">
      <label className="workshop-mobile-category">
        作品分类
        <select aria-label="作品分类" value={tab} onChange={(e) => onTab(e.target.value as WorkshopTab)}>
          {workshopTabs.map(([key, label]) => (
            <option key={key} value={key}>
              {label}（{counts[key]}）
            </option>
          ))}
        </select>
      </label>
      <nav aria-label="作品分类">
        {[workshopTabs.slice(0, 4), workshopTabs.slice(4)].map((group, index) => (
          <div className="workshop-nav-group" key={index}>
            {group.map(([key, label]) => {
              const Icon = workshopIcons[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  aria-pressed={tab === key}
                  aria-describedby={`workshop-count-${key}`}
                  onClick={() => onTab(key)}
                >
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                  <small id={`workshop-count-${key}`}>{counts[key]}</small>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

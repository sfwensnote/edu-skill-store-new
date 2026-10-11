import { FileCheck2, FolderPen, Heart, Store } from 'lucide-react';
import { workshopTabs, type WorkshopTab } from './workshop-catalog';

const workshopIcons = {
  skills: FileCheck2,
  created: FolderPen,
  added: Store,
  favorites: Heart,
};
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
        SKILL 分类
        <select aria-label="SKILL 分类" value={tab} onChange={(e) => onTab(e.target.value as WorkshopTab)}>
          {workshopTabs.map(([key, label]) => (
            <option key={key} value={key}>
              {label}（{counts[key]}）
            </option>
          ))}
        </select>
      </label>
      <nav aria-label="SKILL 分类">
        {[workshopTabs.slice(0, 1), workshopTabs.slice(1)].map((group, index) => (
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

import type { MethodPreviewCase } from '../../shared/method-preview';
import './teaching-tags.css';

export function MethodSituationSelect({ cases, value, onChange }: {
  cases: MethodPreviewCase[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (!cases.length) return null;
  const selected = cases.find((item) => item.id === value) || cases[0];
  return <div className="method-situation-select">
    <label className="form-field">
      选择要预览的教学情况
      <select aria-label="预览教学情况" value={selected.id} onChange={(event) => onChange(event.target.value)}>
        {cases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
    </label>
    <p>当：{selected.condition}</p>
  </div>;
}

import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  maxTeachingTags, maxTagLength, normalizeTeachingTags, suggestedTags, teachingCategories,
  type TeachingCategory,
} from '../../shared/teaching-tags';
import './teaching-tags.css';

export function TeachingCategoryField({ value, onChange }: {
  value?: TeachingCategory | null;
  onChange: (value: TeachingCategory | null) => void;
}) {
  return (
    <label className="teaching-scene-field">
      教学分类
      <select aria-label="教学分类" required value={value || ''}
        onChange={(event) => onChange((event.target.value || null) as TeachingCategory | null)}>
        <option value="">请选择教学分类</option>
        {teachingCategories.map((category) => <option key={category}>{category}</option>)}
      </select>
    </label>
  );
}

export function TeachingTagsField({ value, onChange, suggestions = suggestedTags }: {
  value?: string[];
  onChange: (tags: string[]) => void;
  suggestions?: readonly string[];
}) {
  const id = useId();
  const tags = normalizeTeachingTags(value);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  function change(next: string[]) {
    onChange(normalizeTeachingTags(next));
    setError('');
  }
  function add() {
    const candidates = input.split(/[，,、]/).map((tag) => tag.trim()).filter(Boolean);
    if (!candidates.length) return;
    if (candidates.some((tag) => tag.length > maxTagLength)) {
      setError(`每个标签最多 ${maxTagLength} 字，请缩短后添加。`);
      return;
    }
    const next = [...new Set([...tags, ...candidates])];
    if (next.length > maxTeachingTags) {
      setError(`最多添加 ${maxTeachingTags} 个标签，请先移除不需要的标签。`);
      return;
    }
    change(next);
    setInput('');
  }
  return (
    <fieldset className="teaching-tags-field">
      <legend>标签（可选）</legend>
      <div className="teaching-tag-input">
        <input aria-label="自定义标签" placeholder="例如：一元一次方程，回车添加"
          value={input} maxLength={120} aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          onChange={(event) => { setInput(event.target.value); setError(''); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              add();
            }
          }} />
        <Button type="button" variant="outline" disabled={!input.trim()} onClick={add}>添加</Button>
      </div>
      <small id={`${id}-hint`}>可自定义知识点或选下方标签，最多 {maxTeachingTags} 个。</small>
      {tags.length > 0 && (
        <div className="teaching-selected-tags" aria-label="已选标签">
          {tags.map((tag) => (
            <Button key={tag} type="button" variant="secondary" size="sm"
              aria-label={`移除标签 ${tag}`} onClick={() => change(tags.filter((item) => item !== tag))}>
              {tag}<X data-icon="inline-end" />
            </Button>
          ))}
        </div>
      )}
      <div className="teaching-tag-options" role="group" aria-label="常用标签">
        {suggestions.map((tag) => (
          <label key={tag} data-selected={tags.includes(tag)}>
            <input type="checkbox" aria-label={`标签 ${tag}`} checked={tags.includes(tag)}
              disabled={!tags.includes(tag) && tags.length >= maxTeachingTags}
              onChange={(event) => change(event.target.checked ? [...tags, tag] : tags.filter((item) => item !== tag))} />
            {tag}
          </label>
        ))}
      </div>
      {error && <p id={`${id}-error`} role="alert">{error}</p>}
    </fieldset>
  );
}

export function TeachingTagList({ tags }: { tags?: string[] }) {
  const values = normalizeTeachingTags(tags);
  if (!values.length) return null;
  return <ul className="teaching-tag-list" aria-label="作品标签">
    {values.map((tag) => <li key={tag}>{tag}</li>)}
  </ul>;
}

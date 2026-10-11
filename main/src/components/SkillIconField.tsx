import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { SkillIcon } from './SkillIcon';
import { isTeachingCategory, type TeachingCategory } from '../../shared/teaching-tags';
import { skillIconColors, skillIconMaxBytes, validSkillIcon, type SkillIconStyle } from '../../shared/skill-icon';

export function SkillIconField({ category, value, onChange, onBusy }: {
  category?: TeachingCategory | null; value?: SkillIconStyle; onChange: (value: SkillIconStyle) => void; onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const latest = useRef({ onChange, onBusy, value });
  latest.current = { onChange, onBusy, value };
  useEffect(() => () => { request.current++; latest.current.onBusy?.(false); }, []);
  const appearance = validSkillIcon(value) || {};
  async function upload(file?: File) {
    if (!file) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('请上传 PNG、JPG 或 WebP 图片。'); return; }
    if (file.size > skillIconMaxBytes) { setError('图标不能超过 1 MB。'); return; }
    const current = ++request.current;
    setBusy(true); latest.current.onBusy?.(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error());
        reader.readAsDataURL(file);
      });
      const image = new Image(); image.src = data; await image.decode();
      if (!image.naturalWidth || !validSkillIcon({ image: data })) throw new Error();
      if (request.current === current) latest.current.onChange({ ...validSkillIcon(latest.current.value), image: data });
    } catch { if (request.current === current) setError('图片无法读取，请换一张后重试。'); }
    finally { if (request.current === current) { setBusy(false); latest.current.onBusy?.(false); } }
  }
  return <fieldset className="skill-icon-field">
    <legend>SKILL 图标</legend>
    <div className="skill-icon-controls">
      <SkillIcon category={isTeachingCategory(category) ? category : '未分类'} icon={appearance} />
      <div>
        <div className="skill-icon-colors" role="group" aria-label="SKILL 图标颜色">
          {skillIconColors.map((color, index) => <button type="button" key={color} aria-label={['绿色', '蓝色', '紫色', '棕色', '粉色'][index]}
            aria-pressed={(appearance.color || skillIconColors[0]).toLowerCase() === color} disabled={busy} style={{ backgroundColor: color }}
            onClick={() => onChange({ ...appearance, color })} />)}
          <label className="skill-icon-color-picker">自选颜色<input type="color" aria-label="自选图标颜色" disabled={busy}
            value={appearance.color || skillIconColors[0]} onChange={event => onChange({ ...appearance, color: event.target.value })} /></label>
        </div>
        <div className="skill-icon-upload-actions">
          <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label="上传 SKILL 图标" accept="image/png,image/jpeg,image/webp" disabled={busy}
            onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? '正在读取…' : '上传图标'}</Button>
          {appearance.image && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onChange({ color: appearance.color })}>使用分类图标</Button>}
          <small>PNG、JPG、WebP，1 MB 以内</small>
        </div>
      </div>
    </div>
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}

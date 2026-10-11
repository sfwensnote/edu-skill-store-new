import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { LearningCompanion } from '../../../shared/learning-companion';

const avatars = [
  { id: 'default', label: '默认形象' },
  { id: 'lively', label: '活泼风格' },
  { id: 'simple', label: '简洁风格' },
] as const;
const years: Record<string, string[]> = {
  小学: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
  初中: ['七年级', '八年级', '九年级'], 高中: ['高一', '高二', '高三'],
};
const subjects = ['任意学科', '语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '科学', '信息技术', '其他'];

export function CompanionAvatar({ value }: { value: LearningCompanion }) {
  return <span className="companion-avatar" data-style={value.avatar} aria-hidden="true">
    {value.avatar === 'custom' && value.avatarImage ? <img src={value.avatarImage} alt="" /> :
      <img className="companion-avatar-art" src={`${import.meta.env.BASE_URL}companion-avatars.png`} alt="" />}
  </span>;
}

export function CompanionProfile({ value, onChange, onBusy }: {
  value: LearningCompanion; onChange: (patch: Partial<LearningCompanion>) => void; onBusy: (busy: boolean) => void;
}) {
  const uploadInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 256 * 1024) {
      setError('请选择 256 KB 以内的 PNG、JPG 或 WebP 图片。');
      if (uploadInput.current) uploadInput.current.value = '';
      return;
    }
    setReading(true); onBusy(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      await new Promise<void>((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(); img.onerror = reject; img.src = data;
      });
      onChange({ avatar: 'custom', avatarImage: data });
    } catch { setError('图片读取失败，请重新选择。'); }
    finally { setReading(false); onBusy(false); if (uploadInput.current) uploadInput.current.value = ''; }
  }
  return <div className="companion-basic">
    <label className="form-field">学伴名称
      <input required maxLength={50} value={value.name} onChange={event => onChange({ name: event.target.value })} placeholder="给学伴起个名字" />
      <small className="companion-counter" aria-hidden="true">{value.name.length} / 50</small>
    </label>
    <label className="form-field">学伴简介
      <Textarea required minRows={3} maxLength={200} value={value.introduction} onChange={event => onChange({ introduction: event.target.value })} placeholder="它会怎样帮助学生学习？" />
      <small className="companion-counter" aria-hidden="true">{value.introduction.length} / 200</small>
    </label>
    <div className="companion-profile-meta">
      <label className="form-field">学段<select required value={value.grade} onChange={event => onChange({ grade: event.target.value, year: '' })}>
        <option value="">请选择学段</option>
        {['小学', '初中', '高中', '大学', '其他'].map(item => <option key={item}>{item}</option>)}
      </select></label>
      <label className="form-field">学科<select required value={value.subject} onChange={event => onChange({ subject: event.target.value })}>
        {[...new Set([...subjects, value.subject].filter(Boolean))].map(item => <option key={item}>{item}</option>)}
      </select></label>
      <label className="form-field">适用年级（可选）<select value={value.year} onChange={event => onChange({ year: event.target.value })}>
        <option value="">不限年级</option>
        {[...new Set([...(years[value.grade] || []), value.year].filter(Boolean))].map(item => <option key={item}>{item}</option>)}
      </select></label>
    </div>
    <fieldset className="companion-avatar-picker"><legend>学伴形象（可选）</legend>
      <div className="companion-avatar-options">{avatars.map(item => <label key={item.id}>
        <input type="radio" name="companion-avatar" value={item.id} checked={value.avatar === item.id} disabled={reading}
          onChange={() => onChange({ avatar: item.id })} />
        <span className="companion-avatar-tile"><CompanionAvatar value={{ ...value, avatar: item.id }} /></span>
        <span>{item.label}</span>
      </label>)}
        <div className="companion-custom-avatar">
          <Button variant="outline" className="companion-avatar-upload" disabled={reading} data-selected={value.avatar === 'custom'} aria-label="自定义上传学伴形象" onClick={() => uploadInput.current?.click()}>
            <CompanionAvatar value={value.avatar === 'custom' ? value : { ...value, avatar: 'custom', avatarImage: '' }} />
          </Button>
          <span>自定义上传</span>
        </div>
      </div>
      <input hidden type="file" ref={uploadInput} accept="image/png,image/jpeg,image/webp" aria-label="上传学伴形象" disabled={reading}
        onChange={event => { void upload(event.target.files?.[0]); }} />
      {reading && <p role="status">正在读取图片…</p>}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  </div>;
}

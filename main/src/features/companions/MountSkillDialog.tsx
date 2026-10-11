import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { LearningCompanion } from '../../../shared/learning-companion';
import type { SkillEntry } from '../../../shared/marketplace';
import { useVerification } from '../execution/useVerification';

export function MountSkillDialog({ entry, items, onSave, onCreate, onClose, onOpen, onCheck }: {
  entry: SkillEntry; items: LearningCompanion[]; onSave: (item: LearningCompanion) => boolean;
  onCreate: () => void; onClose: () => void; onOpen: (item: LearningCompanion) => void;
  onCheck: () => void;
}) {
  const verification = useVerification();
  const verified = verification.verified(entry);
  const [target, setTarget] = useState(items[0]?.id || '');
  const [error, setError] = useState('');
  const selected = items.find(item => item.id === target);
  const mounted = selected?.skillIds.includes(entry.id);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>挂载到学伴</DialogTitle><DialogDescription>选择使用“{entry.skill.name}”的学伴。</DialogDescription></DialogHeader>
    {!verified && <div><p>这项方法需要通过检测并由教师确认后才能挂载。</p><Button variant="outline" onClick={onCheck}>前往 SKILL 检测</Button>
      {verification.error && <p role="alert">{verification.error}</p>}</div>}
    {items.length ? <label className="form-field">选择学伴<select value={target} onChange={event => setTarget(event.target.value)}>{items.map(item => <option key={item.id} value={item.id}>{item.name || '未命名学伴'}</option>)}</select></label> : <p>还没有学伴，请先创建。</p>}
    {error && <p role="alert">{error}</p>}
    <div className="inline-actions"><Button variant="outline" disabled={!verified} onClick={onCreate}>创建新学伴</Button>
      {selected && <Button disabled={!mounted && !verified} onClick={() => {
        const next = { ...selected, skillIds: [...new Set([...selected.skillIds, entry.id])] };
        if (mounted || onSave(next)) onOpen(next); else setError('挂载未保存，请释放存储空间后重试。');
      }}>{mounted ? '已挂载，查看学伴' : '确认挂载'}</Button>}
    </div>
  </DialogContent></Dialog>;
}

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SkillEntry } from '../../../shared/marketplace';

export function AdaptSkillDialog({ entry, onClose, onAdapt }: {
  entry: SkillEntry;
  onClose: () => void;
  onAdapt: (requirements: string) => boolean;
}) {
  const [requirements, setRequirements] = useState('');
  const inputId = useId();
  const [error, setError] = useState('');
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>改编 SKILL</DialogTitle>
        <DialogDescription>基于“{entry.skill.name}”创建独立草稿，需重新检测后发布。</DialogDescription>
      </DialogHeader>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!requirements.trim()) return;
        if (!onAdapt(requirements.trim())) setError('草稿未保存，新需求仍保留，请重试。');
      }}>
        <div className="form-field">
          <label htmlFor={inputId}>新需求</label>
          <Textarea id={inputId} maxLength={500} required value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
            placeholder="你希望改变哪些目标、做法或适用范围？" />
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="inline-actions">
          <Button type="button" variant="outline" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={!requirements.trim()}>开始改编</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

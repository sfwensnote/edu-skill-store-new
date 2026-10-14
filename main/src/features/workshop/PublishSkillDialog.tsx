import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { SkillEntry } from '../../../shared/marketplace';

export function PublishSkillDialog({ entry, shared, checked, onClose, onCheck, onPublish, onWithdraw, onMarket }: {
  entry: SkillEntry; shared: boolean; checked: boolean; onClose: () => void;
  onCheck: () => void; onPublish: () => boolean; onWithdraw: () => boolean; onMarket: () => void;
}) {
  const [error, setError] = useState('');
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>{shared ? '管理发布' : '发布到教学方法集市'}</DialogTitle>
      <DialogDescription>{shared ? `“${entry.skill.name}”已发布，其他教师可以查看、试用和添加。` : checked ? `发布“${entry.skill.name}”，供其他教师查看、试用和添加。` : '发布前请与搭载教学方法的模型对话，并确认这项方法通过测验。'}</DialogDescription>
    </DialogHeader>
    {error && <p role="alert">{error}</p>}
    <div className="inline-actions">
      <Button variant="outline" onClick={onClose}>取消</Button>
      {shared ? <><Button variant="outline" onClick={() => { if (onWithdraw()) onClose(); else setError('撤下失败，请重试。'); }}>从集市撤下</Button><Button onClick={onMarket}>查看集市</Button></> :
        checked ? <Button onClick={() => { if (onPublish()) onMarket(); else setError('发布未保存，请释放存储空间后重试。'); }}>确认发布</Button> :
          <Button onClick={onCheck}>前往教学方法验证</Button>}
    </div>
  </DialogContent></Dialog>;
}

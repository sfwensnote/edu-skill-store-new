import { useState } from 'react';
import type { EducationalSkill } from '../../../shared/assistant';
import { methodFromSkill, methodError, type TeachingMethod } from '../../../shared/teaching-method';
import { teachingCategoryOf, teachingTagsOf } from '../../../shared/teaching-tags';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MethodOutline } from '@/features/designer/MethodOutline';
import '@/features/designer/creation-flow.css';

export function TestMethodEditor({ skill, onClose, onSave }: {
  skill: EducationalSkill;
  onClose: () => void;
  onSave: (method: TeachingMethod) => boolean;
}) {
  const [method, setMethod] = useState<TeachingMethod>(() => {
    const category = teachingCategoryOf(skill, skill.trigger);
    return { ...methodFromSkill(skill), category: category === '未分类' ? null : category, tags: teachingTagsOf(skill, skill.trigger) };
  });
  const [error, setError] = useState('');
  const [iconBusy, setIconBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [dirty, setDirty] = useState(false);
  function close() {
    if (dirty) setDiscard(true);
    else onClose();
  }
  function save() {
    if (iconBusy) return;
    const issue = methodError(method);
    if (issue) { setError(issue); return; }
    if (!dirty) { onClose(); return; }
    if (onSave(method)) onClose();
    else setError('修改未保存，请释放存储空间后重试。');
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="test-method-editor">
        <DialogHeader>
          <DialogTitle>{discard ? '保留本次修改？' : `修改方法：${skill.name}`}</DialogTitle>
          <DialogDescription>{discard ? '尚有未保存内容。' : '保存后需重新核对，原确认与发布状态会撤销。'}</DialogDescription>
        </DialogHeader>
        {discard ? <div className="test-editor-actions">
          <Button variant="outline" onClick={() => setDiscard(false)}>继续修改</Button>
          <Button variant="outline" onClick={onClose}>放弃修改</Button>
          <Button onClick={save}>保存并重新核对</Button>
        </div> : <>
          <MethodOutline method={method} updatedSection={null} onIconBusy={setIconBusy} onChange={(next) => { setMethod(next); setDirty(true); setError(''); }} />
          {error && <p role="alert" className="field-error">{error}</p>}
          <footer className="test-editor-actions">
            <Button variant="outline" onClick={close}>取消</Button>
            <Button disabled={iconBusy} onClick={save}>保存并重新核对</Button>
          </footer>
        </>}
      </DialogContent>
    </Dialog>
  );
}

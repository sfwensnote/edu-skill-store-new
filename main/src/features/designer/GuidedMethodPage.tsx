import { useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SaveStatus, StickyActions } from '@/components/Workbench';
import { MethodOutline } from './MethodOutline';
import { MethodBasicInfo } from './IdeaForm';
import { MethodPreview } from './MethodPreview';
import { directDraftError, prepareDirectMethod } from '../../../shared/direct-method';
import type { CreationDraft, TeachingMethod } from '../../../shared/teaching-method';

export function GuidedMethodPage({ draft, onChange, onConfirm, savedAt, saveFailed }: {
  draft: CreationDraft; onChange: (draft: CreationDraft) => void; onConfirm: () => void; savedAt?: string; saveFailed?: boolean;
}) {
  const [iconBusy, setIconBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const previewButton = useRef<HTMLButtonElement>(null);
  const issue = directDraftError(draft);
  function updateMethod(method: TeachingMethod, field?: string) {
    onChange({ ...draft, method, teachingScene: method.category || '', stage: 'method', manualEdits: field && !draft.manualEdits.includes(field) ? [...draft.manualEdits, field] : draft.manualEdits });
  }
  return <div className="direct-method-editor">
    <div className="direct-method-layout">
      <MethodBasicInfo draft={draft} onChange={onChange} onIconBusy={setIconBusy} />
      <section className="creation-panel direct-expression" aria-label="教学方法的自然语言表达">
        <header><div><h2>教学方法的自然语言表达</h2><p>用自己的语言，写清教学目标和具体做法。</p></div><SaveStatus failed={saveFailed} time={savedAt} /></header>
        <MethodOutline method={draft.method} onChange={updateMethod} />
      </section>
    </div>
    <StickyActions status={<span>{issue || '必填内容已完整'}</span>}>
      <Button ref={previewButton} variant="outline" disabled={iconBusy} onClick={() => setPreview(true)}><Eye />预览教学方法</Button>
      <Button disabled={iconBusy || !!issue} onClick={onConfirm}>完成整理</Button>
    </StickyActions>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="method-preview-dialog" onCloseAutoFocus={event => { event.preventDefault(); previewButton.current?.focus(); }}>
      <DialogHeader><DialogTitle>教学方法预览</DialogTitle><DialogDescription className="sr-only">查看教师填写的教学方法，返回后可继续修改。</DialogDescription></DialogHeader>
      <MethodPreview method={prepareDirectMethod(draft.method)} />
      <div className="guided-preview-actions"><Button variant="outline" onClick={() => setPreview(false)}>返回编辑</Button><Button disabled={iconBusy || !!issue} onClick={() => { setPreview(false); onConfirm(); }}>确认完成整理</Button></div>
    </DialogContent></Dialog>
  </div>;
}

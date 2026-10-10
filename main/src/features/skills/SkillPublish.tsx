import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { hasSkillChanges, isSkillDetectionPassed, isSkillPublished, isSkillReviewed, publishSkill, type SkillRecord } from '../../../shared/skill-workspace';
import { SkillUse } from './SkillUse';

export function SkillPublish({ record, save }: {
  record: SkillRecord; save: (record: SkillRecord) => boolean;
}) {
  const [error, setError] = useState('');
  const published = isSkillPublished(record);
  const ready = isSkillDetectionPassed(record) && !hasSkillChanges(record);
  return <>
    <div className="sd-page-heading"><div><h1>发布 SKILL</h1><p>将确认并检测过的 v{record.revision} 放入集市，供使用者下载后自行挂载。</p></div></div>
    <section className="sd-publish-status" aria-label="发布条件">
      <dl><div><dt>教师核对</dt><dd>{isSkillReviewed(record) ? `已核对 v${record.revision}` : '尚未核对'}</dd></div>
        <div><dt>LLM 检测</dt><dd>{isSkillDetectionPassed(record) ? `v${record.revision} 演示检测通过` : '尚未通过当前版本检测'}</dd></div>
        <div><dt>集市发布</dt><dd>{published ? `已发布 v${record.revision}（Demo）` : '尚未发布'}</dd></div></dl>
      <div className="sd-actions">
        {published ? <Button asChild><a href={`#/market/${encodeURIComponent(record.id)}`}>查看集市说明</a></Button> :
          <Button disabled={!ready} onClick={() => {
            try { save(publishSkill(record, new Date().toISOString())); }
            catch (cause) { setError(cause instanceof Error ? cause.message : '发布失败，请重试。'); }
          }}>发布到集市</Button>}
        <Button variant="outline" asChild><a href={`#/skills/${encodeURIComponent(record.id)}/detect`}>返回检测</a></Button>
      </div>
      <p>本次为本机发布演示，不向公网上传资料。集市详情只展示说明和下载，不提供预览或在线运行。</p>
      {hasSkillChanges(record) && <p className="sd-error">草稿有修改，请先形成新版本并重新核对、检测。</p>}
      {error && <p role="alert" className="sd-error">{error}</p>}
    </section>
    <SkillUse record={record} market={false} example={false} compact />
  </>;
}

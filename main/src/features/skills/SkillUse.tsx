import { useState } from 'react';
import { Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MethodSteps } from '@/features/usage/MethodSteps';
import { packageTeachingMethod } from '../../../shared/teaching-method';
import { hasSkillChanges, isSkillDetectionPassed, isSkillPublished, skillMountMarkdown, type SkillRecord } from '../../../shared/skill-workspace';

export function SkillUse({ record, market, example, compact = false, onCopy }: {
  record: SkillRecord; market: boolean; example: boolean; compact?: boolean; onCopy?: () => void;
}) {
  const [notice, setNotice] = useState('');
  if (!record.content) return null;
  const { method, context, experience, grade, subject } = record.content;
  function download() {
    try {
      const blob = new Blob([skillMountMarkdown(record)], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'SKILL.md'; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('已生成 SKILL.md，请按目标平台的方式自行挂载。');
    } catch { setNotice('无法生成文件，请重试。'); }
  }
  return <>
    <div className="sd-page-heading"><div>{compact ? <h2>{method.name}</h2> : <h1>{method.name}</h1>}<p>{method.description}</p></div>
      <div className="sd-actions">
        <Button onClick={download}><Download data-icon="inline-start" />下载 SKILL.md</Button>
        {market && onCopy && <Button variant="outline" onClick={onCopy}><Copy data-icon="inline-start" />复用到我的工作区</Button>}
      </div>
    </div>
    <div className="sd-version-line"><span>{grade} / {subject}</span><span>v{record.revision}</span>
      <span>{example ? '集市方法示例' : isSkillPublished(record) ? '已发布（Demo）' : isSkillDetectionPassed(record) ? '演示检测通过' : '待检测与发布'}</span>
      {!market && hasSkillChanges(record) && <span>草稿有修改，下面显示已形成版本</span>}
    </div>
    <section className="sd-mount-guide" aria-label="自行挂载说明">
      <h2>下载后自行挂载</h2><p>按目标平台支持的方式上传 SKILL.md，或将方法配置为指令；补充所需材料与上下文，再在目标模型上验证。</p>
      <p>集市只提供说明和文件。具体格式是否受支持，以目标平台要求为准。</p>
    </section>
    <article className="sd-document sd-teacher-guide" aria-label="SKILL 说明">
      <dl className="sd-context"><div><dt>教学问题</dt><dd>{method.problem}</dd></div>
        <div><dt>使用前需要</dt><dd>{context.inputs}</dd></div></dl>
      <MethodSteps skill={packageTeachingMethod(method, record.id)} />
      <section className="sd-transfer"><h2>不适用与教师介入</h2><p>{context.exclusions}</p></section>
    </article>
    <details className="sd-provenance"><summary>经验来源与版本</summary><p>{experience}</p>
      <p>来源：{record.source.label}{record.source.skillId ? ` / v${record.source.revision}` : ''}</p>
      <p>当前 SKILL：{record.id} / v{record.revision}</p>
      <p>检测结论限定在创作工作区中的演示情境，不代表目标平台运行或教学效果已验证。</p>
    </details>
    {notice && <p role="status" className="sd-download-notice">{notice}</p>}
  </>;
}

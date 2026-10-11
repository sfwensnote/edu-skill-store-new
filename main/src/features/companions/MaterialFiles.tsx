import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CompanionMaterial } from '../../../shared/learning-companion';
import { serviceConfigured } from '../execution/api';

const extensions = /\.(txt|md|pdf|docx|png|jpe?g|webp)$/i;
export function MaterialFiles({ materials, onChange, onBusy }: { onBusy: (busy: boolean) => void; materials: CompanionMaterial[]; onChange: (items: CompanionMaterial[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  async function upload(files: File[]) {
    setError('');
    if (files.some(file => !(serviceConfigured ? /\.(txt|md|pdf|docx)$/i : extensions).test(file.name))) {
      setError(serviceConfigured ? '请选择可提取文字的 TXT、Markdown、PDF 或 DOCX。图片和扫描件请先转为文字。' : '请选择 TXT、Markdown、PDF、DOCX 或图片文件。'); return;
    }
    if (files.some(file => file.size > 2 * 1024 * 1024) || materials.reduce((sum, item) => sum + item.size, 0) + files.reduce((sum, item) => sum + item.size, 0) > 3 * 1024 * 1024) {
      setError('单个文件最多 2 MB，附件合计最多 3 MB。'); return;
    }
    setReading(true); onBusy(true);
    try {
      const added = await Promise.all(files.map(async file => ({
        id: crypto.randomUUID(), name: file.name, type: file.type || 'application/octet-stream', size: file.size,
        text: /\.(txt|md)$/i.test(file.name) ? await file.text() : '',
        data: await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
        }),
      })));
      onChange([...materials, ...added]);
    } catch { setError('文件读取失败，请重新选择。'); }
    finally { setReading(false); onBusy(false); if (input.current) input.current.value = ''; }
  }
  return <section className="companion-materials">
    <h2>教学材料</h2>
    <p className="subtle">{serviceConfigured ? '支持可提取文字的 TXT、Markdown、PDF、DOCX。' : '支持 TXT、Markdown、PDF、DOCX 和图片。'}单个文件最多 2 MB，合计 3 MB。</p>
    <Button type="button" variant="outline" disabled={reading} onClick={() => input.current?.click()}>上传材料</Button>
    <input hidden ref={input} type="file" multiple accept={serviceConfigured ? '.txt,.md,.pdf,.docx' : '.txt,.md,.pdf,.docx,.png,.jpg,.jpeg,.webp'} aria-label="上传教学材料" disabled={reading}
      onChange={event => { void upload(Array.from(event.target.files || [])); }} />
    {reading && <p role="status">正在读取材料…</p>}
    {error && <p role="alert">{error}</p>}
    <ul className="companion-files">{materials.map(item => <li key={item.id}><span>{item.name}</span><Button type="button" variant="ghost" disabled={reading} onClick={() => onChange(materials.filter(file => file.id !== item.id))} aria-label={`移除材料 ${item.name}`}>移除</Button></li>)}</ul>
  </section>;
}
export function downloadMaterial(item: CompanionMaterial) {
  const raw = atob(item.data.slice(item.data.indexOf(',') + 1));
  const blob = new Blob([Uint8Array.from(raw, c => c.charCodeAt(0))], { type: item.type });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = item.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

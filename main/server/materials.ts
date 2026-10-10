import path from 'node:path';
import { randomUUID } from 'node:crypto';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import type { Material } from '../shared/schema';

export async function readMaterial(name: string, buffer: Buffer): Promise<Material> {
  const extension = path.extname(name).toLowerCase();
  let text = '';
  if (['.txt', '.md'].includes(extension)) text = buffer.toString('utf8');
  else if (extension === '.docx') text = (await mammoth.extractRawText({ buffer })).value;
  else if (extension === '.pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else throw new Error('暂时支持 PDF、Word（.docx）、TXT 和 Markdown，请换一种格式。');
  text = text.replace(/\u0000/g, '').trim();
  if (
    text.length < 8 ||
    (extension === '.pdf' && text.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim().length < 8)
  )
    throw new Error('没有读取到足够文字。扫描件请先转换为可复制的文字材料。');
  if (text.includes('\uFFFD')) throw new Error('文件文字编码无法读取，请另存为 UTF-8 文本。');
  if (text.length > 16000) throw new Error('这份材料超过 16,000 字符，请上传本次教学所需的节选。');
  return { id: randomUUID(), name: path.basename(name).slice(0, 200), text };
}

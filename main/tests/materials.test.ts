import test from 'node:test';
import assert from 'node:assert/strict';
import { readMaterial } from '../server/materials';

// 最小可复制文字 PDF 夹具，独立于用户的教学文件。
function pdfFixture(): Buffer {
  const stream = 'BT /F1 12 Tf 72 720 Td (Equation: 2x + 3 = 9. Explain one step.) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let data = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(data));
    data += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(data);
  data += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(data);
}
test('实际解析 PDF 文字而非仅记住附件名', async () => {
  const result = await readMaterial('测试.pdf', pdfFixture());
  assert.match(result.text, /2x \+ 3 = 9/);
  assert.equal(result.name, '测试.pdf');
});
test('UTF-8 材料可读，空白和超长材料拒绝', async () => {
  assert.match(
    (await readMaterial('教学.txt', Buffer.from('每次给一个提示，让学生尝试下一步。'))).text,
    /学生/,
  );
  await assert.rejects(readMaterial('空白.txt', Buffer.from('  ')), /足够文字/);
  await assert.rejects(readMaterial('过长.txt', Buffer.from('字'.repeat(16001))), /16,000/);
});

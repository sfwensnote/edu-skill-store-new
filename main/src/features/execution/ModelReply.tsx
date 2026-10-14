import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

function mathDelimiters(content: string) {
  // 模型常用 TeX 括号；只转换正文，保留代码块和行内代码的原文。
  return content.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`]*`+)/g).map((part, index) => {
    if (index % 2) return part;
    return part.replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula: string) => `\n\n$$\n${formula.trim()}\n$$\n\n`)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula: string) => `$${formula.trim()}$`);
  }).join('');
}

export function ModelReply({ content }: { content: string }) {
  return <div className="method-reply-markdown"><Markdown skipHtml remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: 'ignore', trust: false }]]}
    components={{
      a: ({ node: _node, children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>,
      table: ({ node: _node, children, ...props }) => <div className="method-reply-table"><table {...props}>{children}</table></div>,
    }}>{mathDelimiters(content)}</Markdown></div>;
}

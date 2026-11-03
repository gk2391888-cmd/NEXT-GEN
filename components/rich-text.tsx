import { InlineText } from './ui';

/**
 * Renders the small subset of Markdown the AI is asked to use: paragraphs,
 * "- " / "1. " lists, fenced code blocks, **bold** and `code`. Everything is
 * rendered as text, never as HTML.
 */
export function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={blocks.length} className="code-block">{code.join('\n')}</pre>);
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)/;
    const numbered = /^\s*\d+[.)]\s+(.*)/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const pattern = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i])) items.push(lines[i++].replace(pattern, '$1'));
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={blocks.length} className="rich-list">
          {items.map((item, j) => <li key={j}><InlineText text={item} /></li>)}
        </List>,
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('```') && !bullet.test(lines[i]) && !numbered.test(lines[i])) {
      para.push(lines[i++].replace(/^#+\s*/, ''));
    }
    blocks.push(<p key={blocks.length} className="rich-p"><InlineText text={para.join(' ')} /></p>);
  }

  return <>{blocks}</>;
}

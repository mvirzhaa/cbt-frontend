import katex from 'katex';
import 'katex/dist/katex.min.css';

// Splits on $$...$$ (block) and $...$ (inline) LaTeX delimiters and renders
// the math segments with KaTeX, leaving everything else as plain text.
const SEGMENT_REGEX = /(\$\$[^$]+\$\$|\$[^$]+\$)/g;

function renderSegment(segment, key) {
    const isBlock = segment.startsWith('$$') && segment.endsWith('$$');
    const isInline = !isBlock && segment.startsWith('$') && segment.endsWith('$');

    if (!isBlock && !isInline) {
        return <span key={key}>{segment}</span>;
    }

    const latex = isBlock ? segment.slice(2, -2) : segment.slice(1, -1);

    try {
        const html = katex.renderToString(latex, { throwOnError: false, displayMode: isBlock });
        return <span key={key} dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
        return <span key={key}>{segment}</span>;
    }
}

export default function MathText({ text, className }) {
    if (!text) return null;
    const segments = text.split(SEGMENT_REGEX).filter(s => s !== '');
    return (
        <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
            {segments.map((segment, index) => renderSegment(segment, index))}
        </span>
    );
}

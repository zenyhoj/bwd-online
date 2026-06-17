import { normalizeRichText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

type RichTextContentProps = {
  value: string;
  className?: string;
  replacements?: Record<string, React.ReactNode>;
};

export function RichTextContent({ value, className, replacements = {} }: RichTextContentProps) {
  const normalizedValue = normalizeRichText(value);

  if (!normalizedValue) {
    return null;
  }

  // Handle placeholders by splitting and interleaving components
  const hasReplacements = Object.keys(replacements).length > 0;
  
  let content;
  if (hasReplacements) {
    // More robust regex: Case-insensitive and allows optional spaces inside {{ }}
    const placeholderRegex = /({{\s*PLUMBERS_LIST\s*}})/gi;
    const parts = normalizedValue.split(placeholderRegex);

    content = (
      <div className={cn("rich-text-content text-sm leading-7 text-muted-foreground", className)}>
        {parts.map((part, index) => {
          const isPlumbersPlaceholder = /{{\s*PLUMBERS_LIST\s*}}/i.test(part);
          
          if (isPlumbersPlaceholder) {
            return <div key={index} className="my-6">{replacements["{{PLUMBERS_LIST}}"]}</div>;
          }
          
          if (!part) return null;
          return <div key={index} dangerouslySetInnerHTML={{ __html: part }} />;
        })}
      </div>
    );
  } else {
    content = (
      <div
        className={cn("rich-text-content text-sm leading-7 text-muted-foreground", className)}
        dangerouslySetInnerHTML={{ __html: normalizedValue }}
      />
    );
  }

  return (
    <>
      {content}
      <style jsx global>{`
        .rich-text-content > *:first-child {
          margin-top: 0;
        }

        .rich-text-content > *:last-child {
          margin-bottom: 0;
        }

        .rich-text-content p,
        .rich-text-content ul,
        .rich-text-content ol,
        .rich-text-content img,
        .rich-text-content blockquote,
        .rich-text-content h1,
        .rich-text-content h2,
        .rich-text-content h3 {
          margin: 0 0 1rem;
        }

        .rich-text-content p {
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .rich-text-content ul,
        .rich-text-content ol {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }

        .rich-text-content li {
          margin-bottom: 0.25rem;
        }

        .rich-text-content .ql-align-center {
          text-align: center;
        }

        .rich-text-content .ql-align-right {
          text-align: right;
        }

        .rich-text-content .ql-align-justify {
          text-align: justify;
        }

        .rich-text-content a {
          color: oklch(var(--primary));
          text-decoration: underline;
          text-underline-offset: 0.2em;
          font-weight: 500;
        }

        .rich-text-content img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 1.5rem auto;
          border-radius: var(--radius);
          border: 1px solid oklch(var(--border));
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .rich-text-content iframe.ql-video {
          display: block;
          width: 100%;
          aspect-ratio: 16 / 9;
          min-height: 320px;
          margin: 1.5rem 0;
          border-radius: var(--radius);
          border: 1px solid oklch(var(--border));
        }

        .rich-text-content strong {
          color: oklch(var(--foreground));
          font-weight: 700;
        }

        .rich-text-content h1,
        .rich-text-content h2,
        .rich-text-content h3 {
          color: oklch(var(--foreground));
          font-weight: 700;
          line-height: 1.2;
          margin-top: 1.5rem;
        }

        .rich-text-content h1 { font-size: 1.5rem; }
        .rich-text-content h2 { font-size: 1.25rem; }
        .rich-text-content h3 { font-size: 1.1rem; }

        .rich-text-content blockquote {
          border-left: 4px solid oklch(var(--primary) / 0.3);
          padding: 0.5rem 0 0.5rem 1.25rem;
          margin: 1rem 0;
          background: oklch(var(--muted) / 0.2);
          font-style: italic;
          color: oklch(var(--foreground) / 0.8);
        }

        .rich-text-content .rich-text-table-wrap {
          margin: 1.5rem 0;
          overflow-x: auto;
          border-radius: var(--radius);
          border: 1px solid oklch(var(--border));
          background: oklch(var(--background));
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .rich-text-content .rich-text-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }

        .rich-text-content .rich-text-table th,
        .rich-text-content .rich-text-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          vertical-align: middle;
          border-bottom: 1px solid oklch(var(--border));
        }

        .rich-text-content .rich-text-table thead {
          background: oklch(var(--muted) / 0.5);
        }

        .rich-text-content .rich-text-table th {
          color: oklch(var(--foreground));
          font-weight: 700;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .rich-text-content .rich-text-table td {
          color: oklch(var(--foreground) / 0.9);
          line-height: 1.5;
        }

        .rich-text-content .rich-text-table tbody tr:hover {
          background: oklch(var(--muted) / 0.2);
        }

        .rich-text-content .rich-text-table tbody tr:last-child td {
          border-bottom: 0;
        }
      `}</style>
    </>
  );
}

import { normalizeRichText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

type RichTextContentProps = {
  value: string;
  className?: string;
};

export function RichTextContent({ value, className }: RichTextContentProps) {
  const normalizedValue = normalizeRichText(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    <>
      <div
        className={cn("rich-text-content text-sm leading-7 text-muted-foreground", className)}
        dangerouslySetInnerHTML={{ __html: normalizedValue }}
      />
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
          margin: 0 0 0.55rem;
        }

        .rich-text-content p {
          line-height: 1.45;
        }

        .rich-text-content ul,
        .rich-text-content ol {
          padding-left: 1.25rem;
        }

        .rich-text-content ul {
          list-style: disc;
        }

        .rich-text-content ol {
          list-style: decimal;
        }

        .rich-text-content a {
          color: hsl(var(--secondary));
          text-decoration: underline;
          text-underline-offset: 0.2em;
        }

        .rich-text-content img {
          display: block;
          max-width: 100%;
          height: auto;
          border-radius: calc(var(--radius) - 0.15rem);
          border: 1px solid hsl(var(--border));
        }

        .rich-text-content iframe.ql-video {
          display: block;
          width: 100%;
          min-height: 320px;
          border-radius: calc(var(--radius) - 0.15rem);
          border: 1px solid hsl(var(--border));
        }

        .rich-text-content strong {
          color: hsl(var(--foreground));
          font-weight: 600;
        }

        .rich-text-content h1,
        .rich-text-content h2,
        .rich-text-content h3 {
          color: hsl(var(--foreground));
          font-weight: 600;
          line-height: 1.3;
        }

        .rich-text-content h1 {
          font-size: 1.35rem;
        }

        .rich-text-content h2 {
          font-size: 1.15rem;
        }

        .rich-text-content h3 {
          font-size: 1rem;
        }

        .rich-text-content blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 0.9rem;
          color: hsl(var(--foreground) / 0.85);
        }

        .rich-text-content .rich-text-table-wrap {
          margin: 0.85rem 0;
          overflow-x: auto;
          border-radius: calc(var(--radius) + 0.1rem);
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
        }

        .rich-text-content .rich-text-table {
          width: 100%;
          min-width: 520px;
          border-collapse: collapse;
        }

        .rich-text-content .rich-text-table th,
        .rich-text-content .rich-text-table td {
          padding: 0.8rem 0.95rem;
          text-align: left;
          vertical-align: top;
          border-bottom: 1px solid hsl(var(--border));
        }

        .rich-text-content .rich-text-table thead {
          background: hsl(var(--muted) / 0.45);
        }

        .rich-text-content .rich-text-table th {
          color: hsl(var(--foreground));
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .rich-text-content .rich-text-table td {
          color: hsl(var(--foreground) / 0.86);
          line-height: 1.55;
        }

        .rich-text-content .rich-text-table tbody tr:last-child td {
          border-bottom: 0;
        }
      `}</style>
    </>
  );
}

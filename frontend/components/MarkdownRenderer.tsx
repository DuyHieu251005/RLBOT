import { memo } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Simple HTML sanitizer to prevent XSS attacks
function sanitizeHTML(html: string): string {
  // Remove potentially dangerous tags and attributes
  const dangerousTags = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  const dangerousAttrs = /on\w+\s*=\s*["'][^"']*["']/gi;
  const dangerousProtocols = /javascript:|data:/gi;
  
  let sanitized = html;
  
  // Remove script tags
  sanitized = sanitized.replace(dangerousTags, '');
  
  // Remove event handlers (onclick, onload, etc)
  sanitized = sanitized.replace(dangerousAttrs, '');
  
  // Remove dangerous protocols
  sanitized = sanitized.replace(dangerousProtocols, '');
  
  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<(iframe|object|embed)[^>]*>.*?<\/\1>/gi, '');
  
  return sanitized;
}

// Parse markdown to HTML
function parseMarkdown(markdown: string): string {
  let html = markdown;
  
  // Escape HTML first
  html = html
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');
  
  // Code blocks (```code```)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || 'text';
    return `<pre class="code-block" data-lang="${language}"><code>${code.trim()}</code></pre>`;
  });
  
  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic (*text* or _text_)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Strikethrough (~~text~~)
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  
  // Headers (# Header)
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
  
  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');
  
  // Unordered lists (- item or * item)
  html = html.replace(/^[\*\-] (.+)$/gm, '<li class="md-li">$1</li>');
  html = html.replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul">$&</ul>');
  
  // Ordered lists (1. item)
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="md-li-ordered">$1</li>');
  html = html.replace(/(<li class="md-li-ordered">.*<\/li>\n?)+/g, '<ol class="md-ol">$&</ol>');
  
  // Blockquotes (> text)
  html = html.replace(/^> (.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');
  
  // Horizontal rule (--- or ***)
  html = html.replace(/^(\*\*\*|---|___)$/gm, '<hr class="md-hr" />');
  
  // Line breaks (double space or \n\n)
  html = html.replace(/\n\n/g, '<br class="md-br" />');
  
  // Paragraphs
  const lines = html.split('\n');
  html = lines.map(line => {
    if (line.trim() && 
        !line.startsWith('<h') && 
        !line.startsWith('<ul') && 
        !line.startsWith('<ol') && 
        !line.startsWith('<pre') && 
        !line.startsWith('<blockquote') &&
        !line.startsWith('<li')) {
      return `<p class="md-p">${line}</p>`;
    }
    return line;
  }).join('\n');
  
  return html;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const htmlContent = parseMarkdown(content);
  const sanitizedContent = sanitizeHTML(htmlContent);
  
  return (
    <div 
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
});

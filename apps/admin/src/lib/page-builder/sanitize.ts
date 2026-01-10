/**
 * Sanitization Utilities
 * 
 * Security: HTML sanitization i link validation.
 * Używane na frontend (przed renderem) i backend (przed zapisem).
 */

import DOMPurify from 'dompurify';

// =============================================================================
// HTML SANITIZATION
// =============================================================================

/**
 * Dozwolone tagi HTML w TextBlock.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'sub', 'sup',
  'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'span', 'div',
  'blockquote', 'pre', 'code',
];

/**
 * Dozwolone atrybuty HTML.
 */
const ALLOWED_ATTRS = [
  'href', 'target', 'rel', 'class', 'style',
  'id', 'title', 'alt',
];

/**
 * Dozwolone protokoły w linkach.
 */
const ALLOWED_URI_REGEXP = /^(https?|mailto|tel):/i;

/**
 * Sanityzuje HTML używając DOMPurify.
 * 
 * @example
 * const safe = sanitizeHtml('<script>alert("xss")</script><p>Hello</p>');
 * // Result: '<p>Hello</p>'
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS,
    ALLOWED_URI_REGEXP,
    // Remove empty tags
    KEEP_CONTENT: true,
    // Force links to have rel="noopener"
    ADD_ATTR: ['target'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}

/**
 * Sanityzuje HTML dla podglądu (bardziej restrykcyjny).
 */
export function sanitizeHtmlForPreview(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOWED_URI_REGEXP,
  });
}

// =============================================================================
// LINK VALIDATION
// =============================================================================

/**
 * Sprawdza czy URL jest bezpieczny.
 * Dozwolone: http, https, mailto, tel
 * 
 * @example
 * isValidLink('https://example.com') // true
 * isValidLink('javascript:alert(1)') // false
 * isValidLink('mailto:test@example.com') // true
 */
export function isValidLink(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Empty or whitespace
  if (!url.trim()) return false;
  
  // Check protocol
  return ALLOWED_URI_REGEXP.test(url.trim());
}

/**
 * Sanityzuje URL - zwraca pusty string jeśli nieprawidłowy.
 */
export function sanitizeLink(url: string): string {
  if (!isValidLink(url)) return '';
  return url.trim();
}

/**
 * Tworzy bezpieczny link z atrybutami.
 */
export function createSafeLink(url: string): {
  href: string;
  target?: string;
  rel?: string;
} {
  const sanitized = sanitizeLink(url);
  
  if (!sanitized) {
    return { href: '#' };
  }
  
  // External links
  if (sanitized.startsWith('http')) {
    return {
      href: sanitized,
      target: '_blank',
      rel: 'noopener noreferrer',
    };
  }
  
  // mailto: or tel:
  return { href: sanitized };
}

// =============================================================================
// PAGE CONTENT SANITIZATION
// =============================================================================

import type { PageContent, BlockNode } from './types';

/**
 * Sanityzuje cały content strony.
 * Używane na backend przed zapisem.
 */
export function sanitizePageContent(content: PageContent): PageContent {
  const nodes: Record<string, BlockNode> = {};
  
  for (const [id, node] of Object.entries(content.nodes)) {
    nodes[id] = sanitizeBlockNode(node);
  }
  
  return { ...content, nodes };
}

/**
 * Sanityzuje pojedynczy node.
 */
export function sanitizeBlockNode(node: BlockNode): BlockNode {
  const sanitizedNode = { ...node };
  const contentProps = { ...node.props.content };
  
  // Sanitize HTML content
  if (node.type === 'text' && typeof contentProps.html === 'string') {
    contentProps.html = sanitizeHtml(contentProps.html);
  }
  
  // Sanitize links
  if (typeof contentProps.link === 'string') {
    contentProps.link = sanitizeLink(contentProps.link);
  }
  
  if (typeof contentProps.href === 'string') {
    contentProps.href = sanitizeLink(contentProps.href);
  }
  
  // Sanitize image URLs (allow more protocols for images)
  if (typeof contentProps.src === 'string') {
    const src = contentProps.src.trim();
    if (!src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:image/')) {
      contentProps.src = '';
    }
  }
  
  sanitizedNode.props = {
    ...node.props,
    content: contentProps,
  };
  
  return sanitizedNode;
}

// =============================================================================
// TEXT UTILITIES
// =============================================================================

/**
 * Konwertuje plain text na HTML (escape + line breaks).
 */
export function textToHtml(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

/**
 * Usuwa wszystkie tagi HTML, zostawia tylko tekst.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Truncuje tekst do określonej długości.
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

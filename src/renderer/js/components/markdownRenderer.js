import { marked } from '../../../../node_modules/marked/lib/marked.esm.js';
import DOMPurify from '../../../../node_modules/dompurify/dist/purify.es.mjs';

// Override link renderer: open all links in system browser via IPC
const renderer = new marked.Renderer();
renderer.link = ({ href, title, text }) => {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="#" data-href="${href}"${titleAttr} class="md-link">${text}</a>`;
};

marked.use({ renderer, gfm: true, breaks: true });

export function renderMarkdown(raw) {
  if (!raw) return '';
  const dirty = marked.parse(raw);
  return DOMPurify.sanitize(dirty, { ADD_ATTR: ['data-href'] });
}

// Wire external link handler — call once after inserting markdown HTML into the DOM
export function wireLinks(container) {
  container.querySelectorAll('a.md-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.dataset.href;
      if (href) window.open(href, '_blank');
    });
  });
}

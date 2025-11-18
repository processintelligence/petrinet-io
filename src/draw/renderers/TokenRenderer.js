/**
 * Handles rendering of tokens for Petri net places
 * Displays 1-4 tokens as dots, >4 tokens as a number
 */
import { create as svgCreate, attr as svgAttr, append as svgAppend } from 'tiny-svg';

export default class TokenRenderer {
  constructor(styles) {
    this.styles = styles;
  }

  // Render tokens for a place element
  render(parentGfx, element) {
    const tokens = Number.isFinite(element.businessObject?.tokens)
      ? element.businessObject.tokens
      : 0;

    // Don't render if no tokens
    if (tokens <= 0) {
      return;
    }

    // Calculate center and dimensions
    const cx = element.width / 2;
    const cy = element.height / 2;
    const r = Math.min(element.width, element.height) / 2;
    const dotR = Math.max(2, Math.min(6, r / 6));
    const fillAttrs = this.styles.computeStyle({}, { fill: 'black' });

    // Render based on token count
    if (tokens === 1) {
      this._renderDot(parentGfx, cx, cy, dotR, fillAttrs);
    } else if (tokens === 2) {
      this._renderDot(parentGfx, cx - dotR * 2, cy, dotR, fillAttrs);
      this._renderDot(parentGfx, cx + dotR * 2, cy, dotR, fillAttrs);
    } else if (tokens === 3) {
      this._renderDot(parentGfx, cx, cy - dotR * 2, dotR, fillAttrs);
      this._renderDot(parentGfx, cx - dotR * 2, cy + dotR * 2, dotR, fillAttrs);
      this._renderDot(parentGfx, cx + dotR * 2, cy + dotR * 2, dotR, fillAttrs);
    } else if (tokens === 4) {
      this._renderDot(parentGfx, cx - dotR * 2, cy - dotR * 2, dotR, fillAttrs);
      this._renderDot(parentGfx, cx + dotR * 2, cy - dotR * 2, dotR, fillAttrs);
      this._renderDot(parentGfx, cx - dotR * 2, cy + dotR * 2, dotR, fillAttrs);
      this._renderDot(parentGfx, cx + dotR * 2, cy + dotR * 2, dotR, fillAttrs);
    } else if (tokens > 4) {
      this._renderTokenCount(parentGfx, cx, cy, tokens);
    }
  }

  // Render a single token dot
  _renderDot(parentGfx, cx, cy, radius, attrs) {
    const dot = svgCreate('circle');
    svgAttr(dot, { cx, cy, r: radius });
    svgAttr(dot, attrs);
    svgAppend(parentGfx, dot);
  }

  // Render token count as text for >4 tokens
  _renderTokenCount(parentGfx, cx, cy, count) {
    const text = svgCreate('text');
    svgAttr(text, {
      x: cx,
      y: cy,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle'
    });
    svgAttr(text, this.styles.computeStyle({}, { fill: 'black', fontSize: 12, fontFamily: 'Arial, sans-serif' }));
    text.textContent = String(count);
    svgAppend(parentGfx, text);
  }
}

import { sanitizeMessageContent } from './messageUtils';

describe('sanitizeMessageContent', () => {
  it('removes script tags from content', () => {
    const dirty = '<div>hello</div><script>alert("x")</script>';
    const clean = sanitizeMessageContent(dirty);
    expect(clean).toBe('<div>hello</div>');
  });

  it('strips dangerous attributes', () => {
    const dirty = '<img src="x" onerror="alert(1)">';
    const clean = sanitizeMessageContent(dirty);
    expect(clean).toBe('<img src="x">');
    expect(clean).not.toMatch(/onerror/i);
  });
});


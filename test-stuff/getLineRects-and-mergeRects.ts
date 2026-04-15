function getLineRects(textNode: Node) {
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return [];

  const range = document.createRange();
  range.selectNodeContents(textNode);

  const adjust = (r: DOMRect) => new DOMRect(
    // NOTE: this might need to be adjusted for the canvasRect position as well
    r.x + window.scrollX,
    r.y + window.scrollY,
    r.width,
    r.height
  )

  // getClientRects() returns one DOMRect per rendered line for text
  const arr = Array.from(range.getClientRects())
  const adjustedArr = arr.map(adjust)
  return adjustedArr
}

function mergeRectsOnSameLine(rects: DOMRect[], verticalTolerance = 5, horizontalTolerance = 10): DOMRect[] {
  if (!rects || rects.length === 0) return [];

  // Create mutable copies and sort by vertical position (top to bottom)
  const items = rects.map(r => ({
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom
  })).sort((a, b) => a.y - b.y);

  const merged = [];
  let current = { ...items[0] };

  for (let i = 1; i < items.length; i++) {
    const next = items[i];

    // Check if on the same line using vertical tolerance
    const isSameLineVertically =
      Math.abs(current.y - next.y) <= verticalTolerance ||
      Math.abs(current.bottom - next.bottom) <= verticalTolerance ||
      (current.bottom >= next.top - verticalTolerance &&
        current.top <= next.bottom + verticalTolerance);

    // Check if they are close enough horizontally (for adjacent fragments)
    const isCloseHorizontally =
      next.left <= current.right + horizontalTolerance &&
      current.left <= next.right + horizontalTolerance;

    if (isSameLineVertically && isCloseHorizontally) {
      // Merge the rects
      current.left = Math.min(current.left, next.left);
      current.right = Math.max(current.right, next.right);
      current.top = Math.min(current.top, next.top);
      current.bottom = Math.max(current.bottom, next.bottom);

      current.x = current.left;
      current.y = current.top;
      current.width = current.right - current.left;
      current.height = current.bottom - current.top;
    } else {
      // Finish current line and start new one
      merged.push(new DOMRect(current.x, current.y, current.width, current.height));
      current = { ...next };
    }
  }

  // Add the last group
  merged.push(new DOMRect(current.x, current.y, current.width, current.height));

  return merged;
}


function drawBoxAroundRect(rect: DOMRect, canvas: HTMLCanvasElement, color = "red", thickness = 3) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Resize canvas to match viewport
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  const canvasRect = canvas.getBoundingClientRect();

  // Correct formula for fixed canvas overlay:
  const x = rect.x - canvasRect.left - window.scrollX;
  const y = rect.y - canvasRect.top - window.scrollY;

  // Clear previous drawing
  // ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.strokeRect(x, y, rect.width, rect.height);

  // console.log('Drawn at:', x.toFixed(1), y.toFixed(1));
}

function getAllTextNodes(element: HTMLElement): Node[] {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,     // Only text nodes
    null,                     // No custom filter (or add one to skip whitespace)
    //@ts-ignore
    false
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  return textNodes;
}

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

function drawNumber(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  number: number,
  color: string = '#00ff00',
  size: number = 20
) {
  ctx.save();

  ctx.font = `${size}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText(number.toString(), x, y);

  ctx.restore();
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

// const div = document.body
// const nodes = getAllTextNodes(div)
// const firstRects = nodes.flatMap(getLineRects)
// const rects = mergeRectsOnSameLine(firstRects, 3, 15)
// const canvas = getCanvas()
// const ctx = canvas.getContext('2d')
// const canvasRect = canvas.getBoundingClientRect()
//
// function animate() {
//   ctx.clearRect(0, 0, canvas.width, canvas.height);
//   // rects.forEach(r => drawBoxAroundRect(r, "red", 3))
//   for (let idx = 0; idx < rects.length; idx++) {
//     const r = rects[idx]
//     drawBoxAroundRect(r, "red", 4)
//     drawNumber(
//       ctx,
//       r.left - canvasRect.left - window.scrollX,
//       r.top - canvasRect.top - window.scrollY,
//       idx,
//       "green",
//       20
//     )
//   }
//
//   for (let idx = 0; idx < firstRects.length; idx++) {
//     const r = firstRects[idx]
//     drawBoxAroundRect(r, "blue", 2)
//   }
//
//
//   requestAnimationFrame(animate)
// }
//
// animate()

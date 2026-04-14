import { logRange } from "../common"

let LOG_RANGES = true

export class RangeManager {
  RANGES: Range[] | null = null
  RANGE_IDX: number = 0

  constructor() { }

  async initRanges(eleArray: Element[]): Promise<void> {
    if (eleArray.length < 1) {
      console.warn(`RangeManager.initRanges: eleArray.length is zero!`)
      return
    }
    this.RANGES = RangeManager.#eleArray2Ranges(eleArray)

    // this.RANGES = this.RANGES.sort(
    //   (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
    // )
  }

  toggleLogRanges(): boolean {
    LOG_RANGES = !LOG_RANGES
    return LOG_RANGES
  }

  getRectsToClear(): DOMRect[] {
    const rng = this.getCurrentRange()
    const rect = rng!.getBoundingClientRect()
    return [rect]
  }

  getRangeIdx(): number {
    return this.RANGE_IDX
  }

  getCurrentRange(): Range | undefined {
    if (this.RANGES === null) {
      console.warn('RangeManager.getCurrentRange: this.RANGES is null!')
      return undefined
    }
    const range = this.RANGES[this.RANGE_IDX]
    if (range === undefined) {
      console.warn(`RangeManager.getCurrentRange: range at index ${this.RANGE_IDX} undefined!`)
      return undefined
    }
    return range
  }

  rangeIdx2Range(rangeIdx: number): Range | undefined {
    if (this.RANGES === null) {
      console.warn(`RangeManager.rangeIdx2Range: this.RANGES is null!`)
      return undefined
    }
    const range = this.RANGES[rangeIdx]
    if (range === undefined) {
      console.warn(`RangeManager.rangeIdx2Range: this.RANGES[${rangeIdx}] is undefined!`)
      return undefined
    }
    return range
  }

  setRangeIdx(rangeIdx: number): void {
    this.RANGE_IDX = rangeIdx
  }

  getRangesLength(): number | undefined {
    if (this.RANGES === null) {
      console.warn(`RangeManager.getRangesLength: this.RANGES is null!`)
      return undefined
    }
    return this.RANGES.length
  }

  static #rangeIsOccluded(range: Range): boolean {
    const rect = range.getBoundingClientRect()

    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);

    // NOTE: this is here because if the range is outside the window then elementFromPoint comes back null and the check fails - so we return false here to be safe
    if (centerY < 0 || centerY > window.innerHeight) return false

    const topElement = document.elementFromPoint(centerX, centerY)
    if (!topElement) return true

    // if the range does not intersect the topElement that means it's not on top
    const isOnTop = range.intersectsNode(topElement)
    const isNotOnTop = !isOnTop

    return isNotOnTop
  }

  // TODO: there are more checks in snippet number 8 on the laptop
  static #isElementVisiblyRendered(el: Element | null): boolean {
    if (!el) return true;

    const style = window.getComputedStyle(el);

    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity) < 0.1) return false; // very low opacity

    // content-visibility: hidden also hides rendering
    if (style.contentVisibility === 'hidden') return false;

    // Recurse up the tree (in case ancestor is hidden)
    return this.#isElementVisiblyRendered(el.parentElement);
  }

  static #eleHasScrollWidth(ele: Element | null): boolean {
    if (!ele) return false
    if (ele.scrollWidth > ele.clientWidth) return true
    return RangeManager.#eleHasScrollWidth(ele.parentElement)
  }

  static #isOffToTheSide(ele: Element | null, rect: DOMRect): boolean {
    // NOTE: if range is inside an element with scrollWidth we assume we can get to it somehow
    const hasScrollWidth = RangeManager.#eleHasScrollWidth(ele)
    if (hasScrollWidth) return false

    const vw = window.innerWidth || document.documentElement.clientWidth
    return rect.left < 0 || rect.right > vw
  }

  static rangeIsVisible(range: Range): boolean {
    if (RangeManager.#rangeIsOccluded(range)) return false

    const ele = range.commonAncestorContainer instanceof Element ?
      range.commonAncestorContainer : range.commonAncestorContainer.parentElement

    const isRendered = RangeManager.#isElementVisiblyRendered(ele)
    if (!isRendered) return false

    const rect = range.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return false
    if (RangeManager.#isOffToTheSide(ele, rect)) return false

    return true
  }

  getFirstVisibleRange(): Range | undefined {
    this.setRangeIdx(0)
    let range: Range | undefined = this.getCurrentRange()
    if (range === undefined) {
      console.error('RangeManager.getFirstVisibleRange: could not get first visible range')
      return undefined
    }
    if (!RangeManager.rangeIsVisible(range)) {
      range = this.incLine()
      if (range === undefined) {
        console.error('RangeManager.getFirstVisibleRange: could not get first visible range!')
        return undefined
      }
    }
    return range
  }

  // TODO: change the incLine and decLine interface to return [idx, Range] or [null, null]
  incLine(): Range | undefined {
    if (this.RANGES === null) {
      console.error(`RangeManager.incLine: RANGES is null`)
      return undefined
    }
    // find the next visible range
    for (let newIdx = this.RANGE_IDX + 1; newIdx < this.RANGES.length; newIdx++) {
      const iterRange = this.RANGES[newIdx]
      if (RangeManager.rangeIsVisible(iterRange)) {
        this.RANGE_IDX = newIdx
        if (LOG_RANGES) logRange({
          range: iterRange,
          idx: this.RANGE_IDX,
          caller: 'RangeManager.incLine'
        })
        return iterRange
      }
    }
    console.warn(`RangeManger.incLine: no visible ranges after RANGE_IDX ${this.RANGE_IDX}`)
  }

  decLine(): Range | undefined {
    if (this.RANGES === null) {
      console.error(`RangeManager.decLine: this.RANGES is null`)
      return undefined
    }
    // find the first previous visible range
    for (let newIdx = this.RANGE_IDX - 1; newIdx >= 0; newIdx--) {
      const iterRange = this.RANGES[newIdx]
      if (RangeManager.rangeIsVisible(iterRange)) {
        this.RANGE_IDX = newIdx
        if (LOG_RANGES) logRange({
          range: iterRange,
          idx: this.RANGE_IDX,
          caller: 'RangeManager.incLine'
        })
        return iterRange
      }
    }
    console.warn(`RangeManager.decLine: no visible ranges before this.RANGE_IDX ${this.RANGE_IDX}`)
  }

  rangeAtPoint(top: number, left: number): [Range, number] | [null, null] {
    // TODO: implement a binary search here
    const len = this.getRangesLength() as number
    for (let idx = 0; idx < len; idx++) {
      const iterRange = this.rangeIdx2Range(idx) as Range
      const box = iterRange.getBoundingClientRect()
      // console.log(`${idx}\t${top}\t${box.top}`)
      // left has to be BETWEEN box.left and box.right
      if (top <= box.top && left >= box.left && left <= box.right) {
        // console.log(`top:\t\t${top}\nbox.top:\t${box.top}`)
        return [iterRange, idx]
      }
    }
    console.error(`RangeManager.rangeAtHeight: ERROR could not get range`)
    return [null, null]
  }

  range2RangeIdx(range: Range): number | undefined {
    const len = this.getRangesLength() as number
    for (let idx = 0; idx < len; idx++) {
      const iterRange = this.rangeIdx2Range(idx)
      if (range === iterRange) {
        return idx
      }
    }
    console.error(`RangeManager.range2RangeIdx: ERROR - could not get idx for range! `)
    return
  }

  static #eleArray2Ranges(eleArray: Element[]): Array<Range> {
    // FIXME: always going from document.body as the root fails in the pdf reader
    // TODO: refactor so eleArray2Ranges doesn't take a list of eles, but rather a root
    // TODO: refactor getTvEles to getTvRoot

    const allNodes = []
    for (let idx = 0; idx < eleArray.length; idx++) {
      allNodes.push(
        ...RangeManager.#getAllTextNodes(eleArray[idx])
      )
    }

    const ranges = RangeManager.#textNodes2Ranges(allNodes)
    return ranges
  }

  static #getAllTextNodes(root: Node): Node[] {
    const badTagNames = ['SCRIPT', 'STYLE']
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,     // Only text nodes
      (node: Node) => {
        // Skip whitespace-only text nodes
        const text = (node as Text).data.trim();
        if (text.length === 0) return NodeFilter.FILTER_REJECT
        // Skip certain types of tags
        const parentType = node.parentElement!.tagName
        if (badTagNames.includes(parentType)) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
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

  // TODO: refactor so it uses binary search to find range endings
  static #textNodes2Ranges(textNodes: Node[]): Range[] {
    if (textNodes.length === 0) return [];

    // Safety limit to prevent infinite loops in pathological cases
    const MAX_ITERATIONS = 100_000;
    const BOTTOM_LIMIT = 5;           // pixels — when bottom jumps more than this → new line
    const TOP_LIMIT = 10;

    const ranges: Range[] = [];

    // We'll maintain one active range and extend it character-by-character
    let currentRange = new Range();
    ranges.push(currentRange);

    let nodeIndex = 0;                // which text node we're currently in
    let offsetInNode = 0;             // offset inside the current text node

    currentRange.setStart(textNodes[0], 0);

    let previousBottom = currentRange.getBoundingClientRect().bottom;
    let previousTop = currentRange.getBoundingClientRect().top

    let iterCount = 0

    while (nodeIndex < textNodes.length) {
      if (offsetInNode >= textNodes[nodeIndex].textContent!.length) {
        nodeIndex++
        offsetInNode = 0
        if (!(nodeIndex < textNodes.length)) break
      }

      // Extend current range by one more character
      offsetInNode++;
      currentRange.setEnd(textNodes[nodeIndex], offsetInNode);

      const curRect = currentRange.getBoundingClientRect()
      const currentBottom = curRect.bottom
      const currentTop = curRect.top

      const bottomExceed = Math.abs(currentBottom - previousBottom) > BOTTOM_LIMIT
      const topExceed = Math.abs(currentTop - previousTop) > TOP_LIMIT

      // Did we cross into a new visual line?
      if (bottomExceed || topExceed) {
        // Roll back one character — that one belongs to the next line
        currentRange.setEnd(textNodes[nodeIndex], offsetInNode - 1);

        // NOTE: this block rolls the selection back until there's no more trailing whitespace
        let newOffset = offsetInNode - 1
        let newNodeIdx = nodeIndex
        // FIXME: set an upper bound on this
        while (
          currentRange.toString().match(/\s$/)
        ) {
          newOffset = newOffset - 1
          if (newOffset <= 0) {
            newNodeIdx = newNodeIdx - 1
            newOffset = textNodes[newNodeIdx].textContent!.length
          }
          currentRange.setEnd(textNodes[newNodeIdx], newOffset);
        }

        // Start new line range
        const nextRange = new Range();
        nextRange.setStart(textNodes[nodeIndex], offsetInNode - 1);
        nextRange.setEnd(textNodes[nodeIndex], offsetInNode)
        ranges.push(nextRange);

        currentRange = nextRange;

        const nextRect = nextRange.getBoundingClientRect()
        previousBottom = nextRect.bottom
        previousTop = nextRect.top
      }

      if (iterCount++ > MAX_ITERATIONS) {
        console.error(`textNodes2Ranges: ${MAX_ITERATIONS} iterations reached! exiting...`)
        break
      }
    }

    return ranges;
  }

  async nodeOffset2Range(node: Node, offset: number): Promise<[number, Range] | [null, null]> {
    const len = this.getRangesLength() ?? 0;
    if (len === 0) return [null, null];

    let left = 0;
    let right = len - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const range = this.rangeIdx2Range(mid);

      if (!range) break;

      const cmp = range.comparePoint(node, offset);  // -1 before, 0 inside, +1 after

      if (cmp === 0) {
        return [mid, range];
      } else if (cmp < 0) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    console.error(`TvDirector.nodeOffset2Range: search for range failed`);
    return [null, null];
  }

  async bruteForceSearch(node: Node, offset: number): Promise<[number, Range] | [null, null]> {
    const len = this.getRangesLength() ?? 0
    for (let idx = 0; idx < len; idx++) {
      const iterRange = this.rangeIdx2Range(idx)
      if (!iterRange) continue
      if (iterRange.isPointInRange(node, offset)) {
        return [idx, iterRange]
      }
    }
    console.error(`TvDirector.bruteForceSearch: search for range failed`)
    return [null, null]
  }

  async bothWaysSearch(node: Node, offset: number, startIdx: number): Promise<[number, Range] | [null, null]> {
    let iterRange = this.rangeIdx2Range(startIdx)
    if (iterRange && iterRange.isPointInRange(node, offset)) {
      return [startIdx, iterRange]
    }

    const len = this.getRangesLength() ?? 0
    let topIdx = startIdx + 1
    let botIdx = startIdx - 1

    while (topIdx < len && botIdx >= 0) {
      if (topIdx < len) {
        const topRange = this.rangeIdx2Range(topIdx)
        if (topRange && topRange.isPointInRange(node, offset)) {
          return [topIdx, topRange]
        }
        topIdx++
      }
      if (botIdx >= 0) {
        const botRange = this.rangeIdx2Range(botIdx)
        if (botRange && botRange.isPointInRange(node, offset)) {
          return [botIdx, botRange]
        }
        botIdx--
      }
    }

    console.error('TvDirector.bothWaysSearch: could not find range!')
    return [null, null]
  }

  async searchBehind(node: Node, offset: number, startIdx: number): Promise<[number, Range] | [null, null]> {
    for (let idx = startIdx; idx >= 0; idx--) {
      const iterRange = this.rangeIdx2Range(idx)
      if (iterRange === undefined) {
        console.warn(`TvDirector.searchBehind: could not get range at index ${idx}`)
        continue
      }
      if (iterRange.isPointInRange(node, offset)) {
        return [idx, iterRange]
      }
    }
    console.error('TvDirector.searchBehind: could not find range!')
    return [null, null]
  }

  async searchAhead(node: Node, offset: number, startIdx: number): Promise<[number, Range] | [null, null]> {
    const len = this.getRangesLength() ?? 0
    for (let idx = startIdx; idx < len; idx++) {
      const iterRange = this.rangeIdx2Range(idx)
      if (iterRange === undefined) {
        console.warn(`TvDirector.searchAhead: could not get range at index ${idx}`)
        continue
      }
      if (iterRange.isPointInRange(node, offset)) {
        return [idx, iterRange]
      }
    }
    console.error('TvDirector.searchAhead: could not find range!')
    return [null, null]
  }
}


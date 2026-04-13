let LOG_RANGES = false

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

  // static getMaxHeight(range: Range): number {
  //   let res = 0
  //   for (const rect of range.getClientRects()) {
  //     if (rect.height > res) {
  //       res = rect.height
  //     }
  //   }
  //   return res
  // }

  // FIXME: make rangeIsVisible more robust
  static rangeIsVisible(rng: Range): boolean {
    const parent = rng.startContainer.parentElement
    if (!parent) {
      console.warn('range with no parent element!')
      return false
    }

    if (!parent.checkVisibility()) {
      return false
    }

    const compStyle = window.getComputedStyle(parent)
    if (compStyle.visibility === 'hidden') {
      return false
    }

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
        if (LOG_RANGES) {
          console.log(`RangeManager.incLine: range set to range at index ${this.RANGE_IDX}`)
          console.log(iterRange)
          console.log(iterRange.getBoundingClientRect())
          console.log(iterRange.toString())
        }
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
        if (LOG_RANGES) {
          console.log(`RangeManager.decLine: range set to range at index ${this.RANGE_IDX}`)
          console.log(iterRange)
          console.log(iterRange.getBoundingClientRect())
          console.log(iterRange.toString())
        }
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

  // TODO: refactor eleArray2Ranges to async generator to work with very large texts
  static #eleArray2Ranges(eleArray: Element[]): Array<Range> {
    const textNodes: Array<Node> = []
    for (let idx = 0; idx < eleArray.length; idx++) {
      const iterEle = eleArray[idx]
      const iterNodes = RangeManager.#getAllTextNodes(iterEle)
      textNodes.push(...iterNodes)
    }

    const ranges = RangeManager.#textNodes2Ranges(textNodes)

    return ranges
  }

  static #getAllTextNodes(root: Node): Node[] {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,     // Only text nodes
      (node: Node) => {
        // Skip whitespace-only text nodes
        const text = (node as Text).data.trim();
        return text.length === 0
          ? NodeFilter.FILTER_SKIP     // or FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
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
    const lengths = textNodes.map(node => node.textContent?.length ?? 0);
    const cumulativeEndIndices = this.#computeCumulativeEndIndices(lengths);
    const totalChars = cumulativeEndIndices.at(-1) ?? 0;

    // We'll maintain one active range and extend it character-by-character
    let currentRange = new Range();
    ranges.push(currentRange);

    let charIndex = 0;                // global character position across all text nodes
    let nodeIndex = 0;                // which text node we're currently in
    let offsetInNode = 0;             // offset inside the current text node

    currentRange.setStart(textNodes[0], 0);

    let previousBottom = currentRange.getBoundingClientRect().bottom;
    let previousTop = currentRange.getBoundingClientRect().top

    while (charIndex < totalChars) {
      if (offsetInNode >= textNodes[nodeIndex].textContent!.length) {
        nodeIndex++
        offsetInNode = 0
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

        let newOffset = offsetInNode - 1
        let newCharIdx = charIndex
        let newNodeIdx = nodeIndex
        while (
          currentRange.toString().match(/\s$/)
        ) {
          newOffset = newOffset - 1
          newCharIdx = newCharIdx - 1
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

      charIndex++;

      if (charIndex > MAX_ITERATIONS) {
        console.warn('textNodesToLineRanges: iteration limit reached — possible infinite loop');
        break;
      }
    }

    // Make sure last range goes all the way to the end
    if (ranges.length > 0) {
      const lastNode = textNodes[textNodes.length - 1];
      const lastLength = lengths[lengths.length - 1];
      ranges[ranges.length - 1].setEnd(lastNode, lastLength);
    }

    return ranges;
  }

  static #computeCumulativeEndIndices(lengths: number[]): number[] {
    const ends: number[] = [];
    let sum = 0;
    for (const len of lengths) {
      sum += len;
      ends.push(sum);
    }
    return ends;
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


const TEXT_NODE_NAME = '#text'
const LOG_RANGES = false

export class RangeManager {
  RANGES: Range[] | null = null
  RANGE_IDX: number = 0

  constructor(eleArray: Array<Element>) {
    this.initRanges(eleArray)
  }

  initRanges(eleArray: Array<Element>): void {
    if (!eleArray) {
      console.warn(`WARNING - RangeManager.initRanges: eleArray is ${eleArray}!`)
      return
    }
    if (eleArray.length < 1) {
      console.warn(`WARNING - RangeManager.initRanges: eleArray.length is zero!`)
      return
    }
    this.RANGES = RangeManager.eleArray2Ranges(eleArray)
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
      console.warn(`WARNING - RangeManager.getCurrentRange: range at index ${this.RANGE_IDX} (the current range) is undefined!`)
      return undefined
    }
    return range
  }

  rangeIdx2Range(rangeIdx: number): Range | undefined {
    if (this.RANGES === null) {
      console.warn(`WARNING - RangeManager.rangeIdx2Range: this.RANGES is null!`)
      return undefined
    }
    const range = this.RANGES[rangeIdx]
    if (range === undefined) {
      console.warn(`WARNING - RangeManager.rangeIdx2Range: this.RANGES[${rangeIdx}] is undefined!`)
      return undefined
    }
    return range
  }

  setRangeIdx(rangeIdx: number): void {
    this.RANGE_IDX = rangeIdx
  }

  getRangesLength(): number | undefined {
    if (this.RANGES === null) {
      console.warn(`WARNING - RangeManager.getRangesLength: this.RANGES is null!`)
      return undefined
    }
    return this.RANGES!.length
  }

  static getMaxHeight(range: Range): number {
    let res = 0
    for (const rect of range.getClientRects()) {
      if (rect.height > res) {
        res = rect.height
      }
    }
    return res
  }

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
      range = this.getNextRange()
      if (range === undefined) {
        console.error('RangeManager.getFirstVisibleRange: could not get first visible range!')
        return undefined
      }
    }
    return range
  }

  getNextRange(): Range | undefined {
    if (this.RANGES === null) {
      console.error(`RangeManager.getNextRange: RANGES is null`)
      return undefined
    }
    // find the next visible range
    for (let newIdx = this.RANGE_IDX + 1; newIdx < this.RANGES.length; newIdx++) {
      const iterRange = this.RANGES[newIdx]
      if (RangeManager.rangeIsVisible(iterRange)) {
        this.RANGE_IDX = newIdx
        if (LOG_RANGES) {
          console.log(`RangeManager.getNextRange: range set to range at index ${this.RANGE_IDX}`)
          console.log(iterRange)
          console.log(iterRange.getBoundingClientRect())
        }
        return iterRange
      }
    }
    console.warn(`RangeManger.getNextRange: no visible ranges after RANGE_IDX ${this.RANGE_IDX}`)
  }

  getPrevRange(): Range | undefined {
    if (this.RANGES === null) {
      console.error(`RangeManager.getPrevRange: this.RANGES is null`)
      return undefined
    }
    // find the first previous visible range
    for (let newIdx = this.RANGE_IDX - 1; newIdx >= 0; newIdx--) {
      const iterRange = this.RANGES[newIdx]
      if (RangeManager.rangeIsVisible(iterRange)) {
        this.RANGE_IDX = newIdx
        if (LOG_RANGES) {
          console.log(`RangeManager.getPrevRange: range set to range at index ${this.RANGE_IDX}`)
          console.log(iterRange)
          console.log(iterRange.getBoundingClientRect())
        }
        return iterRange
      }
    }
    console.warn(`RangeManager.getPrevRange: no visible ranges before this.RANGE_IDX ${this.RANGE_IDX}`)
  }

  // TODO: refactor eleArray2Ranges to async generator to work with very large texts
  static eleArray2Ranges(eleArray: Array<Element>): Array<Range> {
    const res: Array<Range> = []
    for (let idx = 0; idx < eleArray.length; idx++) {
      const ele = eleArray[idx]
      const iterRes = RangeManager.#ele2Ranges(ele)
      res.push(...iterRes)
    }
    return res
  }

  static nodeHasRealText(textNode: Node): boolean {
    return textNode.textContent!.trim().length > 0
  }

  static #ele2Ranges(ele: Element): Array<Range> {
    const textNodesWithText = RangeManager.#getAllTextNodes(ele)
      .filter(RangeManager.nodeHasRealText)
    const ranges = RangeManager.textNodes2Ranges(textNodesWithText)
    return ranges
  }

  static #getAllTextNodes(node: Node): Array<Node> {
    const res = []
    if (node.nodeName === TEXT_NODE_NAME) {
      res.push(node)
      return res
    }
    for (const cn of node.childNodes) {
      const iterRes = RangeManager.#getAllTextNodes(cn)
      res.push(...iterRes)
    }
    return res
  }

  static textNodes2Ranges(textNodes: Node[]): Range[] {
    if (textNodes.length === 0) return [];

    // Safety limit to prevent infinite loops in pathological cases
    const MAX_ITERATIONS = 100_000;
    const LINE_BREAK_THRESHOLD = 5;           // pixels — when bottom jumps more than this → new line

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

    while (charIndex < totalChars) {
      // Move to next text node when we reach the end of current one
      if (charIndex === cumulativeEndIndices[nodeIndex]) {
        nodeIndex++;
        offsetInNode = 0;
      }

      // Extend current range by one more character
      offsetInNode++;
      currentRange.setEnd(textNodes[nodeIndex], offsetInNode);

      const currentBottom = currentRange.getBoundingClientRect().bottom;

      // Did we cross into a new visual line?
      if (currentBottom - previousBottom > LINE_BREAK_THRESHOLD) {
        // Roll back one character — that one belongs to the next line
        currentRange.setEnd(textNodes[nodeIndex], offsetInNode - 1);

        // Start new line range
        const nextRange = new Range();
        nextRange.setStart(textNodes[nodeIndex], offsetInNode - 1);
        ranges.push(nextRange);

        currentRange = nextRange;
        previousBottom = currentBottom;
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
}

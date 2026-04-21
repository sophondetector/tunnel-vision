import { logRange } from "../common"

let LOG_RANGES = false

export class RangeManager {
  RANGES: Range[] | null = null
  RANGE_IDX: number = 0
  TEXT_NODES: Node[] | null = null

  constructor() { }

  async initRanges(eleArray: Element[]): Promise<void> {
    if (eleArray.length < 1) {
      console.warn(`RangeManager.initRanges: eleArray.length is zero!`)
      return
    }

    this.TEXT_NODES = RangeManager.#eleArray2Nodes(eleArray)

    this.RANGES = RangeManager.#textNodes2Ranges(this.TEXT_NODES)

    // RangeManager.dumpRanges({
    //   ranges: this.RANGES,
    //   context: 'initRanges',
    //   startIdx: 50,
    //   end: 80
    // })

    // this.RANGES = this.RANGES.sort(
    //   (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
    // )
  }

  dumpAllRanges(): void {
    RangeManager.dumpRanges({
      ranges: this.RANGES
    })
  }

  toggleLogRanges(): boolean {
    LOG_RANGES = !LOG_RANGES
    return LOG_RANGES
  }

  getTextNodes(): Node[] | null {
    return this.TEXT_NODES
  }

  getRectsToClear(): DOMRect[] {
    const [_, range] = this.getCurrentRange()
    if (!range) {
      console.warn(`RangeManager.getRectsToClear: could not get range!`)
      return []
    }
    const rect = range!.getBoundingClientRect()
    return [rect]
  }

  getCurrentRangeIdx(): number {
    return this.RANGE_IDX
  }

  getCurrentRange(): [number, Range] | [null, null] {
    if (this.RANGES === null) {
      console.warn('RangeManager.getCurrentRange: this.RANGES is null!')
      return [null, null]
    }
    const range = this.RANGES[this.RANGE_IDX]
    if (range === undefined) {
      console.warn(`RangeManager.getCurrentRange: range at index ${this.RANGE_IDX} undefined!`)
      return [null, null]
    }
    return [this.RANGE_IDX, range]
  }

  getRangeAtIdx(idx: number): Range | undefined {
    if (this.RANGES === null) {
      console.warn(`RangeManager.getRangeAtIdx: this.RANGES is null!`)
      return undefined
    }
    const range = this.RANGES[idx]
    if (range === undefined) {
      console.warn(`RangeManager.getRangeAtIdx: this.RANGES[${idx}] is undefined!`)
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

  static #pointInRange(point: { x: number, y: number }, range: Range): boolean {
    const rect = range.getBoundingClientRect()
    return (
      point.y <= rect.bottom &&
      point.y >= rect.top &&
      point.x >= rect.left &&
      point.x <= rect.right
    )
  }

  static rangeIsOccluded(range: Range): boolean {
    const rect = range.getBoundingClientRect()

    const centerX = rect.left + (rect.width / 2)
    const centerY = rect.top + (rect.height / 2)

    // NOTE: this is here because if the range is outside the window then elementFromPoint comes back null and the check fails - so we return false here to be safe
    if (centerY < 0 || centerY > window.innerHeight) return false

    const topElement = document.elementFromPoint(centerX, centerY)
    if (!topElement) return true

    // if the range does not intersect the topElement that means it's not on top
    const isOnTop = range.intersectsNode(topElement)
    const isNotOnTop = !isOnTop

    return isNotOnTop
  }

  static #isElementVisiblyRendered(element: Element | null): boolean {
    if (!element) return true

    if (element.hasAttribute("hidden")) return false

    const style = window.getComputedStyle(element)

    if (
      (style.display === 'none') ||
      (style.visibility === 'hidden') ||
      (parseFloat(style.opacity) < 0.1) ||
      (style.transform === 'scale(0)') ||
      (style.clipPath === 'circle(0px at 50% 50%)') ||
      (style.height === "0px") ||
      (style.contentVisibility === 'hidden')
    ) return false

    // Recurse up the tree (in case ancestor is hidden)
    return this.#isElementVisiblyRendered(element.parentElement)
  }

  static #eleHasScrollableX(ele: Element | null): boolean {
    if (!ele) return false
    const style = window.getComputedStyle(ele)
    if (style.overflowX === 'scroll' || style.overflowX === 'auto') return true
    return RangeManager.#eleHasScrollableX(ele.parentElement)
  }

  static #isOffToTheSide(ele: Element | null, rect: DOMRect): boolean {
    // NOTE: if range is inside an element with scrollable X we assume we can get to it somehow
    const scrollableX = RangeManager.#eleHasScrollableX(ele)
    if (scrollableX) return false

    const vw = window.innerWidth || document.documentElement.clientWidth
    return rect.left < 0 || rect.right > vw
  }

  static rangeIsVisible(range: Range): boolean {
    if (RangeManager.rangeIsOccluded(range)) return false

    const ele = range.commonAncestorContainer instanceof Element ?
      range.commonAncestorContainer : range.commonAncestorContainer.parentElement

    const isRendered = RangeManager.#isElementVisiblyRendered(ele)
    if (!isRendered) return false

    const rect = range.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return false
    if (RangeManager.#isOffToTheSide(ele, rect)) return false

    return true
  }

  setToFirstVisibleRange(): [number, Range] | [null, null] {
    const len = this.getRangesLength() as number
    for (let idx = 0; idx < len; idx++) {
      const iterRange = this.getRangeAtIdx(idx) as Range
      if (RangeManager.rangeIsVisible(iterRange)) {
        this.setRangeIdx(idx)
        return [idx, iterRange]
      }
    }
    console.error(`RangeManager.setToFirstVisibleRange: could not find first visible range!`)
    return [null, null]
  }

  incLine(): [number, Range] | [null, null] {
    if (this.RANGES === null) {
      console.error(`RangeManager.incLine: RANGES is null`)
      return [null, null]
    }
    // find the next visible range
    for (let newIdx = this.RANGE_IDX + 1; newIdx < this.RANGES.length; newIdx++) {
      const iterRange = this.RANGES[newIdx]
      if (RangeManager.rangeIsVisible(iterRange)) {
        this.setRangeIdx(newIdx)
        if (LOG_RANGES) logRange({
          range: iterRange,
          idx: this.RANGE_IDX,
          caller: 'RangeManager.incLine'
        })
        return [newIdx, iterRange]
      }
    }
    console.warn(`RangeManger.incLine: no visible ranges after RANGE_IDX ${this.RANGE_IDX}`)
    return [null, null]
  }

  decLine(): [number, Range] | [null, null] {
    if (this.RANGES === null) {
      console.error(`RangeManager.decLine: this.RANGES is null`)
      return [null, null]
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
        return [newIdx, iterRange]
      }
    }
    console.warn(`RangeManager.decLine: no visible ranges before this.RANGE_IDX ${this.RANGE_IDX}`)
    return [null, null]
  }

  getRangeAtPoint(point: { x: number, y: number }): [number, Range] | [null, null] {

    // TODO: implement a binary search here
    const len = this.getRangesLength() as number
    for (let idx = 0; idx < len; idx++) {
      const iterRange = this.getRangeAtIdx(idx) as Range
      if (RangeManager.#pointInRange(point, iterRange)) {
        return [idx, iterRange]
      }
    }

    console.error(`RangeManager.getRangeAtPoint: ERROR could not get range`)

    return [null, null]
  }

  setRangeAtPoint(point: { x: number, y: number }): [number, Range] | [null, null] {
    const [idx, range] = this.getRangeAtPoint(point)
    if (idx === null) {
      return [null, null]
    }
    this.setRangeIdx(idx)
    return [idx, range]
  }

  range2RangeIdx(range: Range): number | undefined {
    const len = this.getRangesLength() as number
    for (let idx = 0; idx < len; idx++) {
      const iterRange = this.getRangeAtIdx(idx)
      if (range === iterRange) {
        return idx
      }
    }
    console.error(`RangeManager.range2RangeIdx: ERROR - could not get idx for range! `)
    return
  }

  static #eleArray2Nodes(eleArray: Element[]): Node[] {
    const allNodes = []
    for (let idx = 0; idx < eleArray.length; idx++) {
      allNodes.push(
        ...RangeManager.#getAllTextNodes(eleArray[idx])
      )
    }

    // NOTE: this helps prevent some "range collapsing" when incrementing to a "bad" text node causes the clientRect to collapse to 0 which causes some text to be missed
    const filtered = allNodes.filter(n => {
      const rng = new Range()
      rng.selectNodeContents(n)
      const rect = rng.getBoundingClientRect()
      return (rect.width > 0 && rect.height > 0)
    })

    return filtered
  }

  static #getAllTextNodes(root: Node): Node[] {
    const badTagNames = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,     // Only text nodes
      (node: Node) => {
        // Skip whitespace-only text nodes
        const text = (node as Text).data.trim()
        if (text.length === 0) return NodeFilter.FILTER_REJECT
        // Skip certain types of tags
        const parentType = node.parentElement!.tagName
        if (badTagNames.includes(parentType)) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
      //@ts-ignore
      false
    )

    const textNodes = []
    let node
    while (node = walker.nextNode()) {
      textNodes.push(node)
    }
    return textNodes
  }

  // TODO: refactor so it uses binary search to find range endings
  static #textNodes2Ranges(textNodes: Node[]): Range[] {
    if (textNodes.length === 0) return []

    // Safety limit to prevent infinite loops in pathological cases
    const MAX_ITERATIONS = 100_000
    const BOTTOM_LIMIT = 5           // pixels — when bottom jumps more than this → new line
    const TOP_LIMIT = 10

    const ranges: Range[] = []

    // We'll maintain one active range and extend it character-by-character
    let currentRange = new Range()
    let nodeIndex = 0                // which text node we're currently in
    let offsetInNode = 0             // offset inside the current text node

    currentRange.setStart(textNodes[0], 0)

    let previousBottom = currentRange.getBoundingClientRect().bottom
    let previousTop = currentRange.getBoundingClientRect().top

    let iterCount = 0

    // while (nodeIndex < textNodes.length) {
    // NOTE: while (true) is a more accurate reflection of what's actually happening in the loop - see note directly below
    while (true) {
      if (offsetInNode >= textNodes[nodeIndex].textContent!.length) {
        nodeIndex++
        offsetInNode = 0
        // NOTE: in practice this is where the loop always breaks
        if (nodeIndex >= textNodes.length) {
          ranges.push(currentRange.cloneRange())
          break
        }
      }

      // NOTE: this is a useful debug block; uncomment and create a breakpoint on the console log line to observe range creation at a specific point

      // if (currentRange.toString().includes('Adding variables')) {
      //   console.log('break!')
      // }

      // Extend current range by one more character
      offsetInNode++
      currentRange.setEnd(textNodes[nodeIndex], offsetInNode)

      const curRect = currentRange.getBoundingClientRect()
      const currentBottom = curRect.bottom
      const currentTop = curRect.top

      const bottomExceed = Math.abs(currentBottom - previousBottom) > BOTTOM_LIMIT
      const topExceed = Math.abs(currentTop - previousTop) > TOP_LIMIT

      // Did we cross into a new visual line?
      if (bottomExceed || topExceed) {
        // Roll back one character — that one belongs to the next line
        currentRange.setEnd(textNodes[nodeIndex], offsetInNode - 1)

        // NOTE: this block rolls the selection back until there's no more trailing whitespace
        let windbackOffset = offsetInNode - 1
        let windbackNodeIdx = nodeIndex

        while (
          currentRange.toString().match(/\s$/)
        ) {
          windbackOffset = windbackOffset - 1
          if (windbackOffset <= 0) {
            windbackNodeIdx = windbackNodeIdx - 1
            windbackOffset = textNodes[windbackNodeIdx].textContent!.length
          }
          currentRange.setEnd(textNodes[windbackNodeIdx], windbackOffset)
        }

        ranges.push(currentRange.cloneRange())

        // Start new line range
        currentRange = new Range()
        currentRange.setStart(textNodes[nodeIndex], offsetInNode - 1)
        currentRange.setEnd(textNodes[nodeIndex], offsetInNode)

        const currentRect = currentRange.getBoundingClientRect()
        previousBottom = currentRect.bottom
        previousTop = currentRect.top
      }

      if (iterCount++ > MAX_ITERATIONS) {
        console.error(`textNodes2Ranges: ${MAX_ITERATIONS} iterations reached! exiting...`)
        break
      }
    }

    return ranges
  }

  // @ts-ignore
  static dumpRanges(dumpRangesOpts: {
    ranges: Range[] | null,
    context?: string,
    startIdx?: number,
    end?: number
  }): void {

    const {
      ranges,
      context = 'no context given',
      startIdx = 0,
      end = ranges?.length ?? 0
    } = dumpRangesOpts

    console.log(`RangeManger.dumpRanges - context: ${context}`)

    if (ranges === null) {
      console.log('RangeManger.dumpRanges: null ranges!')
      return
    }

    for (let idx = startIdx; idx < (end <= ranges.length ? end : ranges.length); idx++) {
      console.log(idx, ranges[idx].toString())
    }
  }

  async getRangeAtNodeOffset(node: Node, offset: number): Promise<[number, Range] | [null, null]> {
    const len = this.getRangesLength() ?? 0
    if (len === 0) return [null, null]

    let left = 0
    let right = len - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const range = this.getRangeAtIdx(mid)

      if (!range) break

      const cmp = range.comparePoint(node, offset);  // -1 before, 0 inside, +1 after

      if (cmp === 0) {
        return [mid, range]
      } else if (cmp < 0) {
        right = mid - 1
      } else {
        left = mid + 1
      }
    }

    console.error(`TvDirector.getRangeAtNodeOffset: search for range failed`)
    return [null, null]
  }

  async setRangeAtNodeOffset(node: Node, offset: number): Promise<[number, Range] | [null, null]> {
    const [idx, range] = await this.getRangeAtNodeOffset(node, offset)
    if (range === null) {
      return [null, null]
    }
    this.setRangeIdx(idx)
    return [idx, range]
  }

  async bruteForceSearch(node: Node, offset: number): Promise<[number, Range] | [null, null]> {
    const len = this.getRangesLength() ?? 0
    for (let idx = 0; idx < len; idx++) {
      const iterRange = this.getRangeAtIdx(idx)
      if (!iterRange) continue
      if (iterRange.isPointInRange(node, offset)) {
        return [idx, iterRange]
      }
    }
    console.error(`TvDirector.bruteForceSearch: search for range failed`)
    return [null, null]
  }

  async bothWaysSearch(node: Node, offset: number, startIdx: number): Promise<[number, Range] | [null, null]> {
    let iterRange = this.getRangeAtIdx(startIdx)
    if (iterRange && iterRange.isPointInRange(node, offset)) {
      return [startIdx, iterRange]
    }

    const len = this.getRangesLength() ?? 0
    let topIdx = startIdx + 1
    let botIdx = startIdx - 1

    while (topIdx < len && botIdx >= 0) {
      if (topIdx < len) {
        const topRange = this.getRangeAtIdx(topIdx)
        if (topRange && topRange.isPointInRange(node, offset)) {
          return [topIdx, topRange]
        }
        topIdx++
      }
      if (botIdx >= 0) {
        const botRange = this.getRangeAtIdx(botIdx)
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
      const iterRange = this.getRangeAtIdx(idx)
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
      const iterRange = this.getRangeAtIdx(idx)
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


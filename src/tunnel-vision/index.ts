import { HandlerManager } from "./site-handlers/index"
import { RangeManager } from "./range-manager";
import { TvScreen } from "./tv-screen";
import {
  soundIsOn,
  toggleSound,
  TvScreenState,
  TvDirectorState
} from "../common";
import { playSound } from "./sound";

const RESIZE_DEBOUNCE_MILLIS = 0
const NAV_DEBOUNCE_MILLIS = 300
const DISABLE_SELECTION_HIGHLIGHTING_ID = "make-tv-selection-transparent"

let WIN_WIDTH = window.innerWidth
let NAV_DEBOUNCE: number | undefined = undefined
let SELECTING = false
let SELECTION = false
let DEBOUNCE_TIMEOUT_ID: undefined | number = undefined

function isPdf(): boolean {
  return window.location.pathname.match(/\.pdf$/) ? true : false
}

export class TvDirector {
  RANGE_MANAGER: RangeManager | null = null
  ELEMENT_ARRAY: Array<Element> | null = null
  INITTED_ONCE: boolean = false
  STATE: TvDirectorState = TvDirectorState.INITIALIZING

  constructor() {
    console.log('TvDirector: new TvDirector constructed')
  }

  getDirectorState(): TvDirectorState {
    return this.STATE
  }

  setDirectorState(state: TvDirectorState): void {
    this.STATE = state
  }

  async init(): Promise<void> {
    try {

      if (isPdf()) {
        console.log(`TvDirector.init: its a pdf - exiting early`)
        this.setDirectorState(TvDirectorState.PDF)
        return
      }

      const handler = HandlerManager.getHandler()
      if (!handler) {
        throw new Error(`TvDirector.init: could not get handler!`)
      }

      await handler.initDelay()

      this.initializeControls()
      this.initializeOnResizeCallback()
      await TvScreen.inject()
      await this.initRanges()
      TvScreen.animate()
      this.setMouseUpListener()
      this.setNavigateListener()
      this.setSelectionListener()
      this.toggleScreenOff()

      setTimeout(() => {
        this.INITTED_ONCE = true
      }, NAV_DEBOUNCE_MILLIS * 5)

      this.setDirectorState(TvDirectorState.READY)

    } catch (err) {
      console.error(`TvDirector.init: aborting due to error ${err}`)
      this.setDirectorState(TvDirectorState.ERROR)
      this.toggleScreenOff()
      return
    }
  }

  async initRanges(): Promise<void> {
    this.ELEMENT_ARRAY = HandlerManager.getEleArray()
    if (this.ELEMENT_ARRAY === null) {
      throw new Error('TvDirector.initRanges: null element array, exiting early')
    }
    this.RANGE_MANAGER = new RangeManager()
    await this.RANGE_MANAGER.initRanges(this.ELEMENT_ARRAY)
    const range = this.RANGE_MANAGER.getFirstVisibleRange()
    if (range === undefined) {
      throw new Error('TvDirector.init: could not get first visible range')
    }
    this.setWindowAroundRange(range)
  }

  disableSelectionHighlighting(): void {
    const style = document.createElement('style')
    style.innerHTML = `
    ::selection {
      background-color: transparent !important;
      color: inherit !important
    }
    `
    style.id = DISABLE_SELECTION_HIGHLIGHTING_ID

    document.body.appendChild(style)
    // console.log('tunnel-vision: highlighting disabled')
  }

  enableSelectionHighlighting(): void {
    const style = document.getElementById(DISABLE_SELECTION_HIGHLIGHTING_ID)
    if (!style) return
    style.remove()
  }

  collapseSelection(): void {
    SELECTION = false
    const sel = document.getSelection()
    if (!sel || sel.rangeCount < 1) {
      return
    }
    sel.collapseToStart()
  }

  drawAroundSelection(): void {
    const sel = document.getSelection()
    if (!sel || sel.rangeCount < 1) {
      SELECTION = false
      return
    }

    const range = sel.getRangeAt(0)
    const txt = range.toString()
    if (txt.length < 1) {
      SELECTION = false
      return
    }

    // NOTE: we set SELECTING = true because if not the mouseup event listener cancels this and set it to a range
    SELECTING = true
    SELECTION = true

    TvScreen.setActiveRange(range)
    this.scrollRangeIntoView(range)
  }

  setSelectionListener(): void {
    document.addEventListener(
      "selectionchange", this.drawAroundSelection, { capture: true }
    )
  }

  setNavigateListener(): void {
    //TODO: replace this with a "milliseconds since last tree manipulation" debounce
    //@ts-ignore
    window.navigation.onnavigatesuccess = () => {
      clearTimeout(NAV_DEBOUNCE)
      NAV_DEBOUNCE = setTimeout(() => {
        if (!this.INITTED_ONCE) return
        console.log('TvDirector.onnavigatesuccess callback running')
        this.toggleScreenOff()
        this.initRanges()
      }, NAV_DEBOUNCE_MILLIS) as unknown as number
    }
  }

  getRangeManager(): RangeManager {
    const rm = this.RANGE_MANAGER
    if (!rm) {
      throw new Error(`TvDirector.getRangeManager: this.RANGE_MANAGER is ${rm}!`)
    }
    return rm
  }

  getElementArray(): Array<Element> {
    const ea = this.ELEMENT_ARRAY
    if (!ea) {
      throw new Error(`TvDirector.getElementArray: this.ELEMENT_ARRAY is ${ea}`)
    }
    if (ea.length < 1) {
      throw new Error(`TvDirector.getElementArray: this.ELEMENT_ARRAY empty!`)
    }
    return ea
  }

  getScreenState(): TvScreenState {
    return TvScreen.getScreenState()
  }

  getRangeIdx(): number {
    const rm = this.RANGE_MANAGER as RangeManager
    const idx = rm.getRangeIdx()
    return idx
  }

  setRangeIdx(idx: number): void {
    const rm = this.RANGE_MANAGER as RangeManager
    rm.setRangeIdx(idx)
    const range = rm.getCurrentRange() as Range
    this.setWindowAroundRange(range)
  }

  static clickInRange(event: MouseEvent, range: Range): boolean {
    const rect = range.getBoundingClientRect()
    return (
      event.y <= rect.bottom &&
      event.y >= rect.top &&
      event.x >= rect.left &&
      event.x <= rect.right
    )
  }

  setMouseUpListener(): void {
    // NOTE: changed this from window.onclick = (event) => { etc ... }
    // because window.onclick sets the event listener at the "bubbling" phase
    // whereas we need to have it happen during the "capturing" phase to ensure
    // it takes precedence over whatever listeners the site itself has set
    const mouseUpListener = (event: MouseEvent) => {
      if (!this.isOn()) return
      // NOTE: This is here to prevent the 'click' event listener from cancelling out the 
      // selectionChangeListener
      if (SELECTING) {
        SELECTING = false
        return
      }

      this.collapseSelection()

      const rm = this.getRangeManager()
      if (rm.RANGES === null) {
        console.error(`TvDirector: RangeManager.RANGES is null!`)
        return
      }

      for (let idx = 0; idx < rm.RANGES.length; idx++) {
        const rng = rm.RANGES[idx]
        if (TvDirector.clickInRange(event, rng) && RangeManager.rangeIsVisible(rng)) {
          rm.setRangeIdx(idx)
          this.setWindowAroundRange(rng)
          return
        }
      }
      // console.error('TvDirector.clickListener: could not find clickable range')
    }

    window.addEventListener('mouseup', mouseUpListener, {
      capture: true
    })
  }

  setScreenColor(color: string) {
    if (!this.isOn()) return
    TvScreen.setScreenColor(color)
  }

  setScreenOpacity(opacity: number) {
    if (!this.isOn()) return
    TvScreen.setScreenOpacity(opacity)
  }

  soundIsOn(): Promise<boolean> {
    return soundIsOn()
  }

  toggleSound(): Promise<void> {
    return toggleSound()
  }

  toggleScreen(): void {
    if (TvScreen.isOn()) {
      this.toggleScreenOff()
      return
    }
    this.toggleScreenOn()
  }

  toggleScreenOn(): void {
    this.disableSelectionHighlighting()
    TvScreen.turnOn()
  }

  toggleScreenOff(): void {
    this.enableSelectionHighlighting()
    TvScreen.turnOff()
  }

  isOn(): boolean {
    return TvScreen.isOn()
  }

  incRange(): void {
    playSound()

    if (SELECTION) {
      SELECTION = false
      this.setRangeAtSelectionBottom()
      this.collapseSelection()
      return
    }

    const nextRange = this.getRangeManager().getNextRange()
    if (nextRange === undefined) {
      console.log('TvDirector.incRange: could not find next range')
      return
    }

    this.setWindowAroundRange(nextRange)
  }

  decRange(): void {
    playSound()

    if (SELECTION) {
      SELECTION = false
      this.setRangeAtSelectionTop()
      this.collapseSelection()
      return
    }

    const prevRange = this.getRangeManager().getPrevRange()
    if (prevRange === undefined) {
      console.log('TvDirector.decRange: could not find previous range')
      return
    }

    this.setWindowAroundRange(prevRange)
  }

  setRangeAtSelectionTop(): void {
    const topRect = TvScreen.getTopRect()
    const topBound = topRect.y - window.scrollY
    const leftBound = topRect.x - window.scrollX
    this.setRangeAtPoint(topBound, leftBound)
  }

  setRangeAtSelectionBottom(): void {
    const bottomRect = TvScreen.getBottomRect()
    const bottomBound = bottomRect.y - window.scrollY
    const leftBound = bottomRect.x - window.scrollX
    this.setRangeAtPoint(bottomBound, leftBound)
  }

  setRangeAtPoint(top: number, left: number): void {
    const rm = this.getRangeManager()
    const [range, rangeIdx] = rm.rangeAtPoint(top, left)
    if (!range || (rangeIdx === null)) {
      console.error(`TvDirector.setRangeAtPoint: ERROR - could not get range`)
      return
    }
    rm.setRangeIdx(rangeIdx)
    this.setWindowAroundRange(range)
  }

  // TODO: implement shift-adding ranges
  shiftRangeUp(): void {
    // SELECTION = true
    console.log('shift up!')
  }

  shiftRangeDown(): void {
    // SELECTION = true
    console.log('shift down!')
  }

  rangeIsOccluded(range: Range): boolean {
    const rect = range.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(centerX, centerY)
    if (!topElement) return false
    // if the range is not in the topElement we return false
    const ans = !range.intersectsNode(topElement)
    // console.log(`rangeIsOccluded: ${ans}`)
    return ans
  }

  /**
  * Scrolls the viewport so that the given DOMRect becomes fully visible.
  * 
  * If the rect is already completely inside the viewport, no scrolling occurs.
  * Scrolls the minimal amount needed (horizontally and/or vertically) to bring
  * the entire rect into view. Uses smooth scrolling.
  * 
  * @param {Range} range - The Range to scroll into view 
  * @param {boolean} scrollToMiddle - Whether you want the scrolling to bring the rect to the middle of the screen or keep it at the top/bottom; defaults to true
  */
  scrollRangeIntoView(range: Range, scrollToMiddle: boolean = true): void {
    const scrollable = HandlerManager.getScrollableElement(false)
    if (scrollable) {
      this.useScrollableToScrollRangeIntoView(scrollable, range, scrollToMiddle)
      return
    }

    const rect = range.getBoundingClientRect()

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let dx = 0;
    let dy = 0;
    let middleAdjust = scrollToMiddle ? Math.floor(vh / 2) : 0

    if (rect.left < 0) dx = rect.left;
    else if (rect.right > vw) dx = rect.right - vw;

    if (rect.top < 0) dy = rect.top - middleAdjust;
    else if (rect.bottom > vh) dy = rect.bottom - vh + middleAdjust;

    if (dx || dy) {
      window.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    }
  }

  useScrollableToScrollRangeIntoView(scrollable: Element, range: Range, scrollToMiddle: boolean = true): void {

    const rect = range.getBoundingClientRect()

    if (this.rangeIsOccluded(range)) {
      scrollable.scrollBy({
        top: rect.y - (window.innerHeight / 2),
        left: rect.x - (window.innerWidth / 2),
        behavior: 'smooth',
      })
      return
    }

    const vw = scrollable.clientWidth;
    const vh = scrollable.clientHeight;

    let dx = 0;
    let dy = 0;
    let middleAdjust = scrollToMiddle ? Math.floor(vh / 2) : 0

    if (rect.left < 0) dx = rect.left;
    else if (rect.right > vw) dx = rect.right - vw;

    if (rect.top < 0) dy = rect.top - middleAdjust;
    else if (rect.bottom > vh) dy = rect.bottom - vh + middleAdjust;

    if (dx || dy) {
      scrollable.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    }
  }

  /**
  * This sets the TvScreen viewing window around a given Range 
  * @param {Range} range - The range of text you want to set the window around
  * @param {boolean} scrollIntoView - Whether or not you want to scroll the window to the range - default is `true`
  */
  setWindowAroundRange(range: Range, scrollIntoView: boolean = true): void {
    if (!this.isOn()) {
      // console.log('screen is off!')
      return
    }
    TvScreen.setActiveRange(range)
    if (scrollIntoView) this.scrollRangeIntoView(range, true)
  }

  async bruteForceSearch(curDir: TvDirector, prevNode: Node, prevOffset: number): Promise<void> {
    const rm = curDir.getRangeManager()
    const len = rm.getRangesLength() ?? 0
    for (let idx = 0; idx < len; idx++) {
      const iterRange = rm.rangeIdx2Range(idx)
      if (!iterRange) continue
      if (iterRange.isPointInRange(prevNode, prevOffset)) {
        curDir.setWindowAroundRange(iterRange)
        rm.setRangeIdx(idx)
        return
      }
    }
    console.error(`TvDirector.bruteForceSearch: search for range failed`)
  }

  async bothWaysSearch(curDir: TvDirector, prevNode: Node, prevOffset: number, startIdx: number): Promise<void> {
    const rm = curDir.getRangeManager()
    let iterRange = rm.rangeIdx2Range(startIdx)
    if (iterRange && iterRange.isPointInRange(prevNode, prevOffset)) {
      curDir.setWindowAroundRange(iterRange)
      rm.setRangeIdx(startIdx)
      return
    }

    const len = rm.getRangesLength() ?? 0
    let topIdx = startIdx + 1
    let botIdx = startIdx - 1

    while (topIdx < len && botIdx >= 0) {
      if (topIdx < len) {
        const topRange = rm.rangeIdx2Range(topIdx)
        if (topRange && topRange.isPointInRange(prevNode, prevOffset)) {
          curDir.setWindowAroundRange(topRange)
          rm.setRangeIdx(topIdx)
          return
        }
        topIdx++
      }
      if (botIdx >= 0) {
        const botRange = rm.rangeIdx2Range(botIdx)
        if (botRange && botRange.isPointInRange(prevNode, prevOffset)) {
          curDir.setWindowAroundRange(botRange)
          rm.setRangeIdx(botIdx)
          return
        }
        botIdx--
      }
    }

    console.error('TvDirector.bothWaysSearch: could not find range!')
  }

  async searchBehind(curDir: TvDirector, prevNode: Node, prevOffset: number, startIdx: number): Promise<void> {
    const rm = curDir.getRangeManager()
    for (let idx = startIdx; idx >= 0; idx--) {
      const iterRange = rm.rangeIdx2Range(idx)
      if (iterRange === undefined) {
        console.warn(`TvDirector.searchBehind: could not get range at index ${idx}`)
        continue
      }
      if (iterRange.isPointInRange(prevNode, prevOffset)) {
        curDir.setWindowAroundRange(iterRange)
        rm.setRangeIdx(idx)
        return
      }
    }
    console.error('TvDirector.searchBehind: could not find range!')
  }

  async searchAhead(curDir: TvDirector, prevNode: Node, prevOffset: number, startIdx: number): Promise<void> {
    const rm = curDir.getRangeManager()
    const len = rm.getRangesLength() ?? 0
    for (let idx = startIdx; idx < len; idx++) {
      const iterRange = rm.rangeIdx2Range(idx)
      if (iterRange === undefined) {
        console.warn(`TvDirector.searchAhead: could not get range at index ${idx}`)
        continue
      }
      if (iterRange.isPointInRange(prevNode, prevOffset)) {
        curDir.setWindowAroundRange(iterRange)
        rm.setRangeIdx(idx)
        return
      }
    }
    console.error('TvDirector.searchAhead: could not find range!')
  }

  async onResizeCallback(curDir: TvDirector): Promise<void> {
    const newWidth = window.innerWidth
    const delta = newWidth - WIN_WIDTH
    if (delta === 0) return
    WIN_WIDTH = newWidth
    const rangeManager = curDir.getRangeManager()

    if (SELECTION) {
      await rangeManager.initRanges(curDir.getElementArray())
      curDir.drawAroundSelection()
      return
    }

    const prevRange = rangeManager.getCurrentRange()
    if (prevRange === undefined) {
      console.error('TvDirector.onResizeCallback: could not get current range!')
      return
    }
    const prevNode = prevRange.startContainer
    const prevOffset = Math.max(1, prevRange.startOffset)
    // NOTE: making sure prevOffset is at least one fixes the bug where smaller window leads to range directly before we want getting picked

    const rangeIdx = rangeManager.getRangeIdx()
    await rangeManager.initRanges(curDir.getElementArray())
    const len = rangeManager.getRangesLength() ?? 0

    // NOTE: we have two other options for searching for the range; bothWaysSearch and bruteForceSearch

    const padding = 5
    // positive delta means bigger window; negative means smaller
    if (delta < 0) {
      // if smaller window -> the index is likely earlier -> so we go backwards
      curDir.searchBehind(
        curDir,
        prevNode,
        prevOffset,
        Math.min(rangeIdx + padding, Math.max(len - 1, 0))
      )
    } else {
      // if bigger window -> the new index is likely later -> so we go forwards
      curDir.searchAhead(
        curDir,
        prevNode,
        prevOffset,
        Math.max(rangeIdx - padding, 0)
      )
    }
  }

  initializeControls() {
    // TODO: alt+click+drag creates a highlight box
    // bring that in from grok-code.html
    document.addEventListener('keyup', (event) => {
      switch (event.key) {
        case "l":
          event.altKey && this.toggleScreen()
          break;
        case "ArrowDown":
        case "j":
          if (this.isOn() && event.altKey) {
            // event.shiftKey only works in the case of arrow keys
            // shift + alt + j is handled as capital "J" case below
            if (event.shiftKey) {
              this.shiftRangeDown()
              break
            }
            this.incRange()
          }
          break;
        case "ArrowUp":
        case "k":
          if (this.isOn() && event.altKey) {
            // event.shiftKey only works in the case of arrow keys
            // shift + alt + k is handled as capital "K" case below
            if (event.shiftKey) {
              this.shiftRangeUp()
              break
            }
            this.decRange()
          }
          break;
        case "J":
          if (this.isOn() && event.altKey) {
            this.shiftRangeDown()
          }
          break
        case "K":
          if (this.isOn() && event.altKey) {
            this.shiftRangeUp()
          }
          break
        default:
          break;
      }
    })
  }

  initializeOnResizeCallback(): void {
    window.addEventListener('resize', () => {
      clearTimeout(DEBOUNCE_TIMEOUT_ID)
      DEBOUNCE_TIMEOUT_ID = setTimeout(
        () => this.onResizeCallback(this),
        RESIZE_DEBOUNCE_MILLIS) as unknown as number
    }, {
      capture: true
    })
  }
}

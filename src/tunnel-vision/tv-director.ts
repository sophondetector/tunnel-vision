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
import { defaultMutationHandler } from "./site-handlers/handler-utilities";

const RESIZE_DEBOUNCE_MILLIS = 0
const DISABLE_SELECTION_HIGHLIGHTING_ID = "make-tv-selection-transparent"

let WIN_WIDTH = window.innerWidth
let SELECTING = false
let SELECTION = false
let DEBOUNCE_TIMEOUT_ID: undefined | number = undefined
let SELECTION_RANGE: Range | undefined = undefined

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
      TvScreen.setBufferRadiusByScreenSize()
      await TvScreen.inject()
      await this.initRanges()
      this.animate(this)
      this.setMouseUpListener()
      this.setSelectionListener()
      this.setMutationObserver()
      this.toggleScreenOff()

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
  }

  async reInitRanges(): Promise<void> {
    const rangeManager = this.getRangeManager()
    const curIdx = rangeManager.getRangeIdx()
    this.ELEMENT_ARRAY = HandlerManager.getEleArray() as Element[]
    await rangeManager.initRanges(this.ELEMENT_ARRAY)
    const curRange = rangeManager.rangeIdx2Range(curIdx)
    if (!curRange) {
      const firstRange = rangeManager.getFirstVisibleRange()
      if (!firstRange) {
        this.setDirectorState(TvDirectorState.ERROR)
        return
      }
      const firstIdx = rangeManager.range2RangeIdx(firstRange)
      if (firstIdx === undefined) {
        this.setDirectorState(TvDirectorState.ERROR)
        return
      }
      rangeManager.setRangeIdx(firstIdx)
      return
    }
    rangeManager.setRangeIdx(curIdx)
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

  drawAroundSelection(curDir: TvDirector): void {
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

    curDir.setSelectionRange(range)
  }

  setSelectionRange(range: Range): void {
    SELECTION_RANGE = range
  }

  getSelectionRange(): Range | undefined {
    return SELECTION_RANGE
  }

  setSelectionListener(): void {
    document.addEventListener(
      "selectionchange", () => this.drawAroundSelection(this), { capture: true }
    )
  }

  animate(curDir: TvDirector) {
    this.drawScreen()
    requestAnimationFrame(() => this.animate(curDir))
  }

  drawScreen(): void {

    TvScreen.setScreenSize(window.innerWidth, window.innerHeight)
    TvScreen.clearCanvas()
    TvScreen.fillCanvas()

    const buffer = TvScreen.getBufferRadius()

    if (SELECTION) {
      const rects = this.getSelectionRange()!.getClientRects()
      for (let idx = 0; idx < rects.length; idx++) {
        const rect = rects[idx]
        TvScreen.clearRect(
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          buffer
        )
      }
      return
    }

    const allRects = Array.from(
      this.RANGE_MANAGER!.getCurrentRange()!.getClientRects()
    )
    const rects = allRects.filter((r) => r.width > 1 && r.height > 1)

    for (let idx = 0; idx < rects.length; idx++) {
      const rect = rects[idx]
      TvScreen.clearRect(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        buffer
      )
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

      // TODO: make this O(logN)
      for (let idx = 0; idx < rm.RANGES.length; idx++) {
        const rng = rm.RANGES[idx]
        if (TvDirector.clickInRange(event, rng) && RangeManager.rangeIsVisible(rng)) {
          rm.setRangeIdx(idx)
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

    this.scrollRangeIntoView(nextRange)
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

    this.scrollRangeIntoView(prevRange)
  }

  setRangeAtSelectionTop(): void {
    const selRange = this.getSelectionRange()
    if (selRange === undefined) {
      console.error('setRangeAtSelectionTop: no selection range')
      return
    }

    const topRect = selRange.getClientRects().item(0)
    if (topRect === null) {
      console.error('setRangeAtSelectionTop: no top rect!')
      return
    }

    const topBound = topRect.y
    const leftBound = topRect.x
    this.setRangeAtPoint(topBound, leftBound)
  }

  setRangeAtSelectionBottom(): void {
    const selRange = this.getSelectionRange()
    if (selRange === undefined) {
      console.error('setRangeAtSelectionTop: no selection range')
      return
    }

    const rects = selRange.getClientRects()
    const bottomRect = selRange.getClientRects().item(rects.length - 1)
    if (bottomRect === null) {
      console.error('setRangeAtSelectionTop: no top rect!')
      return
    }

    const bottomBound = bottomRect.y
    const leftBound = bottomRect.x
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
    // if the range does not intersect the topElement we return false
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

  async onResizeCallback(curDir: TvDirector): Promise<void> {
    TvScreen.setBufferRadiusByScreenSize()

    const newWidth = window.innerWidth
    const delta = newWidth - WIN_WIDTH
    if (delta === 0) return
    WIN_WIDTH = newWidth
    const rangeManager = curDir.getRangeManager()

    if (SELECTION) {
      await rangeManager.initRanges(curDir.getElementArray())
      curDir.drawAroundSelection(curDir)
      curDir.scrollRangeIntoView(curDir.getSelectionRange() as Range, false)
      return
    }

    const prevRange = rangeManager.getCurrentRange()
    if (prevRange === undefined) {
      console.error('TvDirector.onResizeCallback: could not get current range!')
      return
    }

    const prevNode = prevRange.startContainer
    const prevOffset = Math.max(1, prevRange.startOffset)
    // NOTE: prevOffset must be at least one or we get the range BEFORE we want

    await rangeManager.initRanges(curDir.getElementArray())

    const [idx, range] = await rangeManager.binarySearch(prevNode, prevOffset)

    if (idx === null) {
      console.error('onResizeCallback: could not find new range')
      return
    }

    rangeManager.setRangeIdx(idx)
    curDir.scrollRangeIntoView(range)
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

  setMutationObserver(): void {
    const handler = HandlerManager.getHandler()
    if (!handler) {
      console.error(`setMutationObserver: could not get handler!`)
      return
    }

    let { getMutationTarget, mutationCallback } = defaultMutationHandler

    if (handler.mutationHandler) {
      getMutationTarget = handler.mutationHandler.getMutationTarget
      mutationCallback = handler.mutationHandler.mutationCallback
    }

    const target = getMutationTarget()

    if (!target) {
      console.warn(`setMutationObserver: could not get mutation observer target - exiting`)
      return
    }

    // TODO: this needs to add new elements to this.ELEMENT_ARRAY and then re-range
    const observer = new MutationObserver((mutations) => mutationCallback(this, mutations))

    observer.observe(target, {
      subtree: true,
      childList: true
    })

    console.log(`setMutationObserver: mutation observer set`)
  }

  showRanges(): void {
    const rangeManager = this.getRangeManager()

    const drawRanges = () => {
      const len = rangeManager.getRangesLength() as number
      for (let idx = 0; idx < len; idx++) {
        const range = rangeManager.rangeIdx2Range(idx) as Range
        const rect = range.getBoundingClientRect()
        TvScreen.drawBoxAroundRect(rect, "red", 3)
        TvScreen.drawNumber(
          rect.x,
          rect.y,
          idx
        )
      }
      requestAnimationFrame(drawRanges)
    }

    requestAnimationFrame(drawRanges)
  }

}

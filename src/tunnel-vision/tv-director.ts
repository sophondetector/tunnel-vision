import { HandlerManager } from "./site-handlers/index"
import { RangeManager } from "./range-manager";
import { TvScreen } from "./tv-screen";
import { TvScreenState, TvDirectorState } from "../common";
import { playSound, soundIsOn, toggleSound, } from "./sound";
import { range2Scrollable } from "./site-handlers/handler-utilities";

const RESIZE_DEBOUNCE_MILLIS = 0
const DISABLE_SELECTION_HIGHLIGHTING_ID = "make-tv-selection-transparent"

let WIN_WIDTH = window.innerWidth
let SELECTING = false
let SELECTION = false
let DEBOUNCE_TIMEOUT_ID: undefined | number = undefined
let SELECTION_RANGE: Range | undefined = undefined

let DEBUG_SHOW_RANGES = false
let DEBUG_SHOW_TEXT_NODES = false
let DEBUG_SCREEN_AUTO_ON = false

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

  dumpAllRanges(): void {
    if (this.RANGE_MANAGER === null) {
      console.log('TvDirector.dumpAllRanges: no range manager!')
      return
    }
    this.RANGE_MANAGER.dumpAllRanges()
  }

  toggleShowRanges(): boolean {
    DEBUG_SHOW_RANGES = !DEBUG_SHOW_RANGES
    return DEBUG_SHOW_RANGES
  }

  toggleShowTextNodes(): boolean {
    DEBUG_SHOW_TEXT_NODES = !DEBUG_SHOW_TEXT_NODES
    return DEBUG_SHOW_TEXT_NODES
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

      this.#initializeControls()
      this.#setResizeListener()
      TvScreen.setBufferRadiusByScreenSize()
      await TvScreen.inject()
      await this.initRanges()
      this.#animate()
      this.#setMouseUpListener()
      this.#setSelectionListener()
      this.#setMutationObserver()
      this.toggleScreenOff()

      DEBUG_SCREEN_AUTO_ON && this.toggleScreenOn()

      this.setDirectorState(TvDirectorState.READY)

    } catch (err) {
      console.error(`TvDirector.init: aborting due to error ${err}`)
      console.error((err as Error).stack)
      this.setDirectorState(TvDirectorState.ERROR)
      this.toggleScreenOff()
      return
    }
  }

  async initRanges(): Promise<void> {
    this.ELEMENT_ARRAY = await HandlerManager.getTvElements()
    if (this.ELEMENT_ARRAY === null) {
      console.error('TvDirector.initRanges: null element array, exiting early')
      this.setDirectorState(TvDirectorState.ERROR)
      return
    }
    this.RANGE_MANAGER = new RangeManager()
    await this.RANGE_MANAGER.initRanges(this.ELEMENT_ARRAY)
    const range = this.RANGE_MANAGER.setToFirstVisibleRange()
    if (range === undefined) {
      console.error('TvDirector.init: could not get first visible range')
      this.setDirectorState(TvDirectorState.ERROR)
    }
  }

  // async reInitRanges(): Promise<void> {
  //   const rangeManager = this.getRangeManager()
  //
  //   const [_, range] = rangeManager.getCurrentRange()
  //
  //   this.ELEMENT_ARRAY = await HandlerManager.getTvElements() as Element[]
  //
  //   await rangeManager.initRanges(this.ELEMENT_ARRAY)
  //
  //   if (range === null) {
  //     const firstRange = rangeManager.setToFirstVisibleRange()
  //     if (!firstRange) {
  //       this.setDirectorState(TvDirectorState.ERROR)
  //     }
  //     return
  //   }
  //
  //   const [curIdx, curRange] = await rangeManager.nodeOffset2Range(
  //     range.endContainer,
  //     range.endOffset
  //   )
  //
  //   if (curRange === null) {
  //     const [_, firstRange] = rangeManager.setToFirstVisibleRange()
  //     if (!firstRange) {
  //       this.setDirectorState(TvDirectorState.ERROR)
  //     }
  //     return
  //   }
  //
  //   rangeManager.setRangeIdx(curIdx)
  // }

  #disableSelectionHighlighting(): void {
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

  #enableSelectionHighlighting(): void {
    const style = document.getElementById(DISABLE_SELECTION_HIGHLIGHTING_ID)
    if (!style) return
    style.remove()
  }

  #collapseSelection(): void {
    SELECTION = false
    const sel = document.getSelection()
    if (!sel || sel.rangeCount < 1) {
      return
    }
    sel.collapseToStart()
  }

  #setWindowAroundSelection = (): void => {
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

    this.#setSelectionRange(range)
  }

  #setSelectionRange(range: Range): void {
    SELECTION_RANGE = range
  }

  #getSelectionRange(): Range | undefined {
    return SELECTION_RANGE
  }

  #getSelectionRects(): DOMRect[] {
    const range = this.#getSelectionRange() as Range
    const rects = Array.from(range.getClientRects()).filter(
      (r) => r.width > 1 && r.height > 1
    )
    return rects
  }

  #setSelectionListener(): void {
    document.addEventListener(
      "selectionchange", this.#setWindowAroundSelection, { capture: true }
    )
  }

  #animate = (): void => {
    this.#drawScreen()
    requestAnimationFrame(this.#animate)
  }

  // FIXME: update me to show both the individual DOMRects and the overall bounding box rect
  #drawRanges(): void {
    const rangeManager = this.getRangeManager()
    const len = rangeManager.getRangesLength() as number
    for (let idx = 0; idx < len; idx++) {
      const range = rangeManager.getRangeAtIdx(idx) as Range
      const rect = range.getBoundingClientRect()
      TvScreen.drawBoxAroundRect(rect, "red", 3)
      TvScreen.drawNumber(
        rect.x,
        rect.y,
        idx
      )
    }
  }

  #drawTextNodes(): void {
    const rangeManager = this.getRangeManager()
    const textNodes = rangeManager.getTextNodes()
    if (textNodes === null) return

    for (let idx = 0; idx < textNodes.length; idx++) {
      const range = new Range()
      range.selectNodeContents(textNodes[idx])
      const rect = range.getBoundingClientRect()
      TvScreen.drawBoxAroundRect(rect, "yellow", 4)
      TvScreen.drawNumber(rect.right, rect.top, idx)
    }
  }

  // TODO: remove most or all state from TvScreen - keep it in TvDirector
  #drawScreen(): void {

    TvScreen.setScreenSize(window.innerWidth, window.innerHeight)
    TvScreen.clearCanvas()
    TvScreen.fillCanvas()

    if (DEBUG_SHOW_RANGES) this.#drawRanges()

    if (DEBUG_SHOW_TEXT_NODES) this.#drawTextNodes()

    if (SELECTION) {
      const rects = this.#getSelectionRects()
      for (let idx = 0; idx < rects.length; idx++) {
        const rect = rects[idx]
        TvScreen.clearRect(rect)
      }
      return
    }

    const [, range] = this.getRangeManager().getCurrentRange()
    if (range === null) {
      return
    }

    const rectToDraw = this.#getRectFromRange(range)

    if (rectToDraw) TvScreen.clearRect(rectToDraw)
  }

  #getRectFromRange(range: Range): DOMRect | null {
    const rects = range.getClientRects()

    const cutoff = 10

    let rectToDraw = null

    for (const rect of rects) {
      if (rect.width < 1 || rect.height < 1) continue
      if (!rectToDraw) {
        rectToDraw = rect
        continue
      }
      // NOTE: this doesn't care if the next rect is HIGHER
      if (rect.bottom - rectToDraw.bottom < cutoff) {
        rectToDraw = new DOMRect(
          rectToDraw.x,
          rectToDraw.y,
          rect.right - rectToDraw.left,
          Math.max(rectToDraw.height, rect.height)
        )
        continue
      }
      break
    }

    return rectToDraw
  }

  getRangeManager(): RangeManager {
    const rm = this.RANGE_MANAGER
    if (!rm) {
      throw new Error(`TvDirector.getRangeManager: this.RANGE_MANAGER is ${rm}!`)
    }
    return rm
  }

  getElementArray(): Element[] {
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

  getCurrentRangeIdx(): number {
    const rm = this.RANGE_MANAGER as RangeManager
    const idx = rm.getCurrentRangeIdx()
    return idx
  }

  setRangeIdx(idx: number): void {
    const rm = this.RANGE_MANAGER as RangeManager
    rm.setRangeIdx(idx)
  }

  #setMouseUpListener(): void {
    // NOTE: changed this from window.onclick = (event) => { etc ... } because window.onclick sets the event listener at the "bubbling" phase whereas we need to have it happen during the "capturing" phase to ensure it takes precedence over whatever listeners the site itself has set

    const mouseUpListener = (event: MouseEvent) => {
      if (!this.screenIsOn()) return
      // NOTE: This is here to prevent the 'click' event listener from cancelling out the selectionChangeListener
      if (SELECTING) {
        SELECTING = false
        return
      }
      this.#collapseSelection()
      const rm = this.getRangeManager()
      rm.setRangeAtPoint(event)
    }

    window.addEventListener('mouseup', mouseUpListener, {
      capture: true
    })
  }

  setScreenColor(color: string) {
    if (!this.screenIsOn()) return
    TvScreen.setScreenColor(color)
  }

  setScreenOpacity(opacity: number) {
    if (!this.screenIsOn()) return
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
    this.#disableSelectionHighlighting()
    TvScreen.turnOn()
  }

  toggleScreenOff(): void {
    this.#enableSelectionHighlighting()
    TvScreen.turnOff()
  }

  screenIsOn(): boolean {
    return TvScreen.isOn()
  }

  // FIXME: setRangeAtSelectionBottom/Top is not working well in the pdf-reader; it is having problems with multi column text
  incLine(): void {
    if (!this.screenIsOn()) return
    playSound()

    if (SELECTION) {
      SELECTION = false
      this.#setRangeAtSelectionBottom()
      this.#collapseSelection()
      return
    }

    const [_, range] = this.getRangeManager().incLine()
    if (!range) {
      console.log('TvDirector.incLine: could not find next range')
      return
    }

    this.scrollRangeIntoView(range)
  }

  decLine(): void {
    if (!this.screenIsOn()) return
    playSound()

    if (SELECTION) {
      SELECTION = false
      this.#setRangeAtSelectionTop()
      this.#collapseSelection()
      return
    }

    const [_, range] = this.getRangeManager().decLine()
    if (!range) {
      console.log('TvDirector.decLine: could not find previous range')
      return
    }

    this.scrollRangeIntoView(range)
  }

  #setRangeAtSelectionTop(): void {
    const selRange = this.#getSelectionRange()
    if (selRange === undefined) {
      console.error('setRangeAtSelectionTop: no selection range')
      return
    }

    const topRect = selRange.getClientRects().item(0)
    if (topRect === null) {
      console.error('setRangeAtSelectionTop: no top rect!')
      return
    }

    this.setRangeAtPoint({ x: topRect.x, y: topRect.y })
  }

  #setRangeAtSelectionBottom(): void {
    const selRange = this.#getSelectionRange()
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

    this.setRangeAtPoint({ x: bottomRect.x, y: bottomRect.y })
  }

  setRangeAtPoint(point: { x: number, y: number }): void {
    this.getRangeManager().setRangeAtPoint(point)
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

  // FIXME: if entire range isn't visible in viewport don't scroll at all

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
  async scrollRangeIntoView(range: Range, scrollToMiddle: boolean = true): Promise<void> {
    const scrollable = range2Scrollable(range)
    if (scrollable) {
      this.useScrollableToScrollRangeIntoView(scrollable, range, scrollToMiddle)
      return
    }

    const rect = range.getBoundingClientRect()

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // NOTE: if it turns out we need a horizontal middleAdjust check useScrollableToScrollRangeIntoView for how to do it

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

    if (RangeManager.rangeIsOccluded(range)) {
      scrollable.scrollBy({
        top: rect.y - (window.innerHeight / 2),
        left: rect.x - (window.innerWidth / 2),
        behavior: 'smooth',
      })
      return
    }

    const vw = scrollable.clientWidth;
    const vh = scrollable.clientHeight;
    const scrollableRect = scrollable.getBoundingClientRect()

    const leftBound = scrollableRect.left
    const rightBound = scrollableRect.right

    let dx = 0;
    let dy = 0;
    let middleAdjust = scrollToMiddle ? Math.floor(vh / 2) : 0
    let horizontalMiddleAdjust = scrollToMiddle ? Math.floor(vw / 2) : 0

    if (rect.left < leftBound) dx = rect.left - leftBound - horizontalMiddleAdjust;
    else if (rect.right > rightBound) dx = rect.right - rightBound + horizontalMiddleAdjust;

    if (rect.top < 0) dy = rect.top - middleAdjust;
    else if (rect.bottom > vh) dy = rect.bottom - vh + middleAdjust;

    if (dx || dy) {
      scrollable.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    }
  }

  // TODO: holding down arrow keys or j/k causes rapid scrolling 
  // TODO: alt+click+drag creates a highlight box - bring that in from test-stuff/grok-code.html
  #initializeControls() {
    document.addEventListener('keyup', (event) => {
      if (!event.altKey) return
      switch (event.key) {
        case "l":
          this.toggleScreen()
          break;
        case "ArrowDown":
        case "j":
          this.incLine()
          break
        case "ArrowUp":
        case "k":
          this.decLine()
          break
        case "J":
          this.shiftRangeDown()
          break
        case "K":
          this.shiftRangeUp()
          break
        default:
          break;
      }
    })
  }

  #setResizeListener(): void {

    const callback = async (): Promise<void> => {
      TvScreen.setBufferRadiusByScreenSize()

      const newWidth = window.innerWidth
      const delta = newWidth - WIN_WIDTH
      if (delta === 0) return
      WIN_WIDTH = newWidth
      const rangeManager = this.getRangeManager()

      if (SELECTION) {
        await rangeManager.initRanges(this.getElementArray())
        this.#setWindowAroundSelection()
        this.scrollRangeIntoView(this.#getSelectionRange() as Range, false)
        return
      }

      const [_, prevRange] = rangeManager.getCurrentRange()
      if (!prevRange) {
        console.error('TvDirector.onResizeCallback: could not get current range!')
        return
      }

      const prevNode = prevRange.startContainer
      const prevOffset = Math.max(1, prevRange.startOffset)
      // NOTE: prevOffset must be at least one or we get the range BEFORE we want

      await rangeManager.initRanges(this.getElementArray())

      const [idx, range] = await rangeManager.setRangeAtNodeOffset(prevNode, prevOffset)

      if (idx === null) {
        console.error('onResizeCallback: could not find new range')
        return
      }

      this.scrollRangeIntoView(range)
    }

    window.addEventListener('resize', () => {
      clearTimeout(DEBOUNCE_TIMEOUT_ID)
      DEBOUNCE_TIMEOUT_ID = setTimeout(
        callback,
        RESIZE_DEBOUNCE_MILLIS) as unknown as number
    }, {
      capture: true
    })
  }

  #setMutationObserver(): void {
    const target = document.body

    const observer = new MutationObserver((mutations) => {
      HandlerManager.getTvElements().then((ea) => {
        this.getRangeManager().onMutation(mutations, ea ?? [document.body])
      })
    })

    observer.observe(target, {
      subtree: true,
      childList: true,
      attributes: false,
      characterData: true,
    })

    console.log(`#setMutationObserver: mutation observer set`)
  }
}

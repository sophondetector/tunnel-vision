import { HandlerManager } from "./site-handlers/index"
import { RangeManager } from "./range-manager";
import { TvScreen } from "./tv-screen";
import { TvScreenState } from "../common";
import { isPdfReader } from "./site-handlers/pdf-reader-handler";

let WIN_WIDTH = window.innerWidth
let NAV_DEBOUNCE: number | undefined = undefined
let SELECTION_DEBOUNCE: number | undefined = undefined
let SELECTING = false
let SELECTION = false

const NAV_DEBOUNCE_MILLIS = 300
const SELECTION_DEBOUNCE_MILLIS = 0
const DISABLE_SELECTION_HIGHLIGHTING_ID = "make-tv-selection-transparent"

export class TvDirector {
  RANGE_MANAGER: RangeManager | null = null
  ELEMENT_ARRAY: Array<Element> | null = null
  INITTED_ONCE: boolean = false

  constructor() {
    this.inject()
    this.initRanges()
    this.setScrollableEventListener()
    this.setClickEventListener()
    this.setNavigateListener()
    this.setSelectionListener()
    setTimeout(() => {
      this.INITTED_ONCE = true
    }, NAV_DEBOUNCE_MILLIS * 5)
  }

  inject() {
    TvScreen.inject()
  }

  initRanges(): void {
    this.ELEMENT_ARRAY = HandlerManager.getEleArray()
    if (this.ELEMENT_ARRAY === null) {
      console.error('TvDirector.init: null element array, exiting early')
      return
    }
    this.RANGE_MANAGER = new RangeManager(this.ELEMENT_ARRAY)
    const range = this.RANGE_MANAGER.getFirstVisibleRange()
    if (range === undefined) {
      console.error('TvDirector.init: could not get first visible range')
      return
    }
    this.setWindowAroundRange(range)
  }

  disableSelectionHighlighting(): void {
    const style = document.createElement('style')
    style.innerHTML = `
    ::selection {
      background-color: transparent !important;
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

  setSelectionListener(): void {
    const selectionChangeListener = () => {
      const inner = () => {
        const sel = document.getSelection()
        if (!sel || sel.rangeCount < 1) {
          SELECTION = false
          return
        }

        const rng = sel.getRangeAt(0)
        const txt = rng.toString()
        if (txt.length < 1) return
        SELECTING = true
        SELECTION = true

        let boxes = Array.from(rng.getClientRects())

        // NOTE: this filter is here to fix a bug where ranges 
        // with zero width show up when selecting text in the pdf-reader
        if (isPdfReader()) {
          boxes = boxes.filter(box => box.left !== box.right)
        }

        TvScreen.setWindowAroundMultipleRects(boxes)
      }

      clearTimeout(SELECTION_DEBOUNCE)

      SELECTION_DEBOUNCE = setTimeout(inner, SELECTION_DEBOUNCE_MILLIS) as unknown as number
    }

    document.addEventListener(
      "selectionchange", selectionChangeListener, { capture: true }
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

  // TODO: is there a way I can dynamically determine a "scrollable interior" element?
  setScrollableEventListener(): void {
    const scrollEle = HandlerManager.getScrollableElement()
    if (!scrollEle) {
      console.log('setScrollableEventListener: no scroll ele found, so not adding event listener')
      return
    }

    scrollEle.addEventListener('scroll', () => {
      RangeManager.bind(this) // needed because by default this will refer to the HTMLElement
      const curr = this.getRangeManager().getCurrentRange()
      if (curr === undefined) {
        throw new Error('TvDirector.setScrollableEventListener: could not find current range!')
      }
      this.setWindowAroundRange(curr)
    })
    console.log('TvDirector: scrollable element event listener set')
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

  setClickEventListener(): void {
    // NOTE: changed this from window.onclick = (event) => { etc ... }
    // because window.onclick sets the event listener at the "bubbling" phase
    // whereas we need to have it happen during the "capturing" phase to ensure
    // it takes precedence over whatever listeners the site itself as set
    const clickListener = (event: MouseEvent) => {
      if (!this.isOn()) return
      // NOTE: This is here to prevent the 'click' event listener from cancelling out the 
      // selectionChangeListener
      if (SELECTING) {
        SELECTING = false
        return
      }

      SELECTION = false

      const rm = this.getRangeManager()
      if (rm.RANGES === null) {
        console.log(`TvDirector: RangeManager.RANGES is null!`)
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
      console.log('TvDirector.clickListener: could not find clickable range')
    }

    window.addEventListener('click', clickListener, {
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
    if (SELECTION) {
      SELECTION = false
      this.setRangeAtSelectionBottom()
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
    if (SELECTION) {
      SELECTION = false
      this.setRangeAtSelectionTop()
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
    if (!range || !rangeIdx) {
      console.error(`TvDirector.setRangeAtPoint: ERROR - could not get range`)
      return
    }
    rm.setRangeIdx(rangeIdx)
    this.setWindowAroundRange(range)
  }

  shiftRangeUp(): void {
    // SELECTION = true
    console.log('shift up!')
  }

  shiftRangeDown(): void {
    // SELECTION = true
    console.log('shift down!')
  }

  setWindowAroundRange(range: Range): void {
    const rect = range.getBoundingClientRect()
    const rectHeight = RangeManager.getMaxHeight(range)
    // we do the above because sometimes the "extraneous" rects from the range
    // creation process don't remain with the range

    // switching to the canvas api necessitated adding the window.scroll[XY]
    // removing these adjustments causes the window to get "left behind" when scrolling
    const finalX = rect.left + window.scrollX
    const finalY = rect.top + window.scrollY

    TvScreen.moveViewingWindow(finalX, finalY, rect.width, rectHeight)
  }

  // FIXME: screen needs to change size when height but not width changes
  // TODO: callback for when page changes layout
  onResizeCallback(): void {
    // if same size -> return
    if (window.innerWidth === WIN_WIDTH) return

    TvScreen.setScreenSize(window.innerWidth, window.innerHeight)

    const rangeManager = this.getRangeManager()
    const prevRange = rangeManager.getCurrentRange()
    if (prevRange === undefined) {
      console.error('TvDirector.onResizeCallback: could not get current range!')
      return
    }
    const prevNode = prevRange.startContainer
    const prevOffset = Math.max(1, prevRange.startOffset)
    // NOTE: making sure prevOffset is at least one fixes the
    // bug where smaller window leads to range directly before
    // we want getting picked

    rangeManager.initRanges(this.getElementArray())
    const newWidth = window.innerWidth
    const delta = WIN_WIDTH - newWidth
    WIN_WIDTH = newWidth

    let rangeIdx = rangeManager.getRangeIdx()
    // if bigger window -> go backwards
    if (delta < 0) {
      for (rangeIdx; rangeIdx > 0; rangeIdx--) {
        const iterRange = rangeManager.rangeIdx2Range(rangeIdx)
        if (iterRange === undefined) {
          console.warn(`TvDirector.onResizeCallback: WARNING - could not get range at index ${rangeIdx}`)
          continue
        }
        if (iterRange.isPointInRange(prevNode, prevOffset)) {
          this.setWindowAroundRange(iterRange)
          rangeManager.setRangeIdx(rangeIdx)
          return
        }
      }
    }

    // if smaller window -> go forwards
    const rangeLen = rangeManager.getRangesLength()
    if (rangeLen === undefined) {
      console.error(`TvDirector.onResizeCallback: ERROR - could not get range length!`)
      return
    }
    for (rangeIdx; rangeIdx < rangeLen; rangeIdx++) {
      const iterRange = rangeManager.rangeIdx2Range(rangeIdx)
      if (iterRange === undefined) {
        console.warn(`TvDirector.onResizeCallback: WARNING - could not get range at index ${rangeIdx}`)
        continue
      }
      if (iterRange.isPointInRange(prevNode, prevOffset)) {
        this.setWindowAroundRange(iterRange)
        rangeManager.setRangeIdx(rangeIdx)
        return
      }
    }
  }
}

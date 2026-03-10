import { HandlerManager } from "./site-handlers/index.js"
import { RangeManager } from "./range-manager";
import { TvScreen } from "./tv-screen";
import { TvScreenState } from "../types.js";

let WIN_WIDTH = window.innerWidth
let NAV_DEBOUNCE: number | undefined = undefined
const NAV_DEBOUNCE_MILLIS = 300

export class TvDirector {
  RANGE_MANAGER: RangeManager | null = null
  ELEMENT_ARRAY: Array<Element> | null = null
  INITTED_ONCE: boolean = false

  constructor() {
    this.init()
    this.setClickEventListener()
    this.setOnNav()
    setTimeout(() => {
      this.INITTED_ONCE = true
    }, NAV_DEBOUNCE_MILLIS * 5)
  }

  init(): void {
    TvScreen.inject()
    this.ELEMENT_ARRAY = HandlerManager.getEleArray()
    if (this.ELEMENT_ARRAY === null) {
      console.log('TvDirector.init: null element array, exiting early')
      return
    }
    this.RANGE_MANAGER = new RangeManager(this.ELEMENT_ARRAY)
    this.setScrollableEventListener()
    const range = this.RANGE_MANAGER.getFirstVisibleRange()
    if (range === undefined) {
      console.log('TvDirector.init: could not get first visible range')
      return
    }
    this.setWindowAroundRange(range)
  }

  setOnNav(): void {
    //TODO this causes multiple runs of init when new pages load
    //TODO replace this with a "milliseconds since last tree manipulation" debounce
    //@ts-ignore
    window.navigation.onnavigatesuccess = () => {
      clearTimeout(NAV_DEBOUNCE)
      NAV_DEBOUNCE = setTimeout(() => {
        if (!this.INITTED_ONCE) return
        console.log('TvDirector.onnavigatesuccess callback running')
        this.toggleScreenOff()
        this.init()
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

  // TODO is there a way I can dynamically determine a "scrollable interior" element?
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
    window.onclick = (event) => {
      if (!this.isOn()) return

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
    TvScreen.toggle()
  }

  toggleScreenOn(): void {
    TvScreen.turnOn()
  }

  toggleScreenOff(): void {
    TvScreen.turnOff()
  }

  isOn(): boolean {
    return TvScreen.isOn()
  }

  incRange(): void {
    const nextRange = this.getRangeManager().getNextRange()
    if (nextRange === undefined) {
      console.log('TvDirector.incRange: could not find next range')
      return
    }
    this.setWindowAroundRange(nextRange)
  }

  decRange(): void {
    const prevRange = this.getRangeManager().getPrevRange()
    if (prevRange === undefined) {
      console.log('TvDirector.decRange: could not find previous range')
      return
    }
    this.setWindowAroundRange(prevRange)
  }

  shiftRangeUp(): void {
    console.log('shift up!')
  }

  shiftRangeDown(): void {
    console.log('shift down!')
  }

  setWindowAroundRange(range: Range): void {
    const rect = range.getBoundingClientRect()
    const rectHeight = RangeManager.getMaxHeight(range)
    // we do the above because sometimes the "extraneous" rects from the range
    // creation process don't remain with the range

    // switching to the canvas api necessitated adding the window.scroll[XY]
    const finalX = rect.left + window.scrollX
    const finalY = rect.top + window.scrollY

    TvScreen.moveViewingWindow(finalX, finalY, rect.width, rectHeight)
  }

  // TODO callback for when page changes layout
  // TODO this crashes sometimes; WHY!?!?!
  // TODO on sizing down this will go to the range BEFORE rather than the range we want
  // TODO how should null ranges here be handled?
  onResizeCallback(): void {
    // if same size -> return
    if (window.innerWidth === WIN_WIDTH) return

    TvScreen.setScreenSize(window.innerWidth, window.innerHeight)

    const rangeManager = this.getRangeManager()
    const prevRange = rangeManager.getCurrentRange()
    if (prevRange === undefined) {
      console.log('TvDirector.onResizeCallback: could not get current range!')
      return
    }
    const prevNode = prevRange.startContainer
    const prevOffset = prevRange.startOffset

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
          console.log(`TvDirector.onResizeCallback: WARNING - could not get range at index ${rangeIdx}`)
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
      console.log(`TvDirector.onResizeCallback: WARNING - could not get range length!`)
      return
    }
    for (rangeIdx; rangeIdx < rangeLen; rangeIdx++) {
      const iterRange = rangeManager.rangeIdx2Range(rangeIdx)
      if (iterRange === undefined) {
        console.log(`TvDirector.onResizeCallback: WARNING - could not get range at index ${rangeIdx}`)
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

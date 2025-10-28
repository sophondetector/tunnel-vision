import { HandlerManager } from "./site-handlers/index.js"
import { RangeManager } from "./range-manager";
import { ReedyScreen } from "./reedy-screen";
import { TvScreenState } from "../types.js";

let WIN_WIDTH = window.innerWidth
let NAV_DEBOUNCE: number | undefined = undefined
const NAV_DEBOUCE_MILLIS = 300

export class ReedyDirector {
	RANGE_MANAGER: RangeManager | null = null
	ELEMENT_ARRAY: Array<Element> | null = null
	INITTED_ONCE: boolean = false

	constructor() {
		this.init()
		this.setClickEventListener()
		this.setOnNav()
		setTimeout(() => {
			this.INITTED_ONCE = true
		}, NAV_DEBOUCE_MILLIS * 5)
	}

	init(): void {
		ReedyScreen.inject()
		this.ELEMENT_ARRAY = HandlerManager.getEleArray()
		if (this.ELEMENT_ARRAY === null) {
			console.log('ReedyDirector.init: null element array, exiting early')
			return
		}
		this.RANGE_MANAGER = new RangeManager(this.ELEMENT_ARRAY)
		this.setScrollableEventListener()
		const range = this.RANGE_MANAGER.getFirstVisibleRange()
		if (range === undefined) {
			console.log('ReedyDirector.init: could not get first visible range')
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
				console.log('ReedyDirector.onnavigatesuccess callback running')
				this.toggleScreenOff()
				this.init()
			}, NAV_DEBOUCE_MILLIS) as unknown as number
		}
	}

	getRangeManager(): RangeManager {
		const rm = this.RANGE_MANAGER
		if (!rm) {
			throw new Error(`ReedyDirector.getRangeManager: this.RANGE_MANAGER is ${rm}!`)
		}
		return rm
	}

	getElementArray(): Array<Element> {
		const ea = this.ELEMENT_ARRAY
		if (!ea) {
			throw new Error(`ReedyDirector.getElementArray: this.ELEMENT_ARRAY is ${ea}`)
		}
		if (ea.length < 1) {
			throw new Error(`ReedyDirector.getElementArray: this.ELEMENT_ARRAY empty!`)
		}
		return ea
	}

	getScreenState(): TvScreenState {
		return ReedyScreen.getScreenState()
	}

	// TODO is there a way I can dynamically determine a "scrollable interior" element?
	setScrollableEventListener(): void {
		const scrollEle = HandlerManager.getScrollableElement()
		if (scrollEle === undefined) {
			console.log('setScrollableEventListener: no scroll ele found, so not adding event listener')
			return
		}

		scrollEle.addEventListener('scroll', () => {
			RangeManager.bind(this) // needed because by default this will refer to the HTMLElement
			const curr = this.getRangeManager().getCurrentRange()
			if (curr === undefined) {
				throw new Error('ReedyDirector.setScrollableEventListener: could not find current range!')
			}
			this.setWindowAroundRange(curr)
		})
		console.log('ReedyDirector: scrollable element event listener set')
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
				console.log(`ReedyDirector: RangeManager.RANGES is null!`)
				return
			}

			for (let idx = 0; idx < rm.RANGES.length; idx++) {
				const rng = rm.RANGES[idx]
				if (ReedyDirector.clickInRange(event, rng) && RangeManager.rangeIsVisible(rng)) {
					rm.setRangeIdx(idx)
					this.setWindowAroundRange(rng)
					return
				}
			}

			console.log('ReedyDirector.clickListener: could not find clickable range')
		}
	}

	setScreenColor(color: string) {
		if (!this.isOn()) return
		ReedyScreen.setScreenColor(color)
	}

	setScreenOpacity(opacity: number) {
		if (!this.isOn()) return
		ReedyScreen.setScreenOpacity(opacity)
	}

	toggleScreen(): void {
		ReedyScreen.toggle()
	}

	toggleScreenOn(): void {
		ReedyScreen.turnOn()
	}

	toggleScreenOff(): void {
		ReedyScreen.turnOff()
	}

	isOn(): boolean {
		return ReedyScreen.isOn()
	}

	incRange(): void {
		const nextRange = this.getRangeManager().getNextRange()
		if (nextRange === undefined) {
			console.log('ReedyDirector.incRange: could not find next range')
			return
		}
		this.setWindowAroundRange(nextRange)
	}

	decRange(): void {
		const prevRange = this.getRangeManager().getPrevRange()
		if (prevRange === undefined) {
			console.log('ReedyDirector.decRange: could not find previous range')
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

		ReedyScreen.moveViewingWindow(finalX, finalY, rect.width, rectHeight)
	}

	// TODO callback for when page changes layout
	// TODO this crashes sometimes; WHY!?!?!
	// TODO on sizing down this will go to the range BEFORE rather than the range we want
	// TODO how should null ranges here be handled?
	onResizeCallback(): void {
		// if same size -> return
		if (window.innerWidth === WIN_WIDTH) return

		const rm = this.getRangeManager()
		const prevRange = rm.getCurrentRange()
		if (prevRange === undefined) {
			console.log('ReedyDirector.onResizeCallback: could not get current range!')
			return
		}
		const prevNode = prevRange.startContainer
		const prevOffset = prevRange.startOffset

		rm.initRanges(this.getElementArray())
		const newWidth = window.innerWidth
		const delta = WIN_WIDTH - newWidth
		WIN_WIDTH = newWidth

		let rangeIdx = rm.getRangeIdx()
		// if bigger window -> go backwards
		if (delta < 0) {
			for (rangeIdx; rangeIdx > 0; rangeIdx--) {
				const iterRange = rm.rangeIdx2Range(rangeIdx)
				if (iterRange === undefined) {
					console.log(`ReedyDirector.onResizeCallback: WARNING - could not get range at index ${rangeIdx}`)
					continue
				}
				if (iterRange.isPointInRange(prevNode, prevOffset)) {
					this.setWindowAroundRange(iterRange)
					rm.setRangeIdx(rangeIdx)
					return
				}
			}
		}

		// if smaller window -> go forwards
		const rangeLen = rm.getRangesLength()
		if (rangeLen === undefined) {
			console.log(`ReedyDirector.onResizeCallback: WARNING - could not get range length!`)
			return
		}
		for (rangeIdx; rangeIdx < rangeLen; rangeIdx++) {
			const iterRange = rm.rangeIdx2Range(rangeIdx)
			if (iterRange === undefined) {
				console.log(`ReedyDirector.onResizeCallback: WARNING - could not get range at index ${rangeIdx}`)
				continue
			}
			if (iterRange.isPointInRange(prevNode, prevOffset)) {
				this.setWindowAroundRange(iterRange)
				rm.setRangeIdx(rangeIdx)
				return
			}
		}
	}
}

const TEXT_NODE_NAME = '#text'
const UPPER_BOUND = 10000


export class RangeManager {
	RANGES: Range[] | null = null
	RANGE_IDX: number = 0

	constructor(eleArray: Array<Element>) {
		this.initRanges(eleArray)
	}

	initRanges(eleArray: Array<Element>): void {
		if (!eleArray) {
			console.log(`WARNING - RangeManager.initRanges: eleArray is ${eleArray}!`)
			return
		}
		if (eleArray.length < 1) {
			console.log(`WARNING - RangeManager.initRanges: eleArray.length is zero!`)
			return
		}
		this.RANGES = RangeManager.eleArray2Ranges(eleArray)
	}

	getRangeIdx(): number {
		return this.RANGE_IDX
	}

	getCurrentRange(): Range | undefined {
		if (this.RANGES === null) {
			console.log('RangeManager.getCurrentRange: this.RANGES is null!')
			return undefined
		}
		const range = this.RANGES[this.RANGE_IDX]
		if (range === undefined) {
			console.log(`WARNING - RangeManager.getCurrentRange: range at index ${this.RANGE_IDX} (the current range) is undefined!`)
			return undefined
		}
		return range
	}

	rangeIdx2Range(rangeIdx: number): Range | undefined {
		if (this.RANGES === null) {
			console.log(`WARNING - RangeManager.rangeIdx2Range: this.RANGES is null!`)
			return undefined
		}
		const range = this.RANGES[rangeIdx]
		if (range === undefined) {
			console.log(`WARNING - RangeManager.rangeIdx2Range: this.RANGES[${rangeIdx}] is undefined!`)
			return undefined
		}
		return range
	}

	setRangeIdx(rangeIdx: number): void {
		this.RANGE_IDX = rangeIdx
	}

	getRangesLength(): number | undefined {
		if (this.RANGES === null) {
			console.log(`WARNING - RangeManager.getRangesLength: this.RANGES is null!`)
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
			console.log('RangeManager.getFirstVisibleRange: could not get first visible range')
			return undefined
		}
		if (!RangeManager.rangeIsVisible(range)) {
			range = this.getNextRange()
			if (range === undefined) {
				console.log('RangeManager.getFirstVisibleRange: could not get first visible range!')
				return undefined
			}
		}
		return range
	}

	getNextRange(): Range | undefined {
		if (this.RANGES === null) {
			console.log(`RangeManager.getNextRange: RANGES is null`)
			return undefined
		}
		// find the next visible range
		for (let newIdx = this.RANGE_IDX + 1; newIdx < this.RANGES.length; newIdx++) {
			const iterRange = this.RANGES[newIdx]
			if (RangeManager.rangeIsVisible(iterRange)) {
				this.RANGE_IDX = newIdx
				console.log(`RangeManager.getNextRange: range set to range at index ${this.RANGE_IDX}`)
				return iterRange
			}
		}
		console.log(`RangeManger.getNextRange: no visible ranges after RANGE_IDX ${this.RANGE_IDX}`)
	}

	getPrevRange(): Range | undefined {
		if (this.RANGES === null) {
			console.log(`RangeManager.getPrevRange: this.RANGES is null`)
			return undefined
		}
		// find the next visible range
		for (let newIdx = this.RANGE_IDX - 1; newIdx >= 0; newIdx--) {
			const iterRange = this.RANGES[newIdx]
			if (RangeManager.rangeIsVisible(iterRange)) {
				this.RANGE_IDX = newIdx
				console.log(`RangeManager.getPrevRange: range set to range at index ${this.RANGE_IDX}`)
				return iterRange
			}
		}
		console.log(`RangeManager.getPrevRange: no visible ranges before this.RANGE_IDX ${this.RANGE_IDX}`)
	}

	// TODO refactor eleArray2Ranges to async generator to work with very large texts
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

	static #getEndIdxs(lens: Array<number>) {
		const ends = []
		let acc = 0
		for (let idx = 0; idx < lens.length; idx++) {
			acc += lens[idx]
			ends.push(acc)
		}
		const res = ends.map(e => e - 1)
		return res
	}

	static #getFinalTextIdx(textNodes: Array<Node>): number {
		let res = 0
		for (const tn of textNodes) {
			res += tn.textContent!.length
		}
		res--
		return res
	}

	static textNodes2Ranges(textNodes: Array<Node>): Array<Range> {
		if (textNodes.length < 1) return []

		const incrementThresh = 5
		const res = []
		const finalIdx = RangeManager.#getFinalTextIdx(textNodes)
		const lens = textNodes.map(tn => tn.textContent!.length)
		const endIdxs = RangeManager.#getEndIdxs(lens)

		res.push(new Range())

		// TODO try refactoring so only mainIdx is incremented and 
		// other pointers are derived from mainIdx
		let mainIdx = 0
		let textNodeIdx = 0
		let begOffset = 0
		let endOffset = 1
		let endIdxIdx = 0

		res[res.length - 1].setStart(textNodes[textNodeIdx], begOffset)
		let prevBottom = res[res.length - 1].getBoundingClientRect().bottom

		let iterNum = 0

		while (mainIdx < finalIdx) {
			// Q how do we increment the textNodeIdx??
			// A everytime the mainIdx crosses an end, increment textNodeIdx
			// and reset endOffset to one
			const curEnd = endIdxs[endIdxIdx]
			if (mainIdx === curEnd) {
				endIdxIdx++
				textNodeIdx++
				endOffset = 1
			}

			res[res.length - 1].setEnd(textNodes[textNodeIdx], endOffset)
			const bottom = res[res.length - 1].getBoundingClientRect().bottom

			if (bottom - prevBottom > incrementThresh) {
				res[res.length - 1].setEnd(textNodes[textNodeIdx], endOffset - 1)
				begOffset = endOffset - 1
				const newRange = new Range()
				newRange.setStart(textNodes[textNodeIdx], begOffset)
				res.push(newRange)
				prevBottom = bottom
			}

			mainIdx++
			endOffset++

			if (++iterNum > UPPER_BOUND) {
				console.error('textNodes2Ranges: upper bound reached')
				break
			}
		}

		res[res.length - 1].setEnd(textNodes[textNodes.length - 1], lens[lens.length - 1])

		return res
	}
}

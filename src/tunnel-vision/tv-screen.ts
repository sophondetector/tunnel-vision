import { TvScreenState, TvRect } from "../types"

const REEDY_SCREEN_ID = 'reedyScreen'
const REEDY_SCREEN_DISPLAY = 'flex'
const REEDY_SCREEN_BUFFER_RADIUS = 5

// Reedy Screen State Variables
const RECTANGLES: TvRect[] = []
let COLOR_HEX = '#0000ff'
const COLOR_RGBA = {
	r: 0,
	g: 0,
	b: 255,
	a: .5
}

function getFillStyle(): string {
	return `rgba(${COLOR_RGBA.r}, ${COLOR_RGBA.g}, ${COLOR_RGBA.b}, ${COLOR_RGBA.a})`
}

export class ReedyScreen {

	static create(): HTMLCanvasElement {
		const canvas = document.createElement('canvas')

		canvas.style.display = REEDY_SCREEN_DISPLAY
		canvas.style.position = `absolute`
		canvas.style.overflow = `auto`
		canvas.style.pointerEvents = `none` // this ensures mouse clicks "fall through" to the main content
		canvas.style.zIndex = `99999999`

		canvas.style.top = `0px`
		canvas.style.left = `0px`
		canvas.width = window.innerWidth
		canvas.height = window.innerHeight

		canvas.id = REEDY_SCREEN_ID

		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
		ctx.fillStyle = getFillStyle()

		return canvas
	}

	static drawScreen() {
		const canvas = ReedyScreen.getScreenEle()
		const ctx = ReedyScreen.getContext()

		ctx.fillStyle = getFillStyle()
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		RECTANGLES.forEach(rect => {
			const adjustedX = rect.x - window.scrollX
			const adjustedY = rect.y - window.scrollY
			ctx.clearRect(
				adjustedX - REEDY_SCREEN_BUFFER_RADIUS,
				adjustedY - REEDY_SCREEN_BUFFER_RADIUS,
				rect.width + (REEDY_SCREEN_BUFFER_RADIUS * 2),
				rect.height + (REEDY_SCREEN_BUFFER_RADIUS * 2)
			);
		});
	}

	static animate() {
		ReedyScreen.drawScreen()
		requestAnimationFrame(ReedyScreen.animate)
	}

	static getScreenEle(): HTMLCanvasElement {
		const screenEle = document.getElementById(REEDY_SCREEN_ID)
		if (!screenEle) {
			throw new Error(`ReedyScreen.getScreenEle: could not find element with id ${REEDY_SCREEN_ID}`)
		}
		return screenEle as HTMLCanvasElement
	}

	static getContext(): CanvasRenderingContext2D {
		const canvas = ReedyScreen.getScreenEle()
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
		return ctx
	}

	static getScreenState(): TvScreenState {
		return {
			opacity: COLOR_RGBA.a,
			hexColor: COLOR_HEX
		}
	}

	static setScreenOpacity(opacity: number): void {
		console.log(`ReedyScreen.setScreenOpacity: opacity value ${opacity} received!`)
		COLOR_RGBA.a = opacity / 100
	}

	static setScreenColor(color: string): void {
		console.log(`ReedyScreen.setScreenColor: color value ${color} received!`)
		COLOR_HEX = color
		COLOR_RGBA.r = Number('0x' + color.slice(1, 3))
		COLOR_RGBA.g = Number('0x' + color.slice(3, 5))
		COLOR_RGBA.b = Number('0x' + color.slice(5, 7))
	}

	static moveViewingWindow(x: number, y: number, width: number, height: number): void {
		RECTANGLES[0] = { x, y, width, height }
	}

	static inject(): void {
		let screenEle = document.getElementById(REEDY_SCREEN_ID) as HTMLCanvasElement
		if (screenEle !== null) {
			console.log(`ReedyScreen.inject: screen element already exists`)
			return
		} else {
			console.log(`ReedyScreen.inject: canvas element injected`)
		}

		screenEle = ReedyScreen.create()
		document.body.appendChild(screenEle)
		console.log('ReedyScreen.inject: Reedy screen div injected')

		window.addEventListener('resize', () => {
			screenEle.width = window.innerWidth;
			screenEle.height = window.innerHeight;
		});
		console.log('ReedyScreen.inject: Added resize event listener')

		window.addEventListener('scroll', () => {
			screenEle.style.top = `${window.scrollY}px`;
			screenEle.style.left = `${window.scrollX}px`;
			ReedyScreen.drawScreen()
		});
		console.log('ReedyScreen.inject: Added scroll event listener')

		ReedyScreen.animate()
		console.log('ReedyScreen.inject: ReedyScreen animation started')
	}

	static turnOn(): void {
		const screenEle = ReedyScreen.getScreenEle()
		screenEle.style.display = REEDY_SCREEN_DISPLAY
		console.log(`Reedy screen turned on!`)
	}

	static turnOff(): void {
		const screenEle = ReedyScreen.getScreenEle()
		screenEle.style.display = 'none'
		console.log(`Reedy screen turned off!`)
	}

	/*
	* if Reedy screen is on return true
	* else return false
	*/
	static isOn(): boolean {
		const screenEle = ReedyScreen.getScreenEle()
		return !(screenEle.style.display === 'none')
	}

	static toggle(): void {
		if (ReedyScreen.isOn()) {
			ReedyScreen.turnOff()
			return
		}
		ReedyScreen.turnOn()
	}
}


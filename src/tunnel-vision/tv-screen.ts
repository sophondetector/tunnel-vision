import { TvScreenState, TV_SCREEN_Z_INDEX } from "../common"

const TV_SCREEN_ID = 'TvScreen'
const TV_SCREEN_DISPLAY = 'flex'
const TV_SCREEN_BUFFER_RADIUS = 5

// tv Screen State Variables
const COLOR_RGBA = {
  r: 0,
  g: 0,
  b: 255,
  a: .5
}

let ACTIVE_RANGE: Range | null = null
let COLOR_HEX = '#0000ff'

function getFillStyle(): string {
  return `rgba(${COLOR_RGBA.r}, ${COLOR_RGBA.g}, ${COLOR_RGBA.b}, ${COLOR_RGBA.a})`
}

export class TvScreen {

  static async create(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas')

    canvas.style.display = TV_SCREEN_DISPLAY
    canvas.style.position = `fixed`
    canvas.style.overflow = `auto`
    canvas.style.pointerEvents = `none` // this ensures mouse clicks "fall through" to the main content
    canvas.style.zIndex = TV_SCREEN_Z_INDEX

    canvas.style.top = `0px`
    canvas.style.left = `0px`
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    canvas.id = TV_SCREEN_ID

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.fillStyle = getFillStyle()

    return canvas
  }

  static async inject(): Promise<void> {
    const screenEle = await TvScreen.create()
    document.body.appendChild(screenEle)
    console.log('TvScreen.inject: tv screen injected')
  }

  static setActiveRange(range: Range): void {
    ACTIVE_RANGE = range
  }

  static getActiveRange(): Range {
    if (ACTIVE_RANGE === null) {
      throw new Error(`Active range is null!`)
    }
    return ACTIVE_RANGE
  }

  static getRectsToDraw(): DOMRect[] {
    const activeRange = TvScreen.getActiveRange()
    const rects = Array.from(activeRange.getClientRects())
      .filter(r => r.width > 1 && r.height > 1)
    return rects
  }

  static drawScreen() {
    const canvas = TvScreen.getScreenEle()
    const ctx = TvScreen.getContext()

    ctx.fillStyle = getFillStyle()
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rects: Array<DOMRect> = TvScreen.getRectsToDraw()

    rects.forEach(rect => {
      const adjustedX = rect.x
      const adjustedY = rect.y
      ctx.clearRect(
        adjustedX - TV_SCREEN_BUFFER_RADIUS,
        adjustedY - TV_SCREEN_BUFFER_RADIUS,
        rect.width + (TV_SCREEN_BUFFER_RADIUS * 2),
        rect.height + (TV_SCREEN_BUFFER_RADIUS * 2)
      );
    });
  }

  static animate() {
    TvScreen.drawScreen()
    requestAnimationFrame(TvScreen.animate)
  }

  static getScreenEle(): HTMLCanvasElement {
    const screenEle = document.getElementById(TV_SCREEN_ID)
    if (!screenEle) {
      throw new Error(`TvScreen.getScreenEle: could not find element with id ${TV_SCREEN_ID}`)
    }
    return screenEle as HTMLCanvasElement
  }

  static getContext(): CanvasRenderingContext2D {
    const canvas = TvScreen.getScreenEle()
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    return ctx
  }

  static getScreenState(): TvScreenState {
    return {
      opacity: COLOR_RGBA.a,
      hexColor: COLOR_HEX
    }
  }

  static async setScreenSize(width: number, height: number): Promise<void> {
    const screenEle = TvScreen.getScreenEle()
    screenEle.width = width
    screenEle.height = height
  }

  static setScreenOpacity(opacity: number): void {
    console.log(`TvScreen.setScreenOpacity: opacity value ${opacity} received!`)
    COLOR_RGBA.a = opacity / 100
  }

  static setScreenColor(color: string): void {
    console.log(`TvScreen.setScreenColor: color value ${color} received!`)
    COLOR_HEX = color
    COLOR_RGBA.r = Number('0x' + color.slice(1, 3))
    COLOR_RGBA.g = Number('0x' + color.slice(3, 5))
    COLOR_RGBA.b = Number('0x' + color.slice(5, 7))
  }

  static getTopRect(): DOMRect {
    const range = TvScreen.getActiveRange()
    const rects = range.getClientRects()
    return rects.item(0) as DOMRect
  }

  static getBottomRect(): DOMRect {
    const range = TvScreen.getActiveRange()
    const rects = range.getClientRects()
    return rects.item(rects.length - 1) as DOMRect
  }

  static turnOn(): void {
    const screenEle = TvScreen.getScreenEle()
    screenEle.style.display = TV_SCREEN_DISPLAY
    console.log(`tv screen turned on!`)
  }

  static turnOff(): void {
    const screenEle = TvScreen.getScreenEle()
    screenEle.style.display = 'none'
    console.log(`tv screen turned off!`)
  }

  static isOn(): boolean {
    const screenEle = TvScreen.getScreenEle()
    return !(screenEle.style.display === 'none')
  }

  static toggle(): void {
    if (TvScreen.isOn()) {
      TvScreen.turnOff()
      return
    }
    TvScreen.turnOn()
  }
}


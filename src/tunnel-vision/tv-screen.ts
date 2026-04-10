import { TvScreenState, TV_SCREEN_Z_INDEX } from "../common"

const TV_SCREEN_ID = 'TvScreen'
const TV_SCREEN_DISPLAY = 'flex'

// tv Screen State Variables
const COLOR_RGBA = {
  r: 0,
  g: 0,
  b: 255,
  a: .5
}

let ACTIVE_RANGE: Range | null = null
let COLOR_HEX = '#0000ff'
let TV_SCREEN_BUFFER_RADIUS: number = 5

export class TvScreen {

  static getFillStyle(): string {
    return `rgba(${COLOR_RGBA.r}, ${COLOR_RGBA.g}, ${COLOR_RGBA.b}, ${COLOR_RGBA.a})`
  }

  static setBufferRadius(radius: number): void {
    TV_SCREEN_BUFFER_RADIUS = radius
  }

  static getBufferRadius(): number {
    return TV_SCREEN_BUFFER_RADIUS
  }

  /**
   * Returns default character size in **physical pixels** (device pixels).
   * This correctly reflects browser zoom + device pixel ratio.
   */
  static #getDefaultCharSize(): { width: number; height: number } {
    const span = document.createElement('span');
    span.textContent = 'M';
    span.style.fontFamily = 'system-ui, sans-serif';
    span.style.fontSize = '1rem';
    span.style.position = 'absolute';
    span.style.visibility = 'hidden';
    span.style.whiteSpace = 'pre';
    span.style.lineHeight = '1';

    document.body.appendChild(span);

    const rect = span.getBoundingClientRect();
    document.body.removeChild(span);

    const dpr = window.devicePixelRatio || 1;

    return {
      width: rect.width * dpr,   // physical pixels
      height: rect.height * dpr  // physical pixels
    };
  }

  static setBufferRadiusByScreenSize(): void {
    const { width, height } = TvScreen.#getDefaultCharSize()
    const newRad = (width + height) * .5 * .2
    TvScreen.setBufferRadius(newRad)
  }

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
    ctx.fillStyle = TvScreen.getFillStyle()

    return canvas
  }

  static async inject(): Promise<void> {
    if (document.getElementById(TV_SCREEN_ID)) {
      return
    }
    const screenEle = await TvScreen.create()
    document.body.appendChild(screenEle)
    console.log('TvScreen.inject: tv screen injected')
  }

  // FIXME: remove all range management from TvScreen
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


  // FIXME: change this to getCanvas
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

  static drawBoxAroundRect(rect: DOMRect, color: string = "red", thickness: number = 3): void {
    const ctx = TvScreen.getContext()
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    // console.log('Drawn at:', x.toFixed(1), y.toFixed(1));
  }
}


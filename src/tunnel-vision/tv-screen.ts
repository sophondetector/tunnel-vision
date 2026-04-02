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

let RECTANGLES: DOMRect[] = []
let COLOR_HEX = '#0000ff'

function getFillStyle(): string {
  return `rgba(${COLOR_RGBA.r}, ${COLOR_RGBA.g}, ${COLOR_RGBA.b}, ${COLOR_RGBA.a})`
}

export class TvScreen {

  static create(): HTMLCanvasElement {
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

  static drawScreen() {
    const canvas = TvScreen.getScreenEle()
    const ctx = TvScreen.getContext()

    ctx.fillStyle = getFillStyle()
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    RECTANGLES.forEach(rect => {
      const adjustedX = rect.x - window.scrollX
      const adjustedY = rect.y - window.scrollY
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

  static setWindowAroundRect(rect: DOMRect): void {
    TvScreen.setWindowAroundMultipleRects([
      rect
    ])
  }

  static emptyRects(): void {
    RECTANGLES = []
  }

  static getTopRect(): DOMRect {
    return RECTANGLES[0]
  }

  static getBottomRect(): DOMRect {
    const len = RECTANGLES.length
    return RECTANGLES[len - 1]
  }

  static setWindowAroundMultipleRects(rects: Array<DOMRect>): void {
    TvScreen.emptyRects()
    for (const rect of rects) {
      rect.x += window.scrollX
      rect.y += window.scrollY
      RECTANGLES.push(rect)
    }
  }

  static inject(): void {
    let screenEle = document.getElementById(TV_SCREEN_ID) as HTMLCanvasElement
    if (screenEle !== null) {
      console.log(`TvScreen.inject: screen element already exists`)
      return
    }

    screenEle = TvScreen.create()
    document.body.appendChild(screenEle)
    console.log('TvScreen.inject: tv screen div injected')

    window.addEventListener('scroll', TvScreen.drawScreen);
    console.log('TvScreen.inject: Added scroll event listener')

    TvScreen.animate()
    console.log('TvScreen.inject: TvScreen animation started')
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

  /*
  * if tv screen is on return true
  * else return false
  */
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


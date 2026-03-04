import { TvDirector } from "./tunnel-vision/index.js"

const TOGGLE_SCREEN = "toggle screen"
const GET_STATE = "get state"

const RESIZE_DEBOUNCE_MILLIS = 500

let DEBOUNCE_TIMEOUT_ID: undefined | number = undefined
let DIRECTOR: TvDirector | null = null

function initializeControls() {
  // TODO: alt+click+drag creates a highlight box
  // bring that in from grok-code.html
  document.addEventListener('keyup', (event) => {
    if (DIRECTOR === null) return
    switch (event.key) {
      case "l":
        event.altKey && DIRECTOR.toggleScreen()
        break;
      case "ArrowDown":
      case "j":
        if (DIRECTOR.isOn() && event.altKey) {
          // event.shiftKey only works in the case of arrow keys
          // shift + alt + j is handled as capital "J" case below
          if (event.shiftKey) {
            DIRECTOR.shiftRangeDown()
            break
          }
          DIRECTOR.incRange()
        }
        break;
      case "ArrowUp":
      case "k":
        if (DIRECTOR.isOn() && event.altKey) {
          // event.shiftKey only works in the case of arrow keys
          // shift + alt + k is handled as capital "K" case below
          if (event.shiftKey) {
            DIRECTOR.shiftRangeUp()
            break
          }
          DIRECTOR.decRange()
        }
        break;
      case "J":
        if (DIRECTOR.isOn() && event.altKey) {
          DIRECTOR.shiftRangeDown()
        }
        break
      case "K":
        if (DIRECTOR.isOn() && event.altKey) {
          DIRECTOR.shiftRangeUp()
        }
        break
      default:
        break;
    }
  })

}

function controlPanelListenerCallback(value: string, sender: string, sendResponse: CallableFunction) {
  if (DIRECTOR === null) {
    console.error(`controlPanelListenerCallback: Director is null!`)
    return
  }

  if (value === TOGGLE_SCREEN) {
    DIRECTOR.toggleScreen()

  } else if (value === GET_STATE) {
    const stateResponse = DIRECTOR.getScreenState()
    sendResponse(stateResponse)

    //pure number means its opacity
  } else if (value.match(/^\d+$/)) {
    if (!DIRECTOR.isOn()) return
    const valueNum = Number(value)
    DIRECTOR.setScreenOpacity(valueNum)

    // if its a color
  } else if (value.match(/^#[0-9a-f]{6}$/)) {
    if (!DIRECTOR.isOn()) return
    DIRECTOR.setScreenColor(value)

  } else {
    console.error(`controlPanelListenerCallback: Unknown message received!!`)
    console.log(`message value: ${value}`)
    console.log(`message sender: ${sender}`)
  }
}

function onresizeCallback() {
  clearTimeout(DEBOUNCE_TIMEOUT_ID)
  DEBOUNCE_TIMEOUT_ID = setTimeout(
    () => DIRECTOR!.onResizeCallback(),
    RESIZE_DEBOUNCE_MILLIS) as unknown as number
}

export function initializeTV() {
  // receives messages from options.ts control-panel
  // @ts-ignore
  chrome.runtime.onMessage.addListener(controlPanelListenerCallback)

  initializeControls()

  DIRECTOR = new TvDirector()
  DIRECTOR.toggleScreenOff()

  window.onresize = onresizeCallback

  console.log(`initializeTV: init complete`)
}

import { TvDirector } from "./tunnel-vision/index.js"

const TOGGLE_SCREEN = "toggle screen"
const GET_STATE = "get state"

let DIRECTOR: TvDirector | null = null

// NOTE: This must call sendResponse on every path to prevent the following error:
// "Unchecked runtime.lastError: The message port closed before a response was received."
function controlPanelListenerCallback(value: string, sender: string, sendResponse: CallableFunction) {
  if (DIRECTOR === null) {
    console.error(`controlPanelListenerCallback: Director is null!`)
    sendResponse()
    return
  }

  if (value === TOGGLE_SCREEN) {
    DIRECTOR.toggleScreen()

  } else if (value === GET_STATE) {
    const stateResponse = DIRECTOR.getScreenState()
    sendResponse(stateResponse)
    return

    //pure number means its opacity
  } else if (value.match(/^\d+$/)) {
    if (!DIRECTOR.isOn()) {
      sendResponse()
      return
    }
    const valueNum = Number(value)
    DIRECTOR.setScreenOpacity(valueNum)

    // if its a color
  } else if (value.match(/^#[0-9a-f]{6}$/)) {
    if (!DIRECTOR.isOn()) {
      sendResponse()
      return
    }
    DIRECTOR.setScreenColor(value)


  } else {
    console.error(`controlPanelListenerCallback: Unknown message received!!`)
    console.log(`message value: ${value}`)
    console.log(`message sender: ${sender}`)
  }

  sendResponse()
}

export function initializeTV(): void {
  // receives messages from options.ts control-panel
  // @ts-ignore
  chrome.runtime.onMessage.addListener(controlPanelListenerCallback)
  getDirector()
  console.log(`initializeTV: init complete`)
}

export function getDirector(): TvDirector {
  if (DIRECTOR === null) {
    DIRECTOR = new TvDirector()
  }
  return DIRECTOR
}

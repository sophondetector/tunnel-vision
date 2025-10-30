import { TvDirector } from "./tunnel-vision/index.js"

const RESIZE_DEBOUNCE_MILLIS = 500

let DEBOUNCE_TIMEOUT_ID: undefined | number = undefined
let DIRECTOR: TvDirector | null = null

// TODO set control-panel messages as constants
// receives messages from options.ts control-panel
// @ts-ignore
chrome.runtime.onMessage.addListener(function(value: string, sender, sendResponse) {
	if (DIRECTOR === null) {
		throw new Error(`content.ts: Director is null!`)
	}

	// console.log('content.ts: value received: ', value)

	try {

		if (value === "toggle screen") {

			DIRECTOR.toggleScreen()

		} else if (value === "get state") {

			const stateResponse = DIRECTOR.getScreenState()
			sendResponse(stateResponse)

		} else if (value.match(/^\d+$/)) {

			if (!DIRECTOR.isOn()) return
			const valueNum = Number(value)
			DIRECTOR.setScreenOpacity(valueNum)

		} else if (value.match(/^#[0-9a-f]{6}$/)) {

			if (!DIRECTOR.isOn()) return
			DIRECTOR.setScreenColor(value)

		} else {

			console.log(`tv content.ts: Unknown message received!!`)
			console.log(`message value: ${value}`)
			console.log(`message sender: ${sender}`)

		}

	} catch (err) {
		console.error(`ERROR: Error trying to read input from control panel`)
		console.error(err)
	}
})

// TODO alt+click+drag creates a highlight box
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


DIRECTOR = new TvDirector()
DIRECTOR.toggleScreenOff()

window.onresize = () => {
	clearTimeout(DEBOUNCE_TIMEOUT_ID)
	DEBOUNCE_TIMEOUT_ID = setTimeout(
		() => DIRECTOR!.onResizeCallback(),
		RESIZE_DEBOUNCE_MILLIS) as unknown as number
}

console.log(`tv init complete`)


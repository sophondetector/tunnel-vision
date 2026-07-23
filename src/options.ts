import { TvScreenState, TvDirectorState } from "./tunnel-vision-core";
import { ChromeExtensionSoundController } from "./sound-for-extension";
import {
  getCurrentTab,
  TvMessage,
} from "./chrome-helpers"

const OPTIONS_SOUND_CONTROLLER = new ChromeExtensionSoundController()

const HIDDEN = "hidden"

const CONTROL_PANEL_DIV = document.getElementById('control-panel-div') as HTMLButtonElement
const HELP_DIV = document.getElementById('help-div') as HTMLDivElement

const OPEN_IN_VISION_PDF = document.getElementById('open-in-tunnel-pdf') as HTMLAnchorElement
const SCREEN_TOGGLE = document.getElementById('screen-toggle') as HTMLButtonElement
const ERROR_HEADER = document.getElementById("error-header") as HTMLHeadingElement
const HELP_TOGGLE = document.getElementById('help-toggle') as HTMLButtonElement
const CONTROL_PANEL_TOGGLE = document.getElementById('control-panel-toggle') as HTMLButtonElement

const OPACITY_CONTROL = document.getElementById("opacity-control") as HTMLDivElement
// FIXME: grey out opacity slider when screen isn't on
const OPACITY_DISPLAY = document.getElementById('opacity-display') as HTMLSpanElement
const OPACITY_SLIDER = document.getElementById('opacity-slider') as HTMLInputElement

const COLOR_CONTROL = document.getElementById("color-control") as HTMLDivElement
const COLOR_PICKER = document.getElementById('color-picker') as HTMLInputElement

const SOUND_TOGGLE = document.getElementById('sound-toggle') as HTMLButtonElement

const VOLUME_CONTROL = document.getElementById('volume-control') as HTMLDivElement
const VOLUME_DISPLAY = document.getElementById('volume-display') as HTMLSpanElement
const VOLUME_SLIDER = document.getElementById('volume-slider') as HTMLInputElement

// debug panel
const DEBUG_PANEL = document.getElementById('debug-panel') as HTMLDivElement
const RE_RANGE = document.getElementById('re-range') as HTMLButtonElement
const RE_INIT = document.getElementById('re-init') as HTMLButtonElement
const SHOW_RANGES = document.getElementById('show-ranges') as HTMLButtonElement
const LOG_RANGES = document.getElementById('log-ranges') as HTMLButtonElement
const DUMP_RANGES = document.getElementById('dump-ranges') as HTMLButtonElement
const SHOW_TEXT_NODES = document.getElementById('show-text-nodes') as HTMLButtonElement

function showErrorHeader(): void {
  ERROR_HEADER.classList.remove(HIDDEN)
}

function greyOutEle(ele: HTMLElement): void {
  ele.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
  ele.style.filter = 'grayscale(100%)';
  ele.style.opacity = '0.5';
  ele.style.pointerEvents = 'none';  // Disable interactions
}

function greyOutControls(): void {
  greyOutEle(SCREEN_TOGGLE)
  greyOutEle(OPACITY_DISPLAY)
  greyOutEle(OPACITY_SLIDER)
  greyOutEle(COLOR_PICKER)
}

function disableVolumeSlider(): void {
  VOLUME_SLIDER.disabled = true
  VOLUME_CONTROL.style.opacity = '0.2'
}

function enableVolumeSlider(): void {
  VOLUME_SLIDER.disabled = false
  VOLUME_CONTROL.style.opacity = '1'
}

function hideOpenInTunnelPDF(): void {
  OPEN_IN_VISION_PDF.classList.add(HIDDEN)
}

function hideNonOpenInTunnelPDf(): void {
  SCREEN_TOGGLE.classList.add(HIDDEN)
  COLOR_CONTROL.classList.add(HIDDEN)
  OPACITY_CONTROL.classList.add(HIDDEN)
}

function urlIsPdf(url: string): boolean {
  if (url.match(/\.pdf$/)) return true
  return false
}

function displaySoundState(isOn: boolean): void {
  if (isOn) {
    enableVolumeSlider()
    return
  }
  disableVolumeSlider()
}

function showHelp(): void {
  HELP_DIV.classList.remove("hidden")
  CONTROL_PANEL_DIV.classList.add("hidden")
}

function showControlPanel(): void {
  CONTROL_PANEL_DIV.classList.remove("hidden")
  HELP_DIV.classList.add("hidden")
}

async function toggleDebugPanel(): Promise<void> {
  const isOff = DEBUG_PANEL.classList.contains("hidden")
  if (isOff) {
    DEBUG_PANEL.classList.remove("hidden")
    return
  }
  DEBUG_PANEL.classList.add("hidden")
}

RE_RANGE.addEventListener('click', async function () {
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, TvMessage.INIT_RANGES, function () {
    console.log(`sent message ${TvMessage.INIT_RANGES} to content.ts in open tab`)
  })
})

RE_INIT.addEventListener('click', async function () {
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, TvMessage.RE_INIT, function () {
    console.log(`sent message ${TvMessage.RE_INIT} to content.ts in open tab`)
  })
})

SHOW_RANGES.addEventListener('click', async function () {
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, TvMessage.SHOW_RANGES, function () {
    console.log(`sent message ${TvMessage.SHOW_RANGES} to content.ts in open tab`)
  })
})

LOG_RANGES.addEventListener('click', async function () {
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, TvMessage.LOG_RANGES, function () {
    console.log(`sent message ${TvMessage.LOG_RANGES} to content.ts in open tab`)
  })
})

DUMP_RANGES.addEventListener('click', async function () {
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, TvMessage.DUMP_RANGES, function () {
    console.log(`sent message ${TvMessage.DUMP_RANGES} to content.ts in open tab`)
  })
})

SHOW_TEXT_NODES.addEventListener('click', async function () {
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, TvMessage.SHOW_TEXT_NODES, function () {
    console.log(`sent message ${TvMessage.SHOW_TEXT_NODES} to content.ts in open tab`)
  })
})

HELP_TOGGLE.addEventListener('click', showHelp)

CONTROL_PANEL_TOGGLE.addEventListener('click', showControlPanel)

SCREEN_TOGGLE.addEventListener('click', async () => {
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, TvMessage.TOGGLE_SCREEN, function () {
    console.log("sent message to content.ts in open tab")
  })
})

SOUND_TOGGLE.addEventListener('click', async () => {
  await OPTIONS_SOUND_CONTROLLER.toggleSound()
  const isOn = await OPTIONS_SOUND_CONTROLLER.soundIsOn()
  displaySoundState(isOn)
})

OPACITY_SLIDER.addEventListener("input", async (event) => {
  //@ts-ignore
  const value = event.target.value
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, `${value}`, function () {
    OPACITY_DISPLAY.textContent = `${value}%`
    console.log(`sent screen opacity value ${value} to content.ts in open tab`)
  })
})

VOLUME_SLIDER.addEventListener("input", async (event) => {
  //@ts-ignore
  const value = event.target.value
  await OPTIONS_SOUND_CONTROLLER.setSoundVol(value)
  VOLUME_DISPLAY.textContent = `${value}%`
  OPTIONS_SOUND_CONTROLLER.playSound()
})

COLOR_PICKER.addEventListener("input", async (event) => {
  //@ts-ignore
  const value = event.target.value
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, `${value}`, function () {
    console.log(`sent color value ${value} to content.ts in open tab`)
  })
})

document.addEventListener('keyup', (event) => {
  if (!event.altKey) return
  if (event.key === "D") {
    toggleDebugPanel()
  }
})

getCurrentTab()
  .then(tab => {

    if (tab.url && urlIsPdf(tab.url)) {
      OPEN_IN_VISION_PDF.href = `https://visionpdf.dev/?pdf=${encodeURIComponent(tab.url)}`
      OPEN_IN_VISION_PDF.style.backgroundColor = "lightgreen"
      hideNonOpenInTunnelPDf()
    } else {
      hideOpenInTunnelPDF()
    }

    chrome.tabs.sendMessage(tab.id!, TvMessage.GET_SCREEN_STATE, function (state: TvScreenState) {
      const opacityPercent = String(state.opacity * 100)
      OPACITY_SLIDER.value = opacityPercent
      OPACITY_DISPLAY.textContent = `${opacityPercent}%`
      COLOR_PICKER.value = state.hexColor
    })

    chrome.tabs.sendMessage(tab.id!, TvMessage.GET_DIRECTOR_STATE, function (state: TvDirectorState) {
      if (state === TvDirectorState.ERROR) {
        greyOutControls()
        showErrorHeader()
      }
    })

  })
  .then(OPTIONS_SOUND_CONTROLLER.soundIsOn)
  .then(displaySoundState)
  .then(OPTIONS_SOUND_CONTROLLER.getSoundVol)
  .then((vol) => {
    VOLUME_DISPLAY.textContent = `${vol}%`
    VOLUME_SLIDER.value = String(vol)
  })

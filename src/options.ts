import {
  TvScreenState,
  getCurrentTab,
  storeLatestPDFUrlInLocalStorage,
  toggleSound,
  soundIsOn,
  setSoundVol,
  getSoundVol,
  TvMessage,
  TvDirectorState
} from "./common";
import { playSound } from "./tunnel-vision/sound";

const HIDDEN = "hidden"

const CONTROL_PANEL_DIV = document.getElementById('control-panel-div') as HTMLButtonElement
const HELP_DIV = document.getElementById('help-div') as HTMLDivElement

const CONTROL_PANEL_TOGGLE = document.getElementById('control-panel-toggle') as HTMLButtonElement
const ERROR_HEADER = document.getElementById("error-header") as HTMLHeadingElement
const HELP_TOGGLE = document.getElementById('help-toggle') as HTMLButtonElement
const PDF_TOGGLE = document.getElementById('pdf-toggle') as HTMLButtonElement
const SCREEN_TOGGLE = document.getElementById('screen-toggle') as HTMLButtonElement

const OPACITY_CONTROL = document.getElementById("opacity-control") as HTMLDivElement
const OPACITY_DISPLAY = document.getElementById('opacity-display') as HTMLSpanElement
const OPACITY_SLIDER = document.getElementById('opacity-slider') as HTMLInputElement

const COLOR_CONTROL = document.getElementById("color-control") as HTMLDivElement
const COLOR_PICKER = document.getElementById('color-picker') as HTMLInputElement

const SOUND_DISPLAY = document.getElementById('sound-display') as HTMLSpanElement
const SOUND_TOGGLE = document.getElementById('sound-toggle') as HTMLButtonElement

const VOLUME_CONTROL = document.getElementById('volume-control') as HTMLDivElement
const VOLUME_DISPLAY = document.getElementById('volume-display') as HTMLSpanElement
const VOLUME_SLIDER = document.getElementById('volume-slider') as HTMLInputElement

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

function hidePdf(): void {
  PDF_TOGGLE.classList.add(HIDDEN)
}

function hideNonPdf(): void {
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
    SOUND_DISPLAY.textContent = 'Sound is On'
    enableVolumeSlider()
    return
  }
  SOUND_DISPLAY.textContent = 'Sound is Off'
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

HELP_TOGGLE.addEventListener('click', showHelp)

CONTROL_PANEL_TOGGLE.addEventListener('click', showControlPanel)

SCREEN_TOGGLE.addEventListener('click', async () => {
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, TvMessage.TOGGLE_SCREEN, function () {
    console.log("sent message to content.ts in open tab")
  })
})

SOUND_TOGGLE.addEventListener('click', () => {
  toggleSound()
    .then(soundIsOn)
    .then(displaySoundState)
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
  await setSoundVol(value)
  VOLUME_DISPLAY.textContent = `${value}%`
  playSound()
})

COLOR_PICKER.addEventListener("input", async (event) => {
  //@ts-ignore
  const value = event.target.value
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, `${value}`, function () {
    console.log(`sent color value ${value} to content.ts in open tab`)
  })
})

getCurrentTab()
  .then(tab => {

    if (tab.url && urlIsPdf(tab.url)) {
      PDF_TOGGLE.style.backgroundColor = "lightgreen"
      PDF_TOGGLE.addEventListener("click", async () => {
        await storeLatestPDFUrlInLocalStorage(tab.url as string)
      })
      hideNonPdf()
    } else {
      hidePdf()
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
  .then(soundIsOn)
  .then(displaySoundState)
  .then(getSoundVol)
  .then((vol) => {
    VOLUME_DISPLAY.textContent = `${vol}%`
    VOLUME_SLIDER.value = String(vol)
  })

import {
  TvScreenState,
  getCurrentTab,
  soundIsOn,
  storeLatestPDFUrlInLocalStorage,
  toggleSound,
  TvMessage
} from "./common";

const SCREEN_TOGGLE = document.getElementById('screen-toggle') as HTMLButtonElement
const OPACITY_SLIDER = document.getElementById('opacity-slider') as HTMLInputElement
const OPACITY_DISPLAY = document.getElementById('opacity-display') as HTMLInputElement
const COLOR_PICKER = document.getElementById('color-picker') as HTMLInputElement
const PDF_TOGGLE = document.getElementById('pdf-toggle') as HTMLButtonElement
const SOUND_TOGGLE = document.getElementById('sound-toggle') as HTMLButtonElement
const SOUND_DISPLAY = document.getElementById('sound-display') as HTMLSpanElement
const HELP_TOGGLE = document.getElementById('help-toggle') as HTMLButtonElement
const CONTROL_PANEL_TOGGLE = document.getElementById('control-panel-toggle') as HTMLButtonElement

const HELP_DIV = document.getElementById('help-div') as HTMLDivElement
const CONTROL_PANEL_DIV = document.getElementById('control-panel-div') as HTMLButtonElement

function urlIsPdf(url: string): boolean {
  if (url.match(/\.pdf$/)) return true
  return false
}

function displaySoundState(soundOn: boolean): void {
  if (soundOn) {
    SOUND_DISPLAY.textContent = 'Sound is On'
    return
  }
  SOUND_DISPLAY.textContent = 'Sound is Off'
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
    }

    chrome.tabs.sendMessage(tab.id!, TvMessage.GET_SCREEN_STATE, function (state: TvScreenState) {
      const opacityPercent = String(state.opacity * 100)
      OPACITY_SLIDER.value = opacityPercent
      OPACITY_DISPLAY.textContent = `${opacityPercent}%`
      COLOR_PICKER.value = state.hexColor
    })

  })
  .then(soundIsOn)
  .then(displaySoundState)

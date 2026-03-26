import {
  TvScreenState,
  getCurrentTab,
  soundIsOn,
  storeLatestPDFUrlInLocalStorage,
  toggleSound,
  TOGGLE_SCREEN,
  GET_STATE
} from "./common";

// TODO: change all these to capital case
const toggle = document.getElementById('tv-toggle') as HTMLButtonElement
const slider = document.getElementById('opacity-slider') as HTMLInputElement
const opacityDisplay = document.getElementById('opacity-display') as HTMLInputElement
const colorPicker = document.getElementById('color-picker') as HTMLInputElement
const pdfToggle = document.getElementById('pdf-toggle') as HTMLButtonElement
const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement
const soundDisplay = document.getElementById('sound-display') as HTMLSpanElement

function urlIsPdf(url: string): boolean {
  if (url.match(/\.pdf$/)) return true
  return false
}

function displaySoundState(soundOn: boolean): void {
  if (soundOn) {
    soundDisplay.textContent = 'Sound is On'
    return
  }
  soundDisplay.textContent = 'Sound is Off'
}

toggle.addEventListener('click', async () => {
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, TOGGLE_SCREEN, function () {
    console.log("sent message to content.ts in open tab")
  })
})

soundToggle.addEventListener('click', () => {
  toggleSound()
    .then(soundIsOn)
    .then(displaySoundState)
})

slider.addEventListener("input", async (event) => {
  //@ts-ignore
  const value = event.target.value
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, `${value}`, function () {
    opacityDisplay.textContent = `${value}%`
    console.log(`sent screen opacity value ${value} to content.ts in open tab`)
  })
})

colorPicker.addEventListener("input", async (event) => {
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
      pdfToggle.style.backgroundColor = "lightgreen"
      pdfToggle.addEventListener("click", async () => {
        await storeLatestPDFUrlInLocalStorage(tab.url as string)
      })
    }

    chrome.tabs.sendMessage(tab.id!, GET_STATE, function (state: TvScreenState) {
      const opacityPercent = String(state.opacity * 100)
      slider.value = opacityPercent
      opacityDisplay.textContent = `${opacityPercent}%`
      colorPicker.value = state.hexColor
    })

  })
  .then(soundIsOn)
  .then(displaySoundState)

import { TvScreenState, getCurrentTab, soundIsOn, storeLatestPDFUrlInLocalStorage, toggleSound } from "./common";

const toggle = document.getElementById('tv-toggle') as HTMLButtonElement
const slider = document.getElementById('opacity-slider') as HTMLInputElement
const sliderReadout = document.getElementById('slider-readout') as HTMLInputElement
const colorPicker = document.getElementById('color-picker') as HTMLInputElement
const pdfToggle = document.getElementById('pdf-toggle') as HTMLButtonElement
const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement
const soundToggleIndicator = document.getElementById('sound-toggle-indicator') as HTMLSpanElement

function urlIsPdf(url: string): boolean {
  if (url.match(/\.pdf$/)) return true
  return false
}

function displaySoundState(soundOn: boolean): void {
  if (soundOn) {
    soundToggleIndicator.textContent = 'Sound is On'
    return
  }
  soundToggleIndicator.textContent = 'Sound is Off'
}

toggle.addEventListener('click', async () => {
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, "toggle screen", function () {
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
    sliderReadout.textContent = `${value}%`
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

    chrome.tabs.sendMessage(tab.id!, "get state", function (state: TvScreenState) {
      const opacityPercent = String(state.opacity * 100)
      slider.value = opacityPercent
      sliderReadout.textContent = `${opacityPercent}%`
      colorPicker.value = state.hexColor
    })

  })
  .then(soundIsOn)
  .then(displaySoundState)

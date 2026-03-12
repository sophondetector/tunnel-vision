import { TvScreenState, PDF_URL_KEY } from "./types-and-consts";

const toggle = document.getElementById('tv-toggle') as HTMLButtonElement
const slider = document.getElementById('opacity-slider') as HTMLInputElement
const sliderReadout = document.getElementById('slider-readout') as HTMLInputElement
const colorPicker = document.getElementById('color-picker') as HTMLInputElement
const pdfToggle = document.getElementById('pdf-toggle') as HTMLButtonElement

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true }
  let [tab] = await chrome.tabs.query(queryOptions)
  return tab
}

function urlIsPdf(url: string): boolean {
  if (url.match(/\.pdf$/)) return true
  return false
}

async function storeUrlInLocalStorage(url: string): Promise<void> {
  await chrome.storage.local.set({ [PDF_URL_KEY]: url })
}

toggle.addEventListener('click', async () => {
  const tab = await getCurrentTab()
  chrome.tabs.sendMessage(tab.id!, "toggle screen", function () {
    console.log("sent message to content.ts in open tab")
  })
})

// FIXME: fix "message port was closed before response was sent" error
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
        await storeUrlInLocalStorage(tab.url as string)
      })
    }

    chrome.tabs.sendMessage(tab.id!, "get state", function (state: TvScreenState) {
      const opacityPercent = String(state.opacity * 100)
      slider.value = opacityPercent
      sliderReadout.textContent = `${opacityPercent}%`
      colorPicker.value = state.hexColor
    })

  })



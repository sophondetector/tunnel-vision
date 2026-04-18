import { SOUND_ON_KEY, SOUND_VOLUME_KEY } from "../common";

const AUDIO_URL = 'src/tunnel-vision/click.mp3'
const TRUE = 'true'
const FALSE = 'false'

let AUDIO: HTMLAudioElement | null = null

export async function playSound(): Promise<void> {
  const isOn = await soundIsOn()
  if (!isOn) return
  const audio = getAudio()
  const vol = await getSoundVol()
  audio.volume = vol / 100
  audio.currentTime = 0
  audio.play()
}

function getAudio(): HTMLAudioElement {
  if (AUDIO === null) {
    AUDIO = new Audio(chrome.runtime.getURL(AUDIO_URL));
  }
  return AUDIO
}

export async function soundIsOn(): Promise<boolean> {
  const res = await chrome.storage.local.get(SOUND_ON_KEY)
  const curVal = res[SOUND_ON_KEY]
  if (curVal === undefined) {
    console.warn(`soundIsOn: could not retrieve sound option`)
    return false
  }
  if (curVal === TRUE) return true
  return false
}

export async function toggleSound(): Promise<void> {
  if (await soundIsOn()) {
    await setSoundOff()
    return
  }
  await setSoundOn()
}

export async function setSoundOn(): Promise<void> {
  await chrome.storage.local.set({ [SOUND_ON_KEY]: TRUE })
}

export async function setSoundOff(): Promise<void> {
  await chrome.storage.local.set({ [SOUND_ON_KEY]: FALSE })
}

export async function setSoundVol(volumeLevel: number): Promise<void> {
  await chrome.storage.local.set({ [SOUND_VOLUME_KEY]: volumeLevel })
}

export async function getSoundVol(): Promise<number> {
  const res = await chrome.storage.local.get(SOUND_VOLUME_KEY)
  const volume: number = res[SOUND_VOLUME_KEY]
  return volume
}


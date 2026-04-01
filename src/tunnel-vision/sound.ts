import { getSoundVol, soundIsOn } from "../common";

const AUDIO_URL = 'src/tunnel-vision/click.mp3'

let AUDIO: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (AUDIO === null) {
    AUDIO = new Audio(chrome.runtime.getURL(AUDIO_URL));
  }
  return AUDIO
}

export async function playSound(): Promise<void> {
  const isOn = await soundIsOn()
  if (!isOn) return
  const audio = getAudio()
  const vol = await getSoundVol()
  audio.volume = vol / 100
  audio.currentTime = 0
  audio.play()
}

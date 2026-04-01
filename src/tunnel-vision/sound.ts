import { getSoundVol } from "../common";

const AUDIO_URL = 'src/tunnel-vision/click.mp3'

let AUDIO: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (AUDIO === null) {
    AUDIO = new Audio(chrome.runtime.getURL(AUDIO_URL));
  }
  return AUDIO
}

// TODO: push on-off into this function
export function playSound(): void {
  const audio = getAudio()
  getSoundVol()
    .then((vol) => {
      audio.volume = vol / 100
      audio.currentTime = 0
      audio.play()
    })
}

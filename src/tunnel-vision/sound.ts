// TODO: add volume control

const AUDIO_URL = 'src/tunnel-vision/click.mp3'

let AUDIO: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (AUDIO === null) {
    AUDIO = new Audio(chrome.runtime.getURL(AUDIO_URL));
  }
  return AUDIO
}

export function playSound(): void {
  const audio = getAudio()
  audio.currentTime = 0
  audio.play()
}

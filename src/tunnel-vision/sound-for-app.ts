import { TvSoundController } from "./sound-interface";

const AUDIO_URL = 'static/tunnel-vision/click.mp3'

let AUDIO: HTMLAudioElement | null = null
let IS_ON: boolean = true
let VOLUME: number = 50

export class WebAppSoundController implements TvSoundController {

  constructor() { }

  async playSound(): Promise<void> {
    const isOn = await this.soundIsOn()
    if (!isOn) return
    const audio = this.getAudio()
    const vol = await this.getSoundVol()
    audio.volume = vol / 100
    audio.currentTime = 0
    audio.play()
  }

  getAudio(): HTMLAudioElement {
    if (AUDIO === null) {
      AUDIO = new Audio(chrome.runtime.getURL(AUDIO_URL));
    }
    return AUDIO
  }

  async soundIsOn(): Promise<boolean> {
    return IS_ON
  }

  async toggleSound(): Promise<void> {
    IS_ON = !IS_ON
  }

  async setSoundOn(): Promise<void> {
    IS_ON = true
  }

  async setSoundOff(): Promise<void> {
    IS_ON = false
  }

  async setSoundVol(volumeLevel: number): Promise<void> {
    VOLUME = volumeLevel
  }

  async getSoundVol(): Promise<number> {
    return VOLUME
  }
}


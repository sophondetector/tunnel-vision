import { TvSoundController } from "./tunnel-vision-core/tunnel-vision/sound-interface";
import { SOUND_ON_KEY, SOUND_VOLUME_KEY } from "./tunnel-vision-core/common";

const AUDIO_URL = 'src/tunnel-vision-core/tunnel-vision/click.mp3'
const TRUE = 'true'
const FALSE = 'false'

let AUDIO: HTMLAudioElement | null = null

export class ChromeExtensionSoundController implements TvSoundController {

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
    const res = await chrome.storage.local.get(SOUND_ON_KEY)
    const curVal = res[SOUND_ON_KEY]
    if (curVal === undefined) {
      console.warn(`soundIsOn: could not retrieve sound option`)
      return false
    }
    if (curVal === TRUE) return true
    return false
  }

  async toggleSound(): Promise<void> {
    if (await this.soundIsOn()) {
      await this.setSoundOff()
      return
    }
    await this.setSoundOn()
  }

  async setSoundOn(): Promise<void> {
    await chrome.storage.local.set({ [SOUND_ON_KEY]: TRUE })
  }

  async setSoundOff(): Promise<void> {
    await chrome.storage.local.set({ [SOUND_ON_KEY]: FALSE })
  }

  async setSoundVol(volumeLevel: number): Promise<void> {
    await chrome.storage.local.set({ [SOUND_VOLUME_KEY]: volumeLevel })
  }

  async getSoundVol(): Promise<number> {
    const res = await chrome.storage.local.get(SOUND_VOLUME_KEY)
    const volume: number = res[SOUND_VOLUME_KEY]
    return volume
  }
}

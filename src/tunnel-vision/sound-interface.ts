export interface TvSoundController {
  playSound(): Promise<void>,
  getAudio(): HTMLAudioElement,
  soundIsOn(): Promise<boolean>,
  toggleSound(): Promise<void>,
  setSoundOn(): Promise<void>,
  setSoundOff(): Promise<void>,
  setSoundVol(volumeLevel: number): Promise<void>,
  getSoundVol(): Promise<number>
}

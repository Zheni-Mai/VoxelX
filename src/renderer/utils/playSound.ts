// src/utils/playSound.ts
import UpdateSound from '@/assets/sounds/update.mp3'
import SuccessSound from '@/assets/sounds/success.mp3'
//import ErrorSound from '@/assets/sounds/error.mp3'
//import LoginSound from '@/assets/sounds/login.mp3'

const sounds = {
  update: new Audio(UpdateSound),
  success: new Audio(SuccessSound),
  //error: new Audio(ErrorSound),
  //login: new Audio(LoginSound),
}

Object.values(sounds).forEach(s => s.volume = 0.4)

export const playSound = (name: 'update' | 'success') => {
  const sound = sounds[name]
  if (sound) {
    sound.currentTime = 0
    sound.play().catch(() => {})
  }
}
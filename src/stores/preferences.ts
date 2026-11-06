import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type AiLevel = 'easy' | 'medium' | 'hard'
export type PlayerColor = 'w' | 'b'

const STORAGE_KEY = 'chess-preferences'

interface StoredPreferences {
  soundEnabled?: boolean
  darkMode?: boolean
  aiLevel?: AiLevel
  playerColor?: PlayerColor
}

function loadPreferences(): StoredPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredPreferences) : {}
  } catch {
    return {}
  }
}

export const usePreferencesStore = defineStore('preferences', () => {
  const stored = loadPreferences()

  const soundEnabled = ref(stored.soundEnabled ?? true)
  const darkMode = ref(stored.darkMode ?? false)
  const aiLevel = ref<AiLevel>(stored.aiLevel ?? 'medium')
  const playerColor = ref<PlayerColor>(stored.playerColor ?? 'w')

  function toggleSound() { soundEnabled.value = !soundEnabled.value }
  function toggleDarkMode() { darkMode.value = !darkMode.value }
  function setAiLevel(level: AiLevel) { aiLevel.value = level }
  function setPlayerColor(color: PlayerColor) { playerColor.value = color }

  watch(
    [soundEnabled, darkMode, aiLevel, playerColor],
    () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            soundEnabled: soundEnabled.value,
            darkMode: darkMode.value,
            aiLevel: aiLevel.value,
            playerColor: playerColor.value,
          }),
        )
      } catch {
        // storage unavailable (private mode, quota, etc.)
      }
    },
    { deep: false },
  )

  return {
    soundEnabled,
    darkMode,
    aiLevel,
    playerColor,
    toggleSound,
    toggleDarkMode,
    setAiLevel,
    setPlayerColor,
  }
})

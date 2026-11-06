import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface SavedGame {
  id: string
  pgn: string
  date: string
  result: string
  white: string
  black: string
}

const STORAGE_KEY = 'chess-history'
const MAX_GAMES = 100

function loadGames(): SavedGame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SavedGame[]) : []
  } catch {
    return []
  }
}

export const useHistoryStore = defineStore('history', () => {
  const savedGames = ref<SavedGame[]>(loadGames())

  function saveGame(pgn: string, result: string, white = 'White', black = 'Black') {
    savedGames.value.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      pgn,
      date: new Date().toLocaleString(),
      result,
      white,
      black,
    })
    if (savedGames.value.length > MAX_GAMES) {
      savedGames.value = savedGames.value.slice(0, MAX_GAMES)
    }
  }

  function deleteGame(id: string) {
    savedGames.value = savedGames.value.filter(g => g.id !== id)
  }

  function clearGames() {
    savedGames.value = []
  }

  watch(
    savedGames,
    (games) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
      } catch {
        // storage unavailable (private mode, quota, etc.)
      }
    },
    { deep: true },
  )

  return { savedGames, saveGame, deleteGame, clearGames }
})

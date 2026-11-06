<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoryStore } from '@/stores/history'
import { useGameStore } from '@/stores/game'
import ChessBoard from '@/components/ChessBoard.vue'

const router = useRouter()
const historyStore = useHistoryStore()
const gameStore = useGameStore()

const boardRef = ref<InstanceType<typeof ChessBoard> | null>(null)
const showPgn = ref(false)
const pgnInput = ref('')
const loadError = ref('')
const saveMessage = ref('')
let saveMessageTimer: ReturnType<typeof setTimeout> | null = null

const currentPgn = computed(() => boardRef.value?.getPgn() ?? '')
const currentFen = computed(() => boardRef.value?.getFen() ?? '')

onMounted(() => {
  const pgn = gameStore.consumePendingPgn()
  if (!pgn) return
  if (boardRef.value?.loadPgn(pgn) === false) {
    loadError.value = 'The saved game could not be loaded.'
    showPgn.value = true
  }
})

function saveCurrentGame() {
  const pgn = boardRef.value?.getPgn()
  const result = boardRef.value?.getResult()
  if (!pgn) {
    saveMessage.value = 'No moves to save'
    return
  }
  if (!result) return
  historyStore.saveGame(pgn, result)
  saveMessage.value = 'Game saved'
  if (saveMessageTimer) clearTimeout(saveMessageTimer)
  saveMessageTimer = setTimeout(() => { saveMessage.value = '' }, 2000)
}

function loadPgn() {
  if (!pgnInput.value) return
  loadError.value = ''
  const loaded = boardRef.value?.loadPgn(pgnInput.value)
  if (loaded === false) {
    loadError.value = 'Invalid PGN. Check the notation and try again.'
    return
  }
  pgnInput.value = ''
  showPgn.value = false
}

function copyPgn() {
  const pgn = boardRef.value?.getPgn()
  if (pgn) navigator.clipboard.writeText(pgn)
}

function copyFen() {
  const fen = boardRef.value?.getFen()
  if (fen) navigator.clipboard.writeText(fen)
}
</script>

<template>
  <div class="min-h-screen bg-dark-bg flex flex-col items-center p-4">
    <div class="flex gap-2 mb-3 w-full max-w-[640px]">
      <button class="px-3.5 py-2 border-none rounded text-sm font-semibold cursor-pointer bg-btn-bg text-white hover:bg-btn-hover" @click="router.push('/')">← Back</button>
      <button class="px-3.5 py-2 border-none rounded text-sm font-semibold cursor-pointer bg-btn-bg text-white hover:bg-btn-hover" @click="saveCurrentGame">Save</button>
      <button class="px-3.5 py-2 border-none rounded text-sm font-semibold cursor-pointer bg-btn-bg text-white hover:bg-btn-hover" @click="showPgn = !showPgn">FEN/PGN</button>
      <button class="px-3.5 py-2 border-none rounded text-sm font-semibold cursor-pointer bg-btn-bg text-white hover:bg-btn-hover" @click="router.push('/settings')">⚙</button>
      <span v-if="saveMessage" class="self-center text-sm text-green">{{ saveMessage }}</span>
    </div>

    <div v-if="showPgn" class="bg-card-bg rounded-lg p-3 mb-3 w-full max-w-[640px] flex flex-col gap-3">
      <div>
        <label class="block text-xs text-gray-500 mb-1">FEN</label>
        <div class="flex gap-2 items-center">
          <code class="flex-1 break-all text-xs text-gray-300 font-mono">{{ currentFen }}</code>
          <button class="px-2.5 py-1 text-xs border-none rounded font-semibold cursor-pointer bg-btn-bg text-white hover:bg-btn-hover" @click="copyFen">Copy</button>
        </div>
      </div>

      <div>
        <label class="block text-xs text-gray-500 mb-1">PGN</label>
        <div class="flex gap-2 items-center">
          <code class="flex-1 break-all text-xs text-gray-300 font-mono">{{ currentPgn }}</code>
          <button class="px-2.5 py-1 text-xs border-none rounded font-semibold cursor-pointer bg-btn-bg text-white hover:bg-btn-hover" @click="copyPgn">Copy</button>
        </div>
      </div>

      <div>
        <label class="block text-xs text-gray-500 mb-1">Load PGN</label>
        <textarea
          v-model="pgnInput"
          placeholder="Paste PGN here to load..."
          rows="2"
          class="w-full bg-[#1e1e1e] text-gray-300 border border-gray-600 rounded p-2 font-mono text-xs resize-y box-border"
        ></textarea>
        <p v-if="loadError" class="text-xs text-red mt-2 m-0">{{ loadError }}</p>
        <div class="flex gap-2 mt-2">
          <button class="px-3.5 py-2 border-none rounded text-sm font-semibold cursor-pointer bg-btn-bg text-white hover:bg-btn-hover" @click="loadPgn">Load PGN</button>
          <button class="px-3.5 py-2 border-none rounded text-sm font-semibold cursor-pointer bg-btn-bg text-white hover:bg-btn-hover" @click="showPgn = false">Close</button>
        </div>
      </div>
    </div>

    <ChessBoard ref="boardRef" />
  </div>
</template>

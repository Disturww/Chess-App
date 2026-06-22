<script setup lang="ts">
import { ref, shallowRef, computed, triggerRef, reactive } from "vue";
import { Chess, type Square } from "chess.js";
import ChessSquare from "./ChessSquare.vue";

import wP from "@/assets/pieces/wP.svg";
import wR from "@/assets/pieces/wR.svg";
import wN from "@/assets/pieces/wN.svg";
import wB from "@/assets/pieces/wB.svg";
import wQ from "@/assets/pieces/wQ.svg";
import wK from "@/assets/pieces/wK.svg";

import bP from "@/assets/pieces/bP.svg";
import bR from "@/assets/pieces/bR.svg";
import bN from "@/assets/pieces/bN.svg";
import bB from "@/assets/pieces/bB.svg";
import bQ from "@/assets/pieces/bQ.svg";
import bK from "@/assets/pieces/bK.svg";

const game = ref(new Chess());

const selectedSquare = ref<Square | null>(null);
const legalSquares = shallowRef(new Set<string>());
const captureSquares = shallowRef(new Set<string>());

const cachedTurn = ref<'w' | 'b'>('w');
const cachedCheckmate = ref(false);
const cachedDraw = ref(false);
const cachedCheck = ref(false);

interface CachedMove {
  to: string;
  captured?: string;
}

let movesCache = new Map<string, CachedMove[]>();

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

const pieces = {
  wp: wP,
  wr: wR,
  wn: wN,
  wb: wB,
  wq: wQ,
  wk: wK,

  bp: bP,
  br: bR,
  bn: bN,
  bb: bB,
  bq: bQ,
  bk: bK,
};

const allSquares: Square[] = [];
const isLightMap: Record<string, boolean> = {};
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    const sq = `${files[col]}${8 - row}` as Square;
    allSquares.push(sq);
    isLightMap[sq] = (row + col) % 2 === 1;
  }
}

const piecesBySquare = reactive<Record<string, string | null>>({});

function syncBoard() {
  const board = game.value.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      const sq = `${files[col]}${8 - row}`;
      piecesBySquare[sq] = piece
        ? pieces[`${piece.color}${piece.type}` as keyof typeof pieces]
        : null;
    }
  }
}
syncBoard();

function rebuildMovesCache() {
  const allMoves = game.value.moves({ verbose: true });
  const cache = new Map<string, CachedMove[]>();
  for (const move of allMoves) {
    const from = move.from;
    if (!cache.has(from)) cache.set(from, []);
    cache.get(from)!.push({ to: move.to, captured: move.captured });
  }
  movesCache = cache;

  const inCheck = game.value.isCheck();
  const turn = game.value.turn();

  cachedTurn.value = turn;
  cachedCheck.value = inCheck;
  cachedCheckmate.value = inCheck && allMoves.length === 0;
  cachedDraw.value = !inCheck && allMoves.length === 0;

  if (!cachedCheckmate.value && !cachedDraw.value) {
    cachedDraw.value = game.value.isDraw();
  }
}

rebuildMovesCache();

function selectPiece(square: Square) {
  selectedSquare.value = square;

  const cached = movesCache.get(square) || [];
  const legal = new Set<string>();
  const capture = new Set<string>();
  for (const move of cached) {
    legal.add(move.to);
    if (move.captured) capture.add(move.to);
  }
  legalSquares.value = legal;
  captureSquares.value = capture;
}

function clearSelection() {
  selectedSquare.value = null;
  legalSquares.value = new Set();
  captureSquares.value = new Set();
}

function handleClick(square: Square) {
  const clickedPiece = game.value.get(square);

  if (!selectedSquare.value) {
    if (!clickedPiece) return;

    if (clickedPiece.color !== game.value.turn()) return;

    selectPiece(square);
    return;
  }

  if (
    clickedPiece &&
    clickedPiece.color === game.value.turn()
  ) {
    selectPiece(square);
    return;
  }

  try {
    const move = game.value.move({
      from: selectedSquare.value,
      to: square,
      promotion: "q",
    });

    const pieceKey = `${move.color}${move.promotion || move.piece}` as keyof typeof pieces;
    piecesBySquare[move.from] = null;
    piecesBySquare[move.to] = pieces[pieceKey];

    if (move.flags.includes("e")) {
      const capturedSq = `${move.to[0]}${move.from[1]}`;
      piecesBySquare[capturedSq] = null;
    }

    if (move.flags.includes("k") || move.flags.includes("q")) {
      const rank = move.from[1];
      if (move.flags.includes("k")) {
        piecesBySquare[`h${rank}`] = null;
        piecesBySquare[`f${rank}`] = pieces[`${move.color}r` as keyof typeof pieces];
      } else {
        piecesBySquare[`a${rank}`] = null;
        piecesBySquare[`d${rank}`] = pieces[`${move.color}r` as keyof typeof pieces];
      }
    }

    rebuildMovesCache();
    triggerRef(game);
  } catch {
    clearSelection();
    return;
  }

  clearSelection();
}

function resetGame() {
  game.value = new Chess();
  syncBoard();
  rebuildMovesCache();
  triggerRef(game);
  clearSelection();
}

const moveHistory = computed(() => game.value.history());

const turnText = computed(() =>
  cachedTurn.value === "w"
    ? "White"
    : "Black"
);

const gameStatus = computed(() => {
  if (cachedCheckmate.value) {
    return `Checkmate! ${
      cachedTurn.value === "w"
        ? "Black"
        : "White"
    } wins`;
  }

  if (cachedDraw.value) {
    return "Draw";
  }

  if (cachedCheck.value) {
    return "Check!";
  }

  return "";
});
</script>

<template>
  <div class="container">
    <div class="game-layout">

      <div class="board-section">

        <div class="status-card">
          <h2>{{ turnText }} to move</h2>

          <p
            v-if="gameStatus"
            class="status"
          >
            {{ gameStatus }}
          </p>

          <button @click="resetGame">
            Reset Game
          </button>
        </div>

        <div class="board">
          <ChessSquare
            v-for="sq in allSquares"
            :key="sq"
            :square="sq"
            :is-light="isLightMap[sq]"
            :is-selected="selectedSquare === sq"
            :is-legal="legalSquares.has(sq)"
            :is-capture="captureSquares.has(sq)"
            :piece-src="piecesBySquare[sq] ?? null"
            @square-click="handleClick"
          />
        </div>
      </div>

      <div class="sidebar">
        <h3>Move History</h3>

        <div class="history">
          <div
            v-for="(move, index) in moveHistory"
            :key="index"
            class="history-item"
          >
            {{ index + 1 }}. {{ move }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.container {
  min-height: 100vh;
  background: #262421;
  color: white;

  display: flex;
  justify-content: center;
  align-items: center;

  padding: 24px;
}

.game-layout {
  display: flex;
  gap: 24px;
}

.board-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-card {
  background: #312e2b;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.status {
  color: #81c784;
}

.board {
  display: grid;
  grid-template-columns: repeat(8, 80px);

  border-radius: 12px;
  overflow: hidden;

  box-shadow:
    0 10px 40px rgba(0,0,0,.35),
    0 2px 12px rgba(0,0,0,.2);
}

.sidebar {
  width: 250px;

  background: #312e2b;

  border-radius: 12px;

  padding: 16px;
}

.sidebar h3 {
  margin-top: 0;
}

.history {
  max-height: 650px;
  overflow-y: auto;
}

.history-item {
  padding: 8px;
  border-radius: 6px;
}

.history-item:nth-child(odd) {
  background: rgba(255,255,255,.05);
}

button {
  border: none;

  background: #81c784;

  color: #1b1b1b;

  padding: 10px 16px;

  border-radius: 8px;

  cursor: pointer;

  font-weight: 600;
}

button:hover {
  opacity: .9;
}

@media (max-width: 1000px) {
  .game-layout {
    flex-direction: column;
    align-items: center;
  }

  .sidebar {
    width: 640px;
  }
}

@media (max-width: 700px) {
  .board {
    grid-template-columns: repeat(8, 45px);
  }

  .sidebar {
    width: 100%;
  }
}
</style>
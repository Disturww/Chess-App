<script setup lang="ts">
import { ref, shallowRef, computed, triggerRef, reactive, onUnmounted } from "vue";
import { Chess, type Square } from "chess.js";
import { Engine } from "@/ai/Engine";
import { getOpeningName } from "@/chess/openings";
import { usePreferencesStore } from "@/stores/preferences";
import type { AiLevel, PlayerColor } from "@/stores/preferences";
import ChessSquare from "./ChessSquare.vue";

const prefs = usePreferencesStore();

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
const dragSource = ref<Square | null>(null);

const vsAI = ref(false);
const isAIThinking = ref(false);
let engine: Engine | null = null;
let aiGeneration = 0;

const playerColor = computed(() => prefs.playerColor);
const aiColor = computed<PlayerColor>(() => (prefs.playerColor === "w" ? "b" : "w"));

const movetimeMap: Record<AiLevel, number> = { easy: 100, medium: 500, hard: 2000 };
const aiMovetime = computed(() => movetimeMap[prefs.aiLevel]);

const undoStack = ref<string[]>([]);
const redoStack = ref<string[]>([]);

const lastMoveFrom = ref<Square | null>(null);
const lastMoveTo = ref<Square | null>(null);

const showPromotion = ref(false);
const pendingPromotion = ref<{ from: Square; to: Square } | null>(null);

type TimeMode = 'untimed' | 'blitz' | 'rapid' | 'classical';
const timeMode = ref<TimeMode>('untimed');
const whiteTime = ref(0);
const blackTime = ref(0);
const timedOut = ref<'w' | 'b' | null>(null);
let timerInterval: ReturnType<typeof setInterval> | null = null;
let audioCtx: AudioContext | null = null;

const cachedTurn = ref<'w' | 'b'>('w');
const cachedCheckmate = ref(false);
const cachedDraw = ref(false);
const cachedCheck = ref(false);

const isGameOver = computed(
  () => cachedCheckmate.value || cachedDraw.value || timedOut.value !== null,
);
const canPlayerMove = computed(
  () =>
    !isAIThinking.value &&
    !isGameOver.value &&
    (!vsAI.value || cachedTurn.value === playerColor.value),
);

interface CachedMove {
  to: string;
  captured?: string;
}

let movesCache = new Map<string, CachedMove[]>();

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

const pieces = {
  wp: wP, wr: wR, wn: wN, wb: wB, wq: wQ, wk: wK,
  bp: bP, br: bR, bn: bN, bb: bB, bq: bQ, bk: bK,
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

// --- Annotations ---
interface Arrow { from: Square; to: Square }
interface Circle { square: Square }

const annotations = reactive<{ arrows: Arrow[]; circles: Circle[] }>({ arrows: [], circles: [] });
const lastRightClick = ref<Square | null>(null);
let rightClickTimer: ReturnType<typeof setTimeout> | null = null;

function toggleCircle(sq: Square) {
  const idx = annotations.circles.findIndex(c => c.square === sq);
  if (idx >= 0) annotations.circles.splice(idx, 1);
  else annotations.circles.push({ square: sq });
}

function toggleArrow(from: Square, to: Square) {
  const idx = annotations.arrows.findIndex(a => a.from === from && a.to === to);
  if (idx >= 0) annotations.arrows.splice(idx, 1);
  else annotations.arrows.push({ from, to });
}

function handleRightClick(sq: Square) {
  clearRightClickTimer();
  if (lastRightClick.value) {
    if (lastRightClick.value === sq) {
      toggleCircle(sq);
      lastRightClick.value = null;
    } else {
      toggleArrow(lastRightClick.value, sq);
      lastRightClick.value = null;
    }
  } else {
    lastRightClick.value = sq;
    rightClickTimer = setTimeout(() => { lastRightClick.value = null; }, 1000);
  }
}

function clearRightClickTimer() {
  if (rightClickTimer) { clearTimeout(rightClickTimer); rightClickTimer = null; }
}

function getSvgPos(sq: Square): { x: number; y: number } {
  const idx = displaySquares.value.indexOf(sq);
  return { x: (idx % 8) + 0.5, y: Math.floor(idx / 8) + 0.5 };
}

const openingName = computed(() => getOpeningName(game.value.history()));

// --- End Annotations ---

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
  dragSource.value = null;
  legalSquares.value = new Set();
  captureSquares.value = new Set();
}

function isPromotion(from: Square, to: Square): boolean {
  const piece = game.value.get(from);
  if (!piece || piece.type !== 'p') return false;
  const rank = parseInt(to[1]);
  return piece.color === 'w' ? rank === 8 : rank === 1;
}

function playSound(move: { captured?: string; flags: string }) {
  if (!prefs.soundEnabled) return;
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (move.flags.includes('c')) {
      osc.frequency.value = 500;
      gain.gain.value = 0.1;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    } else {
      osc.frequency.value = 350;
      gain.gain.value = 0.06;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    }
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function flagFall(side: 'w' | 'b') {
  timedOut.value = side;
  stopTimer();
}

function startTimer() {
  if (timeMode.value === 'untimed' || timedOut.value) return;
  stopTimer();
  timerInterval = setInterval(() => {
    if (game.value.isGameOver() || timedOut.value) { stopTimer(); return; }
    if (cachedTurn.value === 'w') {
      if (whiteTime.value > 0) whiteTime.value--;
      if (whiteTime.value === 0) flagFall('w');
    } else {
      if (blackTime.value > 0) blackTime.value--;
      if (blackTime.value === 0) flagFall('b');
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function resetTimer() {
  stopTimer();
  timedOut.value = null;
  const times: Record<TimeMode, number> = { untimed: 0, blitz: 300, rapid: 600, classical: 1800 };
  whiteTime.value = times[timeMode.value];
  blackTime.value = times[timeMode.value];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function setTimeMode(mode: TimeMode) {
  timeMode.value = mode;
  resetTimer();
}

function executeMove(from: Square, to: Square, promotion?: string): boolean {
  if (isGameOver.value) return false;
  saveState();
  try {
    const move = game.value.move({
      from,
      to,
      promotion: promotion || "q",
    });

    lastMoveFrom.value = move.from as Square;
    lastMoveTo.value = move.to as Square;

    playSound(move);

    if (timeMode.value !== 'untimed' && !timerInterval) {
      startTimer();
    }

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
    return false;
  }

  clearSelection();
  return true;
}

function handleClick(square: Square) {
  if (!canPlayerMove.value) return;

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

  if (isPromotion(selectedSquare.value, square)) {
    showPromotionDialog(selectedSquare.value, square);
    return;
  }

  if (executeMove(selectedSquare.value, square)) {
    afterPlayerMove();
  }
}

function handleDragStart(square: Square) {
  if (!canPlayerMove.value) return;

  const piece = game.value.get(square);
  if (!piece) return;
  if (piece.color !== game.value.turn()) return;

  selectPiece(square);
  dragSource.value = square;
}

function handleDrop(square: Square) {
  if (!canPlayerMove.value) return;
  if (!dragSource.value) return;
  if (dragSource.value === square) {
    clearSelection();
    return;
  }

  if (isPromotion(dragSource.value, square)) {
    showPromotionDialog(dragSource.value, square);
    return;
  }

  if (executeMove(dragSource.value, square)) {
    afterPlayerMove();
  }
}

function handleDragEnd() {
  clearSelection();
}

function showPromotionDialog(from: Square, to: Square) {
  pendingPromotion.value = { from, to };
  showPromotion.value = true;
}

function selectPromotion(piece: string) {
  if (!pendingPromotion.value) return;
  if (executeMove(pendingPromotion.value.from, pendingPromotion.value.to, piece)) {
    afterPlayerMove();
  }
  showPromotion.value = false;
  pendingPromotion.value = null;
}

function saveState() {
  undoStack.value.push(game.value.pgn());
  redoStack.value = [];
}

interface LoadOptions {
  resetHistory?: boolean;
  resumeAI?: boolean;
  resumeTimer?: boolean;
}

function loadFromPgn(pgn: string, options: LoadOptions = {}): boolean {
  const { resetHistory = true, resumeAI = false, resumeTimer = false } = options;

  let newGame: Chess;
  try {
    newGame = new Chess();
    newGame.loadPgn(pgn);
  } catch {
    return false;
  }

  game.value = newGame;
  syncBoard();
  rebuildMovesCache();
  triggerRef(game);
  clearSelection();
  if (resetHistory) {
    undoStack.value = [];
    redoStack.value = [];
  }
  lastMoveFrom.value = null;
  lastMoveTo.value = null;
  aiGeneration++;
  isAIThinking.value = false;
  stopTimer();
  timedOut.value = null;

  if (resumeAI && vsAI.value && !isGameOver.value && cachedTurn.value === aiColor.value) {
    triggerAIMove();
  }
  if (resumeTimer && timeMode.value !== 'untimed' && !isGameOver.value) {
    startTimer();
  }
  return true;
}

function turnOfPgn(pgn: string): 'w' | 'b' | null {
  try {
    const probe = new Chess();
    probe.loadPgn(pgn);
    return probe.turn();
  } catch {
    return null;
  }
}

function undo() {
  if (undoStack.value.length === 0) return;

  const current = game.value.pgn();
  let pgn = undoStack.value.pop()!;

  if (vsAI.value) {
    redoStack.value = [current];
    while (undoStack.value.length > 0 && turnOfPgn(pgn) === aiColor.value) {
      pgn = undoStack.value.pop()!;
    }
  } else {
    redoStack.value.push(current);
  }

  const resumeAI = vsAI.value && turnOfPgn(pgn) === aiColor.value;
  loadFromPgn(pgn, { resetHistory: false, resumeAI, resumeTimer: true });
}

function redo() {
  if (redoStack.value.length === 0) return;

  const pgn = redoStack.value.pop()!;
  if (!vsAI.value) undoStack.value.push(game.value.pgn());

  const resumeAI = vsAI.value && turnOfPgn(pgn) === aiColor.value;
  loadFromPgn(pgn, { resetHistory: false, resumeAI, resumeTimer: true });
}

const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);

function afterPlayerMove() {
  if (vsAI.value && !isGameOver.value && cachedTurn.value === aiColor.value) {
    triggerAIMove();
  }
}

async function triggerAIMove() {
  if (!engine || isGameOver.value) return;
  if (cachedTurn.value !== aiColor.value) return;

  const generation = ++aiGeneration;
  isAIThinking.value = true;
  clearSelection();

  try {
    const fen = game.value.fen();
    const uciMove = await engine.getBestMove(fen, aiMovetime.value);

    if (generation !== aiGeneration) return;

    const from = uciMove.slice(0, 2) as Square;
    const to = uciMove.slice(2, 4) as Square;
    const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

    executeMove(from, to, promotion);
  } catch (err) {
    if (generation === aiGeneration) console.error('AI move failed:', err);
  } finally {
    if (generation === aiGeneration) isAIThinking.value = false;
  }
}

function toggleAI() {
  vsAI.value = !vsAI.value;
  if (vsAI.value) {
    engine = new Engine();
    resetGame();
  } else {
    aiGeneration++;
    isAIThinking.value = false;
    engine?.destroy();
    engine = null;
  }
}

function choosePlayerColor(color: PlayerColor) {
  if (prefs.playerColor === color) return;
  prefs.setPlayerColor(color);
  flipped.value = color === 'b';
  if (vsAI.value) resetGame();
}

onUnmounted(() => {
  aiGeneration++;
  engine?.destroy();
  engine = null;
});

function resetGame() {
  aiGeneration++;
  isAIThinking.value = false;
  game.value = new Chess();
  syncBoard();
  rebuildMovesCache();
  triggerRef(game);
  clearSelection();
  undoStack.value = [];
  redoStack.value = [];
  lastMoveFrom.value = null;
  lastMoveTo.value = null;
  resetTimer();
  annotations.arrows = [];
  annotations.circles = [];
  if (vsAI.value && aiColor.value === 'w') triggerAIMove();
}

const pgnHistory = computed(() => {
  const moves = game.value.history();
  const pairs: { num: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }
  return pairs;
});

const flipped = ref(prefs.playerColor === 'b');

const displaySquares = computed(() => {
  if (flipped.value) return [...allSquares].reverse();
  return allSquares;
});

const turnText = computed(() =>
  cachedTurn.value === "w" ? "White" : "Black"
);

const gameStatus = computed(() => {
  if (timedOut.value) {
    return `Timeout! ${timedOut.value === "w" ? "Black" : "White"} wins`;
  }
  if (cachedCheckmate.value) {
    return `Checkmate! ${cachedTurn.value === "w" ? "Black" : "White"} wins`;
  }
  if (cachedDraw.value) return "Draw";
  if (cachedCheck.value) return "Check!";
  return "";
});

const gameResultSymbol = computed(() => {
  if (timedOut.value) return timedOut.value === "w" ? "0–1" : "1–0";
  if (!cachedCheckmate.value && !cachedDraw.value) return "";
  if (cachedDraw.value) return "½–½";
  return cachedTurn.value === "w" ? "0–1" : "1–0";
});

const aiLevels: AiLevel[] = ['easy', 'medium', 'hard'];
const aiLevelLabels: Record<AiLevel, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

const rankLabels = computed(() =>
  Array.from({ length: 8 }, (_, i) => ({
    y: i + 0.5,
    text: flipped.value ? String(i + 1) : String(8 - i),
  }))
);

const fileLabels = computed(() =>
  Array.from({ length: 8 }, (_, i) => ({
    x: i + 0.5,
    text: flipped.value ? files[7 - i] : files[i],
  }))
);

defineExpose({
  getPgn: () => game.value.pgn(),
  getFen: () => game.value.fen(),
  getResult: () => {
    if (timedOut.value) return `${timedOut.value === "w" ? "Black" : "White"} wins on time`;
    if (cachedCheckmate.value) return `Checkmate! ${cachedTurn.value === "w" ? "Black" : "White"} wins`;
    if (cachedDraw.value) return "Draw";
    return "Ongoing";
  },
  loadPgn: (pgn: string) => loadFromPgn(pgn),
});
</script>

<template>
  <div class="min-h-screen text-white flex justify-center items-center p-2 sm:p-6 bg-dark-bg">
    <div class="flex gap-6 max-lg:flex-col max-lg:items-center">

      <div class="flex flex-col gap-4">

        <div class="bg-card-bg rounded-xl p-4 text-center">
          <h2 class="text-lg font-semibold">{{ turnText }} to move</h2>

          <p v-if="gameStatus" class="text-green mt-1 font-semibold">{{ gameStatus }}</p>
          <p v-if="isAIThinking" class="text-yellow italic animate-pulse mt-1">AI is thinking...</p>

          <div v-if="openingName && game.history().length > 0" class="text-xs text-gray-400 mt-1">
            {{ openingName }}
          </div>

          <div v-if="timeMode !== 'untimed'" class="flex gap-2 justify-center mt-2">
            <div
              class="bg-card-bg rounded-lg px-4 py-2 flex flex-col items-center min-w-[100px] border-2 transition-colors"
              :class="cachedTurn === 'b' ? 'border-green' : 'border-transparent'"
            >
              <span class="text-xs text-gray-400">Black</span>
              <span class="text-2xl font-bold tabular-nums" :class="blackTime <= 60 ? 'text-red' : ''">{{ formatTime(blackTime) }}</span>
            </div>
            <div
              class="bg-card-bg rounded-lg px-4 py-2 flex flex-col items-center min-w-[100px] border-2 transition-colors"
              :class="cachedTurn === 'w' ? 'border-green' : 'border-transparent'"
            >
              <span class="text-xs text-gray-400">White</span>
              <span class="text-2xl font-bold tabular-nums" :class="whiteTime <= 60 ? 'text-red' : ''">{{ formatTime(whiteTime) }}</span>
            </div>
          </div>

          <div class="flex gap-1 justify-center mt-2">
            <button
              v-for="mode in ['untimed', 'blitz', 'rapid', 'classical']"
              :key="mode"
              class="px-3 py-1 text-sm rounded font-semibold cursor-pointer border-none"
              :class="timeMode === mode ? 'bg-green text-[#1b1b1b]' : 'bg-btn-bg text-white'"
              @click="setTimeMode(mode as TimeMode)"
            >
              {{ { untimed: '∞', blitz: '5', rapid: '10', classical: '30' }[mode] }}
            </button>
          </div>

          <div class="flex gap-2 justify-center mt-3 flex-wrap">
            <button
              class="border-none bg-green text-[#1b1b1b] px-4 py-2 rounded-lg cursor-pointer font-semibold hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed"
              @click="toggleAI"
            >
              {{ vsAI ? 'Play vs Human' : 'Play vs AI' }}
            </button>

            <template v-if="vsAI">
              <button
                v-for="lvl in aiLevels"
                :key="lvl"
                class="px-3 py-1.5 text-sm rounded font-semibold cursor-pointer border-none"
                :class="prefs.aiLevel === lvl ? 'bg-yellow text-black' : 'bg-btn-bg text-white'"
                @click="prefs.setAiLevel(lvl)"
              >
                {{ aiLevelLabels[lvl] }}
              </button>

              <div class="flex items-center gap-1 text-xs text-gray-400">
                <span class="mr-1">You play:</span>
                <button
                  class="px-2 py-1 text-xs rounded font-semibold cursor-pointer border-none"
                  :class="playerColor === 'w' ? 'bg-green text-[#1b1b1b]' : 'bg-btn-bg text-white'"
                  @click="choosePlayerColor('w')"
                >
                  White
                </button>
                <button
                  class="px-2 py-1 text-xs rounded font-semibold cursor-pointer border-none"
                  :class="playerColor === 'b' ? 'bg-green text-[#1b1b1b]' : 'bg-btn-bg text-white'"
                  @click="choosePlayerColor('b')"
                >
                  Black
                </button>
              </div>
            </template>

            <button
              class="px-2.5 py-1 text-lg leading-none border-none bg-green text-[#1b1b1b] rounded-lg cursor-pointer font-semibold hover:opacity-90"
              @click="flipped = !flipped"
              :title="flipped ? 'White bottom' : 'Black bottom'"
            >
              {{ flipped ? '♔' : '♚' }}
            </button>
            <button
              class="border-none bg-green text-[#1b1b1b] px-4 py-2 rounded-lg cursor-pointer font-semibold hover:opacity-90"
              @click="resetGame"
            >
              Reset Game
            </button>
          </div>
        </div>

        <div class="relative">
          <div
            class="grid grid-cols-8 rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,.35),0_2px_12px_rgba(0,0,0,.2)]"
          >
            <ChessSquare
              v-for="sq in displaySquares"
              :key="sq"
              :square="sq"
              :is-light="isLightMap[sq]"
              :is-selected="selectedSquare === sq"
              :is-legal="legalSquares.has(sq)"
              :is-capture="captureSquares.has(sq)"
              :is-last-move="sq === lastMoveFrom || sq === lastMoveTo"
              :piece-src="piecesBySquare[sq] ?? null"
              @square-click="handleClick"
              @square-drag-start="handleDragStart"
              @square-drop="handleDrop"
              @square-drag-end="handleDragEnd"
              @square-right-click="handleRightClick"
            />
          </div>

          <svg
            class="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 8 8"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker id="arrowhead" markerWidth="0.3" markerHeight="0.3" refX="0.25" refY="0.15" orient="auto-start-reverse">
                <polygon points="0 0, 0.3 0.15, 0 0.3" fill="#2196f3" />
              </marker>
            </defs>

            <line
              v-for="(a, i) in annotations.arrows"
              :key="'a'+i"
              :x1="getSvgPos(a.from).x"
              :y1="getSvgPos(a.from).y"
              :x2="getSvgPos(a.to).x"
              :y2="getSvgPos(a.to).y"
              stroke="#2196f3"
              stroke-width="0.1"
              marker-end="url(#arrowhead)"
              stroke-linecap="round"
            />

            <circle
              v-for="(c, i) in annotations.circles"
              :key="'c'+i"
              :cx="getSvgPos(c.square).x"
              :cy="getSvgPos(c.square).y"
              r="0.38"
              fill="none"
              stroke="#2196f3"
              stroke-width="0.08"
            />

            <text
              v-for="(r, i) in rankLabels"
              :key="'r'+i"
              :x="0.12"
              :y="r.y"
              fill="rgba(0,0,0,0.6)"
              stroke="rgba(255,255,255,0.7)"
              stroke-width="0.06"
              stroke-linejoin="round"
              font-size="0.3"
              font-weight="700"
              text-anchor="start"
              dominant-baseline="central"
              font-family="sans-serif"
            >{{ r.text }}</text>

            <text
              v-for="(f, i) in fileLabels"
              :key="'f'+i"
              :x="f.x"
              :y="7.88"
              fill="rgba(0,0,0,0.6)"
              stroke="rgba(255,255,255,0.7)"
              stroke-width="0.06"
              stroke-linejoin="round"
              font-size="0.3"
              font-weight="700"
              text-anchor="middle"
              dominant-baseline="auto"
              font-family="sans-serif"
            >{{ f.text }}</text>
          </svg>
        </div>

        <div v-if="showPromotion" class="fixed inset-0 bg-black/60 flex justify-center items-center z-50" @click="showPromotion = false">
          <div class="bg-card-bg rounded-xl p-6 text-center" @click.stop>
            <p class="mb-4 text-sm">Promote pawn to:</p>
            <div class="flex gap-3">
              <button
                v-for="p in ['q', 'r', 'b', 'n']"
                :key="p"
                class="flex flex-col items-center gap-2 bg-btn-bg border-2 border-transparent rounded-lg p-3 cursor-pointer text-white text-xs hover:border-green hover:bg-btn-hover"
                @click="selectPromotion(p)"
              >
                <img :src="pieces[`${cachedTurn}p` as keyof typeof pieces]" class="w-12 h-12" />
                <span>{{ { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[p] }}</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      <div class="w-[250px] bg-card-bg rounded-xl p-4 max-lg:w-full">
        <div class="flex items-center justify-between mb-3">
          <h3 class="m-0 text-base font-semibold">Move History</h3>
          <div class="flex gap-1">
            <button
              class="px-3 py-1 text-base leading-none border-none bg-green text-[#1b1b1b] rounded-lg cursor-pointer font-semibold hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed"
              :disabled="!canUndo"
              @click="undo"
              title="Undo (Ctrl+Z)"
            >
              ←
            </button>
            <button
              class="px-3 py-1 text-base leading-none border-none bg-green text-[#1b1b1b] rounded-lg cursor-pointer font-semibold hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed"
              :disabled="!canRedo"
              @click="redo"
              title="Redo (Ctrl+Y)"
            >
              →
            </button>
          </div>
        </div>

        <div class="max-h-[650px] overflow-y-auto">
          <div
            v-for="pair in pgnHistory"
            :key="pair.num"
            class="flex gap-2 px-2 py-1.5 rounded text-sm font-mono odd:bg-white/5"
          >
            <span class="text-gray-500 min-w-[28px]">{{ pair.num }}.</span>
            <span
              class="min-w-[64px]"
              :class="{
                'text-green': pair.white.endsWith('#'),
                'text-yellow': pair.white.endsWith('+') && !pair.white.endsWith('#'),
              }"
            >{{ pair.white }}</span>
            <span
              v-if="pair.black"
              class="min-w-[64px]"
              :class="{
                'text-green': pair.black.endsWith('#'),
                'text-yellow': pair.black.endsWith('+') && !pair.black.endsWith('#'),
              }"
            >{{ pair.black }}</span>
          </div>

          <div v-if="gameResultSymbol" class="text-center text-lg font-bold mt-3 pt-2 border-t border-gray-600">
            {{ gameResultSymbol }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
</style>

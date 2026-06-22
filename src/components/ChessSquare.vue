<script setup lang="ts">
import type { Square } from "chess.js";

defineProps<{
  square: Square;
  isLight: boolean;
  isSelected: boolean;
  isLegal: boolean;
  isCapture: boolean;
  pieceSrc: string | null;
}>();

const emit = defineEmits<{
  squareClick: [square: Square];
}>();
</script>

<template>
  <div
    class="square"
    :class="[
      isLight ? 'light' : 'dark',
      isSelected ? 'selected' : '',
      isLegal ? 'legal' : '',
      isCapture ? 'capture' : '',
    ]"
    @pointerdown="emit('squareClick', square)"
  >
    <img
      v-if="pieceSrc"
      :src="pieceSrc"
      class="piece"
    />
  </div>
</template>

<style scoped>
.square {
  width: 80px;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  cursor: pointer;
}

.light {
  background: #f0d9b5;
}

.dark {
  background: #779556;
}

.selected {
  box-shadow: inset 0 0 0 4px #ffd54f;
}

.legal::after {
  content: "";
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.18);
  position: absolute;
}

.capture::after {
  content: "";
  position: absolute;
  inset: 2px;
  border: 4px solid rgba(255, 60, 60, 0.8);
  border-radius: 50%;
  box-sizing: border-box;
}

.piece {
  width: 68px;
  height: 68px;
  pointer-events: none;
}

.square:hover {
  filter: brightness(1.08);
}

@media (max-width: 700px) {
  .square {
    width: 45px;
    height: 45px;
  }

  .piece {
    width: 38px;
    height: 38px;
  }
}
</style>

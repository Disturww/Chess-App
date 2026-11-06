<script setup lang="ts">
import type { Square } from "chess.js";

const props = defineProps<{
  square: Square;
  isLight: boolean;
  isSelected: boolean;
  isLegal: boolean;
  isCapture: boolean;
  isLastMove: boolean;
  pieceSrc: string | null;
}>();

const emit = defineEmits<{
  squareClick: [square: Square];
  squareDragStart: [square: Square];
  squareDragEnd: [];
  squareDrop: [square: Square];
  squareRightClick: [square: Square];
}>();

function handlePointerDown(event: PointerEvent) {
  if (event.button === 0) emit('squareClick', props.square);
}
</script>

<template>
  <div
    class="w-20 h-20 max-md:w-[42px] max-md:h-[42px] flex items-center justify-center relative cursor-pointer hover:brightness-110"
    :class="[
      isLight ? (isLastMove ? 'bg-last-light' : 'bg-light-square') : (isLastMove ? 'bg-last-dark' : 'bg-dark-square'),
      isSelected ? 'shadow-[inset_0_0_0_4px_#ffd54f]' : '',
      isLegal ? 'legal' : '',
      isCapture ? 'capture' : '',
    ]"
    role="button"
    :aria-label="`Square ${square}${isLegal ? ', legal move' : ''}`"
    @pointerdown="handlePointerDown"
    @contextmenu.prevent="emit('squareRightClick', square)"
    @dragover.prevent
    @drop="emit('squareDrop', square)"
  >
    <img
      v-if="pieceSrc"
      :src="pieceSrc"
      class="w-[68px] h-[68px] max-md:w-[36px] max-md:h-[36px]"
      draggable="true"
      @dragstart="emit('squareDragStart', square)"
      @dragend="emit('squareDragEnd')"
    />
  </div>
</template>

<style scoped>
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
</style>

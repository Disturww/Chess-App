<script setup lang="ts">
import { watchEffect } from 'vue'
import { usePreferencesStore } from '@/stores/preferences'

const prefs = usePreferencesStore()

watchEffect(() => {
  document.documentElement.classList.toggle('dark-mode', prefs.darkMode)
})
</script>

<template>
  <RouterView />
</template>

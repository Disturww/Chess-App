import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwind from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue(), tailwind()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { resolve } from 'path'

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 4200,
  },
  preview: {
    port: 4200,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        interaction: resolve(__dirname, 'interaction.html'),
      },
    },
  },
})

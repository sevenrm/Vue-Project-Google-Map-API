import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import { createHtmlPlugin } from 'vite-plugin-html'
import vue from '@vitejs/plugin-vue'
import * as fs from 'fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const newRelicScriptContnet = mode === 'production' ? `<script>${fs.readFileSync('./public/third-party/new-relic.js', 'utf8')}</script>` : ''

  return {
    plugins: [
      vue(),
      createHtmlPlugin({
        inject: {
          data: {
            env,
            injectScript: newRelicScriptContnet
          }
        }
      })
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    server: {
      open: true,
      port: 3000
    },
    base: env.VITE_BASE_DIRECTORY
  }
})

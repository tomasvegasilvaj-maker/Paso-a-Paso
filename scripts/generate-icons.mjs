// Genera los PNG del ícono a partir de public/icons/tito-icon.svg.
// Uso: node scripts/generate-icons.mjs (necesita Playwright con Chromium instalado).
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const svg = await readFile(new URL('../public/icons/tito-icon.svg', import.meta.url), 'utf8')
const sizes = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, size] of sizes) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  )
  await page.screenshot({ path: new URL(`../public/icons/${name}`, import.meta.url).pathname })
  console.log(`public/icons/${name}`)
}
await browser.close()

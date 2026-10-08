import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const dist = resolve('dist/assets')
const cssFile = readdirSync(dist).find(name => /^index-.*\.css$/.test(name))
const jsFile = readdirSync(dist).find(name => /^index-.*\.js$/.test(name))
if (!cssFile || !jsFile) throw new Error('Build the Vite project before creating standalone HTML.')
const css = readFileSync(join(dist, cssFile), 'utf8').replaceAll('</style', '<\\/style')
const js = readFileSync(join(dist, jsFile), 'utf8').replaceAll('</script', '<\\/script')
if (/\bimport\s*\(/.test(js) || js.includes('import.meta')) throw new Error('The build still has external module imports.')
const output = resolve('..', 'A2A demo 929_数字分身源码改版.html')
writeFileSync(output, `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%232b79b6'/%3E%3Ctext x='32' y='44' font-size='36' text-anchor='middle' fill='white'%3EC%3C/text%3E%3C/svg%3E" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Comac Claw 数字分身配置 Demo" />
  <title>Comac Claw · 数字分身</title>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script type="module">${js}</script>
</body>
</html>`, 'utf8')
console.log(`Standalone HTML: ${output}`)

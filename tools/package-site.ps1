# Builds shareable copies of the site:
#   dist/web/          the site only (+ noindex header) for Netlify / Cloudflare Pages drag-and-drop
#   dist/local/ + zip  the site + start-demo launchers + local server, for viewing without hosting
# Dev-only folders (tools, docs, .claude, sources) stay behind.
# Usage: powershell -ExecutionPolicy Bypass -File tools\package-site.ps1 -Name brand-demo
param([string]$Name = "site-demo")
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$web = Join-Path $dist "web"
$local = Join-Path $dist "local"
$zip = Join-Path $dist "$Name.zip"
foreach ($path in @($web, $local)) { if (Test-Path $path) { Remove-Item $path -Recurse -Force } }
if (Test-Path $zip) { Remove-Item $zip -Force }

$excludeDirs = @("dist", "tools", "docs", ".claude", ".git", "node_modules", "raw", "work", "src")
$excludeFiles = @("*.md", "*.ps1", "*.log", "package.json", "package-lock.json", "start-demo.bat", "start-demo.command", ".gitignore")
robocopy $root $web /E /XD @excludeDirs /XF @excludeFiles /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }
# Concept demos stay out of search engines; delete this header (and the robots meta) for a production launch
"/*`n  X-Robots-Tag: noindex, nofollow" | Set-Content -Path (Join-Path $web "_headers") -Encoding ASCII

robocopy $web $local /E /XF _headers /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }
New-Item -ItemType Directory -Force (Join-Path $local "tools") | Out-Null
Copy-Item (Join-Path $root "tools\serve.ps1") (Join-Path $local "tools") -Force
Copy-Item (Join-Path $root "start-demo.bat"), (Join-Path $root "start-demo.command") $local -Force
@"
HOW TO OPEN
1. Extract the whole archive first (right-click > Extract All). Do not run files from inside the zip.
2. Windows: double-click start-demo.bat. The site opens in your browser. If Windows shows "Windows protected your PC",
   click "More info" > "Run anyway". Keep the black window open while viewing; close it to stop.
   macOS: double-click start-demo.command (needs Python 3), or run: sh start-demo.command
3. Use Chrome or Edge with an internet connection (fonts and libraries load from CDNs).
Opening index.html by double-click does not work: browsers block the site's scripts and 3D models on file://.

КАК ОТКРЫТЬ
1. Сначала распакуйте архив целиком (правой кнопкой > «Извлечь все»). Не запускайте файлы прямо из zip.
2. Windows: дважды кликните start-demo.bat — сайт откроется в браузере. Если Windows покажет «Система Windows защитила
   ваш компьютер», нажмите «Подробнее» > «Выполнить в любом случае». Не закрывайте чёрное окно, пока смотрите сайт.
   macOS: дважды кликните start-demo.command (нужен Python 3) или выполните: sh start-demo.command
3. Откройте в Chrome или Edge, нужен интернет (шрифты и библиотеки грузятся с CDN).
Двойной клик по index.html не сработает: браузеры блокируют скрипты и 3D-модели при открытии файла напрямую.
"@ | Set-Content -Path (Join-Path $local "README - how to open.txt") -Encoding UTF8
Compress-Archive -Path (Join-Path $local "*") -DestinationPath $zip -CompressionLevel Optimal

$mb = { param($p) "{0:N1} MB" -f ((Get-ChildItem $p -Recurse -File -Force | Measure-Object Length -Sum).Sum / 1MB) }
Write-Host ("Web (hosting):  {0}  {1}" -f $web, (& $mb $web))
Write-Host ("Local + zip:    {0}  {1:N1} MB" -f $zip, ((Get-Item $zip).Length / 1MB))
exit 0

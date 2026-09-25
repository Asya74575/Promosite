# Local web server for the AWRIS demo, started by start-demo.bat.
# ES modules, fetch() and 3D models don't load from a double-clicked file (file://), so the site has to be served
# over http. This uses the .NET HttpListener built into Windows PowerShell, so nothing needs to be installed.
param([int]$Port = 5173, [switch]$NoBrowser)

$root = Split-Path -Parent $PSScriptRoot
$types = @{
  ".html" = "text/html; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"; ".mjs" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"; ".json" = "application/json"; ".svg" = "image/svg+xml"; ".ico" = "image/x-icon"
  ".png" = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"; ".webp" = "image/webp"; ".pdf" = "application/pdf"
  ".glb" = "model/gltf-binary"; ".gltf" = "model/gltf+json"; ".bin" = "application/octet-stream"
  ".hdr" = "application/octet-stream"; ".wasm" = "application/wasm"; ".md" = "text/plain; charset=utf-8"
  ".mp4" = "video/mp4"
}

# Take the first free port from 5173 up
$listener = $null
foreach ($p in $Port..($Port + 10)) {
  $candidate = New-Object System.Net.HttpListener
  $candidate.Prefixes.Add("http://localhost:$p/")
  try { $candidate.Start(); $listener = $candidate; $Port = $p; break } catch { $candidate.Close() }
}
if (-not $listener) {
  Write-Host "Could not open a local port between $Port and $($Port + 10)."
  Read-Host "Press Enter to close"
  exit 1
}

$url = "http://localhost:$Port/"
Write-Host ""
Write-Host "  AWRIS demo is running at $url"
Write-Host "  Keep this window open while you view the site. Close it to stop the server."
Write-Host ""
if (-not $NoBrowser) { Start-Process $url }

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $response = $context.Response
  try {
    $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    if ($relative -eq "") { $relative = "index.html" }
    $path = [IO.Path]::GetFullPath((Join-Path $root $relative))
    if (Test-Path $path -PathType Container) { $path = Join-Path $path "index.html" }
    if (-not $path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $path -PathType Leaf)) {
      $response.StatusCode = 404
    } else {
      $ext = [IO.Path]::GetExtension($path).ToLowerInvariant()
      $response.Headers.Add("Cache-Control", "no-store")  # always the current files after an edit, no stale cache
      $response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" }
      $stream = [IO.File]::OpenRead($path)
      try { $response.ContentLength64 = $stream.Length; $stream.CopyTo($response.OutputStream) } finally { $stream.Close() }
    }
  } catch {
    try { $response.StatusCode = 500 } catch { }  # the browser may have dropped the connection
  } finally {
    try { $response.OutputStream.Close() } catch { }
  }
}

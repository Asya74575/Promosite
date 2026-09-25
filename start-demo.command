#!/bin/sh
# Сайт 2 demo on macOS: double-click (or run `sh start-demo.command`) to serve this folder and open the site.
# Opening index.html directly does not work: browsers block the site's scripts and 3D models on file://.
cd "$(dirname "$0")" || exit 1
PORT=5173
if command -v python3 >/dev/null 2>&1; then
  echo "Сайт 2 demo is running at http://localhost:$PORT/ (close this window to stop)"
  (sleep 1 && open "http://localhost:$PORT/") &
  python3 -m http.server "$PORT" --bind 127.0.0.1
else
  echo "Python 3 is needed to run the demo locally: https://www.python.org/downloads/"
  read -r _
fi

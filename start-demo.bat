@echo off
rem Сайт 2 demo: double-click to start a local server and open the site in the browser.
rem (Opening index.html directly does not work: browsers block the site's scripts and 3D models on file://.)
title Сайт 2 demo
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1"

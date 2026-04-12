@echo off
chcp 65001 >nul
echo Corrigindo femaleMatrix e maleMatrix...

cd /d "%~dp0"

:: ─── femaleMatrix ID 61: rdw max 16 → 14.5 ───────────────────────────────────
powershell -Command "(Get-Content femaleMatrix.js -Raw) -replace '(?s)(id: 61,.*?TALASSEMIA MINOR.*?rdw:.*?max: )16(.*?},)', '${1}14.5${2}' | Set-Content femaleMatrix.js -NoNewline"
echo [OK] femaleMatrix ID 61 rdw max 16 -^> 14.5

:: ─── femaleMatrix ID 62: hemoglobina max 13.4 → 11.9 ────────────────────────
powershell -Command "(Get-Content femaleMatrix.js -Raw) -replace '(?s)(id: 62,.*?hemoglobina:.*?max: )13\.4', '${1}11.9' | Set-Content femaleMatrix.js -NoNewline"
echo [OK] femaleMatrix ID 62 hemoglobina max 13.4 -^> 11.9

:: ─── maleMatrix ID 61: rdw max 16 → 14.5 ────────────────────────────────────
powershell -Command "(Get-Content maleMatrix.js -Raw) -replace '(?s)(id: 61,.*?TALASSEMIA MINOR.*?rdw:.*?max: )16(.*?},)', '${1}14.5${2}' | Set-Content maleMatrix.js -NoNewline"
echo [OK] maleMatrix ID 61 rdw max 16 -^> 14.5

echo.
echo === TODAS AS CORREÇÕES APLICADAS ===
echo.
echo Agora rode:
echo   git add . ^&^& git commit -m "fix: thresholds ID61/62" ^&^& git push origin main
echo.
pause

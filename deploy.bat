@echo off
cd /d "%~dp0"
echo ============================================
echo   DijkKruid site uploaden naar de NAS
echo ============================================
echo.
set MISSING=
for %%F in (index.html producten.html privacy.html shop.js catalog.js products.json images fonts) do if not exist "%%F" (
  echo ONTBREEKT in deze map: %%F
  set MISSING=1
)
if defined MISSING (
  echo.
  echo Zet deploy.bat in de map met alle websitebestanden ^(de map DijkKruid-site^).
  pause
  exit /b 1
)
echo Typ het SSH-wachtwoord van de NAS als daarom gevraagd wordt.
echo.
scp -r index.html producten.html privacy.html shop.js catalog.js products.json images fonts sshd@192.168.1.160:/mnt/HD/HD_a2/DijkKruid/
if errorlevel 1 (
  echo.
  echo MISLUKT: lees hierboven de foutmelding.
) else (
  echo.
  echo Klaar! Bekijk de site op http://192.168.1.160:8080/
)
pause

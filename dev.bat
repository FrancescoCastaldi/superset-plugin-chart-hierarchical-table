@echo off
echo ========================================================
echo Starting StratumTree Dev Studio (Superset Explore)
echo ========================================================
if not exist dev-studio\node_modules (
  echo Installing Dev Studio dependencies...
  call npm --prefix dev-studio install
)
call npm --prefix dev-studio run dev

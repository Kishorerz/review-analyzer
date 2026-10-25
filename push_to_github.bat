@echo off
title Push Review Analyzer to GitHub
echo ============================================================
echo   Pushing to https://github.com/Kishorerz/review-analyzer.git
echo ============================================================
echo.
cd /d %~dp0
git branch -M main
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Project pushed successfully to GitHub!
    echo Visit: https://github.com/Kishorerz/review-analyzer
) else (
    echo [NOTE] If repository was not found, please make sure you created
    echo an empty repository named 'review-analyzer' on https://github.com/new
)
echo.
pause

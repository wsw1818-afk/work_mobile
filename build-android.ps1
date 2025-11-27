# EAS Build - Android Production
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "EAS Build - Android Production" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting build process..." -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot

# Generate keystore and build
"y" | npx eas-cli build --platform android --profile production

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Build process completed!" -ForegroundColor Green
Write-Host "Check the build URL above for download link." -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

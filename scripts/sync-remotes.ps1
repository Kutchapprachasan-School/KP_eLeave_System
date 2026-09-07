# Sync Local Branch to Both GitHub Remotes (Origin & School)
param(
    [string]$Branch = "main"
)

Write-Host "Syncing branch '$Branch' to origin and school..." -ForegroundColor Cyan

git push origin $Branch
if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to origin/$Branch" -ForegroundColor Green
} else {
    Write-Host "Failed to push to origin/$Branch" -ForegroundColor Red
}

git push school $Branch
if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to school/$Branch" -ForegroundColor Green
} else {
    Write-Host "Failed to push to school/$Branch" -ForegroundColor Red
}

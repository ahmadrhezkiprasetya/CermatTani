param(
  [ValidateSet('all', 'root', 'web', 'app')]
  [string]$Target = 'all',
  [string]$Branch = 'main',
  [string]$WebUrl = 'https://github.com/ahmadrhezkiprasetya/CermatTani-Web.git',
  [string]$AppUrl = 'https://github.com/ahmadrhezkiprasetya/CermatTani-App.git'
)

$ErrorActionPreference = 'Stop'

# Pastikan remote 'web' dan 'app' sudah terdaftar otomatis
$remotes = git remote
if (-not ($remotes -contains 'web')) {
  Write-Host ">> Menambahkan remote 'web' -> $WebUrl" -ForegroundColor Cyan
  git remote add web $WebUrl
}
if (-not ($remotes -contains 'app')) {
  Write-Host ">> Menambahkan remote 'app' -> $AppUrl" -ForegroundColor Cyan
  git remote add app $AppUrl
}

# Pastikan working tree bersih sebelum push subtree
$dirty = git status --porcelain
if ($dirty) {
  Write-Host "[!] Masih ada perubahan yang belum di-commit:" -ForegroundColor Yellow
  Write-Host $dirty
  Write-Host ""
  Write-Host "Silakan commit terlebih dahulu:" -ForegroundColor Cyan
  Write-Host '  git add .'
  Write-Host '  git commit -m "Update CermatTani"'
  exit 1
}

if ($Target -eq 'all' -or $Target -eq 'root') {
  Write-Host ">> Push repo menyeluruh (origin -> $Branch)..." -ForegroundColor Green
  git push origin $Branch
}

if ($Target -eq 'all' -or $Target -eq 'web') {
  Write-Host ">> Sync folder website/ ke repo khusus Website (web -> $Branch)..." -ForegroundColor Green
  git subtree push --prefix=website web $Branch
}

if ($Target -eq 'all' -or $Target -eq 'app') {
  Write-Host ">> Sync folder applications/ ke repo khusus Mobile App (app -> $Branch)..." -ForegroundColor Green
  git subtree push --prefix=applications app $Branch
}

Write-Host ""
Write-Host "Selesai! Sinkronisasi target '$Target' berhasil." -ForegroundColor Cyan

param(
  [ValidateSet('all', 'root', 'web', 'vercel', 'app')]
  [string]$Target = 'all',
  [string]$Branch = 'main',
  [string]$WebUrl = 'https://github.com/ahmadrhezkiprasetya/cermattani-web.git',
  [string]$VercelUrl = 'https://github.com/ahmadrhezkiprasetya/cermattaniweb.git',
  [string]$AppUrl = 'https://github.com/ahmadrhezkiprasetya/cermattani-app.git'
)

$ErrorActionPreference = 'Stop'

# Pastikan remote 'web', 'vercel', dan 'app' sudah terdaftar otomatis
$remotes = git remote
if (-not ($remotes -contains 'web')) {
  Write-Host ">> Menambahkan remote 'web' -> $WebUrl" -ForegroundColor Cyan
  git remote add web $WebUrl
}
if (-not ($remotes -contains 'vercel')) {
  Write-Host ">> Menambahkan remote 'vercel' -> $VercelUrl" -ForegroundColor Cyan
  git remote add vercel $VercelUrl
}
if (-not ($remotes -contains 'app')) {
  Write-Host ">> Menambahkan remote 'app' -> $AppUrl" -ForegroundColor Cyan
  git remote add app $AppUrl
}

function Sync-SubtreeRemote {
  param(
    [string]$Prefix,
    [string]$RemoteName,
    [string]$BranchName
  )

  git fetch $RemoteName $BranchName | Out-Null
  $localTree = (git rev-parse "HEAD:$Prefix").Trim()
  $remoteHead = (git rev-parse "$RemoteName/$BranchName").Trim()
  $remoteTree = (git rev-parse "$remoteHead^{tree}").Trim()

  if ($localTree -eq $remoteTree) {
    Write-Host "   ($RemoteName/$BranchName sudah sinkron, tidak ada perubahan di $Prefix/)" -ForegroundColor DarkGray
    return
  }

  $commitMsg = (git log -1 --format="%s" HEAD -- $Prefix).Trim()
  if (-not $commitMsg) {
    $commitMsg = (git log -1 --format="%s" HEAD).Trim()
  }

  $newCommit = (git commit-tree $localTree -p $remoteHead -m $commitMsg).Trim()
  git push $RemoteName "${newCommit}:refs/heads/$BranchName"
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
  Sync-SubtreeRemote -Prefix 'website' -RemoteName 'web' -BranchName $Branch
}

if ($Target -eq 'all' -or $Target -eq 'vercel' -or $Target -eq 'web') {
  Write-Host ">> Sync folder website/ ke repo produksi Vercel (vercel -> $Branch)..." -ForegroundColor Green
  Sync-SubtreeRemote -Prefix 'website' -RemoteName 'vercel' -BranchName $Branch
}

if ($Target -eq 'all' -or $Target -eq 'app') {
  Write-Host ">> Sync folder applications/ ke repo khusus Mobile App (app -> $Branch)..." -ForegroundColor Green
  Sync-SubtreeRemote -Prefix 'applications' -RemoteName 'app' -BranchName $Branch
}

Write-Host ""
Write-Host "Selesai! Sinkronisasi target '$Target' berhasil (Vercel otomatis deploy)." -ForegroundColor Cyan

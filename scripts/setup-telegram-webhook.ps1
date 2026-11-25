param(
  [string]$PublicUrl = "https://cermattaniweb.vercel.app",

  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

try {
  $baseUri = [Uri]$PublicUrl
} catch {
  throw "PublicUrl tidak valid. Masukkan URL deployment, misalnya https://cermattani.example.com"
}

if ($baseUri.Scheme -ne "https" -or $baseUri.IsLoopback) {
  throw "Webhook Telegram memerlukan domain publik HTTPS; localhost tidak didukung."
}

$botToken = $env:TELEGRAM_BOT_TOKEN
$webhookSecret = $env:TELEGRAM_WEBHOOK_SECRET

if ((-not $botToken -or -not $webhookSecret) -and (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
  foreach ($line in [System.IO.File]::ReadLines((Resolve-Path -LiteralPath $EnvFile).Path)) {
    if ($line -match '^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.*?)\s*$' -and -not $botToken) {
      $botToken = $Matches[1].Trim()
      if ($botToken.Length -ge 2 -and $botToken.StartsWith('"') -and $botToken.EndsWith('"')) {
        $botToken = $botToken.Substring(1, $botToken.Length - 2)
      } elseif ($botToken.Length -ge 2 -and $botToken.StartsWith("'") -and $botToken.EndsWith("'")) {
        $botToken = $botToken.Substring(1, $botToken.Length - 2)
      }
    }

    if ($line -match '^\s*TELEGRAM_WEBHOOK_SECRET\s*=\s*(.*?)\s*$' -and -not $webhookSecret) {
      $webhookSecret = $Matches[1].Trim()
      if ($webhookSecret.Length -ge 2 -and $webhookSecret.StartsWith('"') -and $webhookSecret.EndsWith('"')) {
        $webhookSecret = $webhookSecret.Substring(1, $webhookSecret.Length - 2)
      } elseif ($webhookSecret.Length -ge 2 -and $webhookSecret.StartsWith("'") -and $webhookSecret.EndsWith("'")) {
        $webhookSecret = $webhookSecret.Substring(1, $webhookSecret.Length - 2)
      }
    }
  }
}

if (-not $botToken) {
  throw "TELEGRAM_BOT_TOKEN tidak ditemukan di environment atau $EnvFile."
}
if (-not $webhookSecret -or $webhookSecret.Length -lt 32 -or $webhookSecret -notmatch '^[A-Za-z0-9_-]+$') {
  throw "TELEGRAM_WEBHOOK_SECRET harus berisi minimal 32 karakter: A-Z, a-z, 0-9, _ atau -."
}

$webhookUrl = $baseUri.AbsoluteUri.TrimEnd("/") + "/api/telegram/webhook"
$statusUrl = $baseUri.AbsoluteUri.TrimEnd("/") + "/api/telegram/status"

try {
  $telegramBot = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/getMe"
} catch {
  throw "Telegram menolak TELEGRAM_BOT_TOKEN dari $EnvFile. Periksa token tanpa membagikannya."
}

if (-not $telegramBot.ok -or -not $telegramBot.result.username) {
  throw "Token bot tidak valid atau Telegram tidak mengembalikan username bot."
}

try {
  $deploymentStatus = Invoke-RestMethod -Uri $statusUrl
} catch {
  throw "Tidak dapat membaca status deployment Vercel. Pastikan $statusUrl dapat dibuka publik."
}

if (-not $deploymentStatus.configured -or -not $deploymentStatus.ok) {
  throw "Vercel belum memiliki TELEGRAM_BOT_TOKEN yang valid. Isi Environment Variables Vercel lalu redeploy."
}

if ($deploymentStatus.username -ne $telegramBot.result.username) {
  throw "Token .env menunjuk ke @$($telegramBot.result.username), tetapi deployment Vercel memakai @$($deploymentStatus.username). Samakan TELEGRAM_BOT_TOKEN di kedua tempat."
}

try {
  $probe = Invoke-WebRequest `
    -Uri $webhookUrl `
    -Method Post `
    -Headers @{ "X-Telegram-Bot-Api-Secret-Token" = $webhookSecret } `
    -ContentType "application/json" `
    -Body '{"update_id":0}'
  $probeStatus = [int]$probe.StatusCode
} catch {
  $probeStatus = 0
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
    $probeStatus = [int]$_.Exception.Response.StatusCode
  }
}

if ($probeStatus -eq 401) {
  throw "Webhook mendapat HTTP 401. Samakan TELEGRAM_WEBHOOK_SECRET di .env dan Vercel; jika Vercel Deployment Protection aktif, izinkan akses publik ke endpoint webhook."
}
if ($probeStatus -eq 503) {
  throw "Webhook dapat dijangkau tetapi konfigurasi Supabase server di Vercel belum lengkap. Periksa SUPABASE_SERVICE_ROLE_KEY lalu redeploy."
}
if ($probeStatus -ne 200) {
  throw "Endpoint webhook di Vercel tidak dapat dijangkau (HTTP $probeStatus). Periksa domain publik dan Vercel Deployment Protection."
}

$payload = @{
  url = $webhookUrl
  secret_token = $webhookSecret
  allowed_updates = @("message")
} | ConvertTo-Json -Compress

try {
  $response = Invoke-RestMethod `
    -Uri "https://api.telegram.org/bot$botToken/setWebhook" `
    -Method Post `
    -ContentType "application/json" `
    -Body $payload
} catch {
  throw "Telegram gagal menerima setWebhook. Periksa token dan koneksi internet; detail request disembunyikan agar token tetap rahasia."
}

if (-not $response.ok -or -not $response.result) {
  throw "Telegram menolak konfigurasi webhook. Periksa token bot dan pastikan endpoint HTTPS dapat diakses publik."
}

$webhookInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/getWebhookInfo"
if (-not $webhookInfo.ok -or $webhookInfo.result.url -ne $webhookUrl) {
  throw "Telegram tidak menyimpan URL webhook yang diharapkan. Periksa getWebhookInfo."
}

Write-Output "Webhook Telegram berhasil didaftarkan ke $webhookUrl"
if ($webhookInfo.result.pending_update_count -gt 0) {
  Write-Warning "$($webhookInfo.result.pending_update_count) update Telegram masih tertunda."
}
if ($webhookInfo.result.last_error_message) {
  Write-Warning "Error terakhir dari Telegram: $($webhookInfo.result.last_error_message)"
}

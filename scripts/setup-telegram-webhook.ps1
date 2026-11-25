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

Write-Output "Webhook Telegram berhasil didaftarkan ke $webhookUrl"

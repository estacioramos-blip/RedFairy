$ErrorActionPreference = 'Stop'
$f = 'src\components\TriagemModal.jsx'
if (-not (Test-Path $f)) { Write-Host 'ERRO: rode na raiz do projeto.'; exit 1 }

$bak = $f + '.mojibak'
if (-not (Test-Path $bak)) { Copy-Item $f $bak }

$utf8 = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
$cp1252 = [System.Text.Encoding]::GetEncoding(1252)
$bytes  = $cp1252.GetBytes($utf8)
$rec    = [System.Text.Encoding]::UTF8.GetString($bytes)

[System.IO.File]::WriteAllText((Resolve-Path $f), $rec, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ("APLICADO. Backup em: $bak")
Write-Host '---'
Write-Host 'Para REVERTER se ficar pior:'
Write-Host ('  copy /Y "' + $bak + '" "' + $f + '"')

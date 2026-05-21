$ErrorActionPreference = 'Stop'
$f = 'src\components\TriagemResultadoModal.jsx'
if (-not (Test-Path $f)) { Write-Host 'ERRO: rode na raiz do projeto.'; exit 1 }

$bak = $f + '.mojibak'
if (-not (Test-Path $bak)) { Copy-Item $f $bak }

$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# Cada par: $old (mojibake) -> $new (correto). So usamos [char]0xNNNN dentro de strings,
# NUNCA caracteres nao-ASCII fora delas (nem em comentarios).
$pares = New-Object System.Collections.Generic.List[object]

function AddPair($oldChars, $newChars, $label) {
  $old = -join ($oldChars | ForEach-Object { [char]$_ })
  $new = -join ($newChars | ForEach-Object { [char]$_ })
  $script:pares.Add(@{ old=$old; new=$new; label=$label })
}

# MULTI-CHAR primeiro
AddPair @(0x00C3,0x2021,0x00C3,0x0192)  @(0x00C7,0x00C3)  'CapC-Til (CA-tilde)'
AddPair @(0x00C3,0x2021,0x00C3,0x2022)  @(0x00C7,0x00D5)  'CapC-O-til'
AddPair @(0x00C3,0x00A7,0x00C3,0x00A3)  @(0x00E7,0x00E3)  'c-cedilha + a-til'
AddPair @(0x00C3,0x00A7,0x00C3,0x00B5)  @(0x00E7,0x00F5)  'c-cedilha + o-til'

# Emojis
AddPair @(0x00C3,0x00B0,0x0178,0x00A9,0x00BA)  @(0xD83E,0xDE7A)  'stethoscope'
AddPair @(0x00C3,0x00B0,0x0178,0x201D,0x00AC)  @(0xD83D,0xDD2C)  'microscope'

# Simbolos com prefixo a-circ
AddPair @(0x00E2,0x20AC,0x201D)  @(0x2014)  'em-dash'
AddPair @(0x00E2,0x2020,0x2018)  @(0x2191)  'up-arrow'
AddPair @(0x00E2,0x2020,0x201C)  @(0x2193)  'down-arrow'
AddPair @(0x00E2,0x2020,0x2019)  @(0x2192)  'right-arrow'
AddPair @(0x00E2,0x0153,0x201D)  @(0x2713)  'check'
AddPair @(0x00E2,0x0153,0x00A8)  @(0x2728)  'sparkles'
AddPair @(0x00E2,0x0153,0x2026)  @(0x2705)  'green-check'
AddPair @(0x00E2,0x0161,0x00A0,0x00EF,0x00B8)  @(0x26A0,0xFE0F)  'warning'

# Acentos compostos
AddPair @(0x00C3,0x00A1)  @(0x00E1)  'a-acute'
AddPair @(0x00C3,0x00A2)  @(0x00E2)  'a-circ'
AddPair @(0x00C3,0x00A3)  @(0x00E3)  'a-til'
AddPair @(0x00C3,0x00A7)  @(0x00E7)  'c-ced'
AddPair @(0x00C3,0x00A9)  @(0x00E9)  'e-acute'
AddPair @(0x00C3,0x00AA)  @(0x00EA)  'e-circ'
AddPair @(0x00C3,0x00B3)  @(0x00F3)  'o-acute'
AddPair @(0x00C3,0x00BA)  @(0x00FA)  'u-acute'
AddPair @(0x00C3,0x00B5)  @(0x00F5)  'o-til'
AddPair @(0x00C3,0x0089)  @(0x00C9)  'E-acute'
AddPair @(0x00C3,0x0160)  @(0x00CA)  'E-circ'
AddPair @(0x00C3,0x0083)  @(0x00C3)  'A-til'

# 'A-til + espaco' -> 'a-grave + espaco'
AddPair @(0x00C3,0x0020)  @(0x00E0,0x0020)  'a-grave-space'

# Middle dot
AddPair @(0x00C2,0x00B7)  @(0x00B7)  'middle-dot'

# Aplica
$total = 0
foreach ($p in $pares) {
  $count = ([regex]::Matches($c, [regex]::Escape($p.old))).Count
  if ($count -gt 0) {
    $c = $c.Replace($p.old, $p.new)
    Write-Host ("  {0,-18} : {1} ocorr." -f $p.label, $count)
    $total += $count
  }
}

[System.IO.File]::WriteAllText((Resolve-Path $f), $c, (New-Object System.Text.UTF8Encoding($false)))

Write-Host '---'
Write-Host ("TOTAL trocas: $total")

# Recheck
$resto = [regex]::Matches($c, '[^\x00-\x7E]+') | Group-Object Value | Sort-Object Count -Desc | Select-Object -First 15
Write-Host '---'
Write-Host 'SOBRARAM (top 15):'
$resto | ForEach-Object { '  ' + $_.Name + '  count=' + $_.Count } | Write-Host

$ErrorActionPreference = 'Stop'
$f = 'src\components\TriagemResultadoModal.jsx'
if (-not (Test-Path $f)) { Write-Host 'ERRO'; exit 1 }

$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

if ($c.Contains('data_coleta:') -and $c.Contains('data_estimada:')) {
  Write-Host 'JA APLICADO'; exit 1
}

$nl = "`r`n"

# Ancora: a linha 'semanas_gestacao:' do insert (linha 55) - apos ela inserimos os 2 novos campos
$mark = 'semanas_gestacao: inputs.semanas_gestacao ? Math.round(Number(inputs.semanas_gestacao)) : null,'
if (-not $c.Contains($mark)) {
  # versao alternativa sem Math.round (caso fix7 nao tenha sido aplicado nesse arquivo)
  $mark = 'semanas_gestacao: inputs.semanas_gestacao || null,'
}
if (-not $c.Contains($mark)) { Write-Host 'NAO ENCONTROU: linha semanas_gestacao do insert'; exit 1 }

$novo = $mark + $nl + "        data_coleta: inputs.data_coleta || null," + $nl + "        data_estimada: !!inputs.data_estimada,"
$c = $c.Replace($mark, $novo)

[System.IO.File]::WriteAllText((Resolve-Path $f), $c, (New-Object System.Text.UTF8Encoding($false)))

$ok = $c.Contains('data_coleta: inputs.data_coleta') -and $c.Contains('data_estimada: !!inputs.data_estimada')
if ($ok) { Write-Host 'OK (data_coleta + data_estimada no insert)' }
else { Write-Host 'PARCIAL' }

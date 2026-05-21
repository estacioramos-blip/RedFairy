$ErrorActionPreference = 'Stop'
$f = 'src\components\Calculator.jsx'
$c = Get-Content $f -Raw

$o = 'semanas_gestacao: inputs.gestante && inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,'
$n = 'semanas_gestacao: inputs.gestante && inputs.semanas_gestacao ? Math.round(Number(inputs.semanas_gestacao)) : null,'

if (-not $c.Contains($o)) {
  if ($c.Contains($n)) { Write-Host 'JA APLICADO'; exit 0 }
  Write-Host 'NAO ENCONTROU'; exit 1
}
$c = $c.Replace($o, $n)
[System.IO.File]::WriteAllText((Resolve-Path $f), $c, (New-Object System.Text.UTF8Encoding($false)))
Write-Host 'OK (linha 1181 corrigida)'

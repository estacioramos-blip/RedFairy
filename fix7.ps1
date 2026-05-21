$ErrorActionPreference = 'Stop'

function ReplaceOnce($path, $old, $new) {
  $c = Get-Content $path -Raw
  if (-not $c.Contains($old)) { return $false }
  $idx = $c.IndexOf($old)
  $c2 = $c.Substring(0,$idx) + $new + $c.Substring($idx + $old.Length)
  if ($c.Substring($idx + $old.Length).Contains($old)) {
    Write-Host "AVISO: '$old' aparece mais de uma vez em $path - troca s\u00f3 a primeira"
  }
  [System.IO.File]::WriteAllText((Resolve-Path $path), $c2, (New-Object System.Text.UTF8Encoding($false)))
  return $true
}

# ========== A: TriagemModal.jsx - revalidaGestante arredonda na fonte ==========
$f1 = 'src\components\TriagemModal.jsx'
$o1 = 'return { gestanteAtual: true, semanas: Math.round(semanasCalc * 10) / 10, dum };'
$n1 = 'return { gestanteAtual: true, semanas: Math.round(semanasCalc), dum };'
$ok1 = ReplaceOnce $f1 $o1 $n1

# ========== B: TriagemResultadoModal.jsx - insert em triagens ==========
$f2 = 'src\components\TriagemResultadoModal.jsx'
$o2 = 'semanas_gestacao: inputs.semanas_gestacao || null,'
$n2 = 'semanas_gestacao: inputs.semanas_gestacao ? Math.round(Number(inputs.semanas_gestacao)) : null,'
$ok2 = ReplaceOnce $f2 $o2 $n2

# ========== C: Calculator.jsx - dois inserts (linhas 1181 e 1459) ==========
# Mesmo padrao em ambos: trocamos TODAS as ocorrencias exatas
$f3 = 'src\components\Calculator.jsx'
$o3 = 'semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,'
$n3 = 'semanas_gestacao: inputs.semanas_gestacao ? Math.round(Number(inputs.semanas_gestacao)) : null,'
$c3 = Get-Content $f3 -Raw
$count = ([regex]::Matches($c3, [regex]::Escape($o3))).Count
if ($count -gt 0) {
  $c3 = $c3.Replace($o3, $n3)
  [System.IO.File]::WriteAllText((Resolve-Path $f3), $c3, (New-Object System.Text.UTF8Encoding($false)))
}
$ok3 = ($count -gt 0)

Write-Host ("Trocas: TriagemModal=$ok1  TriagemResultadoModal=$ok2  Calculator=$count ocorr.")
if ($ok1 -and $ok2 -and $count -ge 1) { Write-Host 'OK (semanas_gestacao arredondado na fonte + inserts)' }
else { Write-Host 'PARCIAL: verificar acima' }

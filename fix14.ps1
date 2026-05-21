$ErrorActionPreference = 'Stop'
$f = 'src\components\TriagemResultadoModal.jsx'
if (-not (Test-Path $f)) { Write-Host 'ERRO'; exit 1 }

$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# Ancora unica do botao da limite3 (modo medico): className com bg-red-900 hover:bg-red-950
$mark = 'className="w-full py-3 rounded-xl bg-red-900 hover:bg-red-950 text-white font-bold transition-colors text-sm">'
$i = $c.IndexOf($mark)
if ($i -lt 0) { Write-Host 'NAO ENCONTROU: ancora do botao limite3'; exit 1 }

$alvo = $mark + "`r`n                  Voltar`r`n                </button>"
if (-not $c.Contains($alvo)) { Write-Host 'NAO ENCONTROU: padrao Voltar apos ancora'; exit 1 }

$novo = $alvo.Replace('Voltar', 'Continuar')
$c2 = $c.Replace($alvo, $novo)
[System.IO.File]::WriteAllText((Resolve-Path $f), $c2, (New-Object System.Text.UTF8Encoding($false)))
Write-Host 'OK: Voltar -> Continuar na tela limite3 (linha 223)'

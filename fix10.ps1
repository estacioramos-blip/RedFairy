$ErrorActionPreference = 'Stop'
$f = 'src\components\TriagemModal.jsx'
if (-not (Test-Path $f)) { Write-Host 'ERRO: rode na raiz do projeto.'; exit 1 }

$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

$mark = 'aria-label="Fechar" className="absolute top-2 right-2'
$i = $c.IndexOf($mark)
if ($i -lt 0) { Write-Host 'NAO ENCONTROU: botao Fechar'; exit 1 }

$gt = $c.IndexOf('>', $i)
$btnEnd = $c.IndexOf('</button>', $gt)
if ($gt -lt 0 -or $btnEnd -lt 0) { Write-Host 'NAO ENCONTROU: limites do botao'; exit 1 }

# Caractere X (U+2715) literal, sem depender de interpretacao de escape
$xChar = [char]0x2715

$novoConteudo = '{"' + $xChar + '"}'
$c2 = $c.Substring(0, $gt + 1) + $novoConteudo + $c.Substring($btnEnd)

[System.IO.File]::WriteAllText((Resolve-Path $f), $c2, (New-Object System.Text.UTF8Encoding($false)))

# Verifica relendo
$c3 = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
$alvo = '>{"' + $xChar + '"}</button>'
if ($c3.Contains($alvo)) {
  Write-Host ('OK: botao Fechar agora tem U+2715 (' + $xChar + ')')
} else {
  Write-Host 'AVISO: substituicao feita mas verificacao nao casou (rever manualmente)'
}

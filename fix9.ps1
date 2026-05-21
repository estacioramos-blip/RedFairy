$ErrorActionPreference = 'Stop'
$f = 'src\components\TriagemModal.jsx'
if (-not (Test-Path $f)) { Write-Host 'ERRO: rode na raiz do projeto.'; exit 1 }

$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# Ancora unica do botao Fechar do TriagemModal
$mark = 'aria-label="Fechar" className="absolute top-2 right-2'
$i = $c.IndexOf($mark)
if ($i -lt 0) { Write-Host 'NAO ENCONTROU: botao Fechar'; exit 1 }

# A partir da ancora, achar o '>' que abre o conteudo do botao, e o '</button>' que fecha
$gt = $c.IndexOf('>', $i)
$btnEnd = $c.IndexOf('</button>', $gt)
if ($gt -lt 0 -or $btnEnd -lt 0) { Write-Host 'NAO ENCONTROU: limites do botao'; exit 1 }

# Substitui o conteudo do botao pelo X limpo em string JS
$conteudoNovo = '{"\u2715"}'
$c2 = $c.Substring(0, $gt + 1) + $conteudoNovo + $c.Substring($btnEnd)

[System.IO.File]::WriteAllText((Resolve-Path $f), $c2, (New-Object System.Text.UTF8Encoding($false)))

# Verifica
$c3 = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
if ($c3.Contains('aria-label="Fechar" className="absolute top-2 right-2') -and $c3.Contains('{"\u2715"}</button>')) {
  Write-Host 'OK: botao Fechar do TriagemModal limpo'
} else {
  Write-Host 'AVISO: verificar manualmente'
}

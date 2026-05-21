$ErrorActionPreference = 'Stop'
$f = 'src\components\TriagemModal.jsx'
if (-not (Test-Path $f)) { Write-Host 'ERRO: rode na raiz do projeto.'; exit 1 }

$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# Localiza o botao Fechar inteiro: do '<button' ate '</button>'
$mark = 'aria-label="Fechar"'
$i = $c.IndexOf($mark)
if ($i -lt 0) { Write-Host 'NAO ENCONTROU: botao Fechar'; exit 1 }

$btnOpen = $c.LastIndexOf('<button', $i)
$btnEnd = $c.IndexOf('</button>', $i)
if ($btnOpen -lt 0 -or $btnEnd -lt 0) { Write-Host 'NAO ENCONTROU: limites do botao'; exit 1 }
$btnEndFull = $btnEnd + '</button>'.Length

# X "bonito" U+2715 + style com font-family fallback
$xChar = [char]0x2715
$novoBotao = '<button onClick={onFechar} aria-label="Fechar" ' +
             'className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-red-700 hover:bg-red-800 text-white text-sm flex items-center justify-center transition-colors shadow-md" ' +
             'style={{ fontFamily: ' + "'" + 'Apple Color Emoji, Segoe UI Symbol, Noto Sans Symbols, sans-serif' + "'" + ', lineHeight: 1 }}>{"' + $xChar + '"}</button>'

$c2 = $c.Substring(0, $btnOpen) + $novoBotao + $c.Substring($btnEndFull)

[System.IO.File]::WriteAllText((Resolve-Path $f), $c2, (New-Object System.Text.UTF8Encoding($false)))

$c3 = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
if ($c3.Contains('aria-label="Fechar"') -and $c3.Contains('{"' + $xChar + '"}</button>')) {
  Write-Host ('OK: botao Fechar reescrito com ' + $xChar + ' + fontFamily fallback')
} else {
  Write-Host 'AVISO: rever manualmente'
}

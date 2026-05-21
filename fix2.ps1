$ErrorActionPreference = 'Stop'
$f = 'src\components\TriagemModal.jsx'

if (-not (Test-Path $f)) { Write-Host 'ERRO: arquivo nao encontrado. Rode na raiz do projeto.'; exit 1 }

$c = Get-Content $f -Raw

# --- Troca 1: titulo do alerta (texto solto -> string JS) ---
$o1 = '    \ud83d\uded1 Limite de triagens gratuitas atingido'
$n1 = '    {"\ud83d\uded1 Limite de triagens gratuitas atingido"}'

# --- Troca 2: paragrafo do corpo (texto solto com \u -> strings JS + <strong>) ---
$i = $c.IndexOf('Para continuar avaliando a evolu')
if ($i -lt 0) { Write-Host 'NAO ENCONTROU: paragrafo do corpo'; exit 1 }
$j = $c.IndexOf('</p>', $i)
if ($j -lt 0) { Write-Host 'NAO ENCONTROU: fechamento </p>'; exit 1 }
$bloco = $c.Substring($i, $j - $i)

$novo = '{"Para continuar avaliando a evolu\u00e7\u00e3o desse paciente, oriente-o a se "}<strong>CADASTRAR</strong>{" no RedFairy para receber gratuitamente um primeiro pedido de exames (Hemograma + Ferritina + Satura\u00e7\u00e3o da Transferrina). E se voc\u00ea ainda n\u00e3o \u00e9 "}<strong>AFILIADO</strong>{", se filie para ter acesso aos benef\u00edcios do Programa."}
                  '

$okTitulo = $c.Contains($o1)

$c = $c.Replace($o1, $n1).Replace($bloco, $novo)

[System.IO.File]::WriteAllText((Resolve-Path $f), $c, (New-Object System.Text.UTF8Encoding($false)))

if ($okTitulo -and $c.Contains($novo)) {
    Write-Host 'OK trocado (titulo + paragrafo)'
} elseif ($c.Contains($novo)) {
    Write-Host 'PARCIAL: paragrafo OK, titulo NAO encontrado (verificar)'
} else {
    Write-Host 'NAO ENCONTROU: nada trocado'
}

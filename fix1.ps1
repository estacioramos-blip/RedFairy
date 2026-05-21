$f = 'src\components\TriagemResultadoModal.jsx' 
$c = Get-Content $f -Raw 
$old = "              Voltar`r`n            </button>" 
$new = "              Continuar`r`n            </button>" 
if ($c.Contains($old)) { Set-Content $f ($c.Replace($old,$new)) -NoNewline; 'OK trocado' } else { 'NAO ENCONTROU' } 

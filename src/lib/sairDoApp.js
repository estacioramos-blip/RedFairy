// Saída padrão dos painéis (SAIR/DESLOGAR/X): no PWA aberto pelo ÍCONE fecha o
// app DE VERDADE (window.close funciona: o app vive numa única entrada de
// histórico); num navegador comum o close é bloqueado e o fallback navega pro
// bariatrico.net. Evita a "landing fantasma": navegar pro site externo DENTRO
// do PWA abria uma aba sobreposta cujo X devolvia o app congelado na cortina
// preta ('saindo' restaurado pelo bfcache).
export function sairDoApp() {
  try { window.close() } catch (e) {}
  // Se o close foi bloqueado (aba de navegador), sai navegando.
  setTimeout(() => { try { window.location.replace('https://bariatrico.net') } catch (e) {} }, 180)
}

// Evita open redirect: só aceita caminhos internos.
export function destinoSeguro(valor: unknown, padrao = "/painel") {
  if (typeof valor !== "string") return padrao;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return padrao;
  return valor;
}

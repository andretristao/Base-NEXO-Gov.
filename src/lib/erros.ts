function frase(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1) + ".";
}

// Traduz erros do Postgres/PostgREST para mensagens de tela.
// As exceções das funções do banco já vêm em português.
export function mensagemErro(erro: { code?: string; message: string }) {
  const doBanco = !erro.message.startsWith("permission denied")
    && !erro.message.includes("row-level security")
    && !erro.message.startsWith("duplicate key")
    && !erro.message.includes("foreign key")
    && !erro.message.includes("violates check constraint");

  switch (erro.code) {
    case "23503":
      return "Este registro está em uso. Desative-o em vez de excluir.";
    case "23505":
      return doBanco ? frase(erro.message) : "Já existe um registro com esse nome ou sigla.";
    case "42501":
      return doBanco
        ? frase(erro.message)
        : "Sem permissão para esta ação. Confira seu perfil e se a sessão está validada com 2FA.";
    case "23514":
      return doBanco ? frase(erro.message) : "Preencha todos os campos obrigatórios.";
    case "P0002":
      return frase(erro.message);
    default:
      return erro.message;
  }
}

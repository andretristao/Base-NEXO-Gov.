// Tipos, rótulos e formatações do módulo Protocolo e Processo Legislativo.
// Sem dependências de servidor: usado também pelo seed.

export type CategoriaDocumento = "administrativo" | "proposicao" | "ato" | "ata";
export type NaturezaEtapa = "andamento" | "conclusao" | "arquivamento";
export type TipoSessao = "ordinaria" | "extraordinaria" | "solene" | "especial";
export type SituacaoSessao = "agendada" | "realizada" | "cancelada";
export type ResultadoPauta = "lido" | "aprovado" | "rejeitado" | "adiado" | "retirado" | "vista";

export type Setor = { id: string; nome: string; sigla: string; ativo: boolean };
export type Fluxo = { id: string; nome: string; descricao: string | null };
export type Etapa = {
  id: string;
  fluxo_id: string;
  nome: string;
  ordem: number;
  natureza: NaturezaEtapa;
  setor_id: string | null;
};
export type TipoDocumento = {
  id: string;
  nome: string;
  sigla: string;
  categoria: CategoriaDocumento;
  fluxo_id: string;
  publico: boolean;
  ativo: boolean;
};
export type FaseSessao = { id: string; nome: string; ordem: number; ativo: boolean };

export const rotuloCategoria: Record<CategoriaDocumento, string> = {
  administrativo: "Administrativo",
  proposicao: "Proposição legislativa",
  ato: "Ato normativo",
  ata: "Ata",
};

export const rotuloNatureza: Record<NaturezaEtapa, string> = {
  andamento: "Em andamento",
  conclusao: "Conclusão (publica)",
  arquivamento: "Arquivamento",
};

export const rotuloTipoSessao: Record<TipoSessao, string> = {
  ordinaria: "Ordinária",
  extraordinaria: "Extraordinária",
  solene: "Solene",
  especial: "Especial",
};

export const rotuloSituacaoSessao: Record<SituacaoSessao, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export const rotuloResultado: Record<ResultadoPauta, string> = {
  lido: "Lido",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  adiado: "Adiado",
  retirado: "Retirado de pauta",
  vista: "Pedido de vista",
};

// "PL nº 12/2026"
export function identificacao(sigla: string, numero: number, ano: number) {
  return `${sigla} nº ${numero}/${ano}`;
}

// "3ª Sessão Ordinária de 2026"
export function nomeSessao(tipo: TipoSessao, numero: number, ano: number) {
  return `${numero}ª Sessão ${rotuloTipoSessao[tipo]} de ${ano}`;
}

const FUSO = "America/Sao_Paulo";

export function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: FUSO }).format(new Date(iso));
}

export function formatarDataHora(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO }).format(new Date(iso));
}

export function formatarDataExtenso(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: FUSO }).format(new Date(iso));
}

export function formatarHora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: FUSO }).format(new Date(iso));
}

// Valores para <input type="date"> e <input type="time"> no horário de Brasília.
export function partesDataHora(iso: string) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: FUSO,
    }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}

// Brasília não tem horário de verão desde 2019.
export function montarDataHora(data: string, hora: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora)) return null;
  return `${data}T${hora}:00-03:00`;
}

export function formatarTamanho(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

// Situação resumida para listas e selos.
export function situacaoDocumento(d: { publicado_em: string | null; arquivado_em: string | null }) {
  if (d.arquivado_em) return "Arquivado";
  if (d.publicado_em) return "Concluído";
  return "Em tramitação";
}

export type ItemAta = {
  fase: string;
  descricao: string;
  resultado: ResultadoPauta | null;
};

// Minuta da ata a partir da pauta. A secretaria revisa o texto antes de tramitar.
export function minutaAta(orgao: { nome: string; municipio: string; uf: string }, sessao: {
  tipo: TipoSessao;
  numero: number;
  ano: number;
  data_hora: string;
  local: string | null;
  observacoes: string | null;
}, itens: ItemAta[]) {
  const titulo = `Ata da ${nomeSessao(sessao.tipo, sessao.numero, sessao.ano)}`;
  const linhas = [
    titulo.toUpperCase(),
    "",
    `Aos ${formatarDataExtenso(sessao.data_hora)}, às ${formatarHora(sessao.data_hora)}, ` +
      `${sessao.local ? `no ${sessao.local}` : "em sua sede"}, ` +
      `reuniu-se a ${orgao.nome}, em ${orgao.municipio}/${orgao.uf}, para a ${nomeSessao(sessao.tipo, sessao.numero, sessao.ano)}.`,
  ];

  const fases: string[] = [];
  for (const item of itens) if (!fases.includes(item.fase)) fases.push(item.fase);
  for (const fase of fases) {
    linhas.push("", fase.toUpperCase());
    for (const item of itens.filter((i) => i.fase === fase)) {
      linhas.push(`- ${item.descricao}${item.resultado ? `: ${rotuloResultado[item.resultado].toLowerCase()}.` : "."}`);
    }
  }
  if (sessao.observacoes) linhas.push("", sessao.observacoes);
  linhas.push(
    "",
    "Nada mais havendo a tratar, o Presidente declarou encerrada a sessão, da qual foi lavrada a presente ata " +
      "que, lida e aprovada, vai assinada pela Mesa Diretora.",
  );
  return { titulo, texto: linhas.join("\n") };
}

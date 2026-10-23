import type { NomeIcone } from "@/components/Icone";
import type { Orgao } from "@/lib/tipos";

export type Servico = {
  caminho: string;
  titulo: string;
  texto: string;
  icone: NomeIcone;
  // false: módulo ainda não contratado/entregue; aparece como "Em breve", sem link
  disponivel: boolean;
  // palavras extras para a busca do portal
  termos?: string;
};

// Catálogo de serviços do portal público. Usado na home, no menu, no rodapé e na busca.
export function servicosDoOrgao(orgao: Pick<Orgao, "tipo">): Servico[] {
  const camara = orgao.tipo === "camara";
  return [
    ...(camara
      ? [{
          caminho: "sessoes", titulo: "Sessões plenárias", texto: "Pautas, resultados das votações e atas.",
          icone: "sessao" as const, disponivel: true, termos: "plenário pauta votação ata vereadores",
        }]
      : []),
    {
      caminho: "documentos",
      titulo: camara ? "Proposições e atos" : "Atos publicados",
      texto: camara ? "Projetos de lei, requerimentos, indicações, moções e atas." : "Decretos, portarias e demais atos oficiais.",
      icone: "documento", disponivel: true, termos: "lei projeto decreto portaria requerimento moção indicação",
    },
    {
      caminho: "protocolo", titulo: "Consulta de protocolo", texto: "Acompanhe a tramitação de um documento pelo número.",
      icone: "protocolo", disponivel: true, termos: "processo tramitação andamento ofício",
    },
    {
      caminho: "diario-oficial", titulo: "Diário Oficial", texto: "Edições, atos oficiais e busca por publicações.",
      icone: "diario", disponivel: false, termos: "edição publicação",
    },
    {
      caminho: "transparencia", titulo: "Portal da Transparência", texto: "Receitas, despesas, licitações, contratos e pessoal.",
      icone: "transparencia", disponivel: false, termos: "licitação contrato despesa receita salário servidores",
    },
    {
      caminho: "ouvidoria", titulo: "Ouvidoria", texto: "Reclamações, sugestões, elogios e denúncias.",
      icone: "ouvidoria", disponivel: false, termos: "reclamação denúncia sugestão elogio",
    },
    {
      caminho: "e-sic", titulo: "e-SIC", texto: "Pedidos de acesso à informação (Lei 12.527/2011).",
      icone: "informacao", disponivel: false, termos: "lai acesso à informação pedido",
    },
  ];
}

// Busca sem acento e sem caixa: "licitacao" encontra "Licitação".
export function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

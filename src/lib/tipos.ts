export type TipoOrgao = "prefeitura" | "camara" | "conselho" | "autarquia" | "consorcio";

export type Papel = "administrador" | "gestor" | "editor" | "consulta";

export type Orgao = {
  id: string;
  slug: string;
  nome: string;
  nome_curto: string | null;
  tipo: TipoOrgao;
  cnpj: string | null;
  uf: string;
  municipio: string;
  codigo_ibge: string | null;
  endereco: string | null;
  telefone: string | null;
  email_contato: string | null;
  encarregado_nome: string | null;
  encarregado_email: string | null;
  brasao_url: string | null;
  cor_primaria: string;
  dominio: string | null;
  exigir_2fa: boolean;
  ativo: boolean;
};

export const rotuloPapel: Record<Papel, string> = {
  administrador: "Administrador",
  gestor: "Gestor",
  editor: "Editor",
  consulta: "Consulta",
};

export const rotuloTipo: Record<TipoOrgao, string> = {
  prefeitura: "Prefeitura",
  camara: "Câmara Municipal",
  conselho: "Conselho",
  autarquia: "Autarquia",
  consorcio: "Consórcio",
};

export function formatarCnpj(cnpj: string | null) {
  if (!cnpj) return null;
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

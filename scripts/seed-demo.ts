// Cria órgãos e usuários fictícios para demonstração e POC.
// Uso: npm run seed:demo   (lê .env.local; precisa de SUPABASE_SECRET_KEY)
import { createClient } from "@supabase/supabase-js";
import { minutaAta, type ItemAta, type ResultadoPauta } from "../src/lib/protocolo";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const senha = process.env.DEMO_PASSWORD;
const superadminEmail = process.env.SEED_SUPERADMIN_EMAIL?.toLowerCase();
const dominio = process.env.DEMO_EMAIL_DOMAIN ?? "demo.nexoprojetosdesign.com.br";

if (!url || !chave) throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local");
if (!senha || senha.length < 12) throw new Error("Defina DEMO_PASSWORD com pelo menos 12 caracteres");

const supabase = createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } });

// CNPJs fictícios (prefixo 99, dígitos verificadores válidos).
const orgaos = [
  {
    slug: "vila-esperanca",
    nome: "Prefeitura Municipal de Vila Esperança",
    nome_curto: "Prefeitura de Vila Esperança",
    tipo: "prefeitura",
    cnpj: "99000001000101",
    uf: "MG",
    municipio: "Vila Esperança",
    endereco: "Praça da Matriz, 100, Centro, Vila Esperança/MG, CEP 39999-000",
    telefone: "(38) 3999-1000",
    email_contato: `contato@${dominio}`,
    encarregado_nome: "Mariana Duarte (fictício)",
    encarregado_email: `lgpd@${dominio}`,
    cor_primaria: "#0c4a6e",
  },
  {
    slug: "camara-vila-esperanca",
    nome: "Câmara Municipal de Vila Esperança",
    nome_curto: "Câmara de Vila Esperança",
    tipo: "camara",
    cnpj: "99000002000148",
    uf: "MG",
    municipio: "Vila Esperança",
    endereco: "Rua das Flores, 45, Centro, Vila Esperança/MG, CEP 39999-010",
    telefone: "(38) 3999-2000",
    email_contato: `camara@${dominio}`,
    encarregado_nome: "Paulo Henrique Lima (fictício)",
    encarregado_email: `lgpd.camara@${dominio}`,
    cor_primaria: "#7c2d12",
  },
] as const;

const pessoas = [
  { email: `admin@${dominio}`, nome: "Ana Administradora", vinculos: { "vila-esperanca": "administrador", "camara-vila-esperanca": "administrador" } },
  { email: `gestor@${dominio}`, nome: "Gustavo Gestor", vinculos: { "vila-esperanca": "gestor" } },
  { email: `editor@${dominio}`, nome: "Eduarda Editora", vinculos: { "vila-esperanca": "editor", "camara-vila-esperanca": "editor" } },
  { email: `presidente@${dominio}`, nome: "Paulo Presidente", vinculos: { "camara-vila-esperanca": "gestor" } },
  { email: `controle@${dominio}`, nome: "Carlos Controle Interno", vinculos: { "vila-esperanca": "consulta" } },
] as const;

async function garantirUsuario(email: string, nome: string, comSenha: boolean) {
  const { data: existente } = await supabase.from("usuarios").select("id").eq("email", email).maybeSingle();
  if (existente) return existente.id as string;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password: comSenha ? senha : undefined,
    user_metadata: { nome },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const { data: criados, error } = await supabase
    .from("orgaos")
    .upsert(orgaos, { onConflict: "slug" })
    .select("id, slug");
  if (error) throw error;
  const idPorSlug = new Map(criados.map((o) => [o.slug, o.id as string]));
  console.log(`Órgãos: ${[...idPorSlug.keys()].join(", ")}`);

  for (const p of pessoas) {
    const id = await garantirUsuario(p.email, p.nome, true);
    const linhas = Object.entries(p.vinculos).map(([slug, papel]) => ({
      orgao_id: idPorSlug.get(slug)!,
      usuario_id: id,
      papel,
    }));
    const { error: e } = await supabase.from("membros").upsert(linhas, { onConflict: "orgao_id,usuario_id" });
    if (e) throw e;
    console.log(`Usuário: ${p.email}`);
  }

  for (const o of orgaos) await semearProtocolo(idPorSlug.get(o.slug)!, o);

  if (superadminEmail) {
    const { data: u } = await supabase.from("usuarios").select("id").eq("email", superadminEmail).maybeSingle();
    if (!u) {
      console.log(`Superadmin ${superadminEmail} ainda não tem conta. Crie em Authentication > Users e rode de novo.`);
    } else {
      const { error: e } = await supabase.from("usuarios").update({ superadmin: true }).eq("id", u.id);
      if (e) throw e;
      console.log(`Superadmin: ${superadminEmail}`);
    }
  }

  console.log("\nPronto. Senha dos usuários de demonstração: a definida em DEMO_PASSWORD.");
  console.log("No primeiro acesso, cada um cadastra o autenticador (2FA).");
}

// ---------------------------------------------------------------------------
// Protocolo: modelo padrão, documentos em várias etapas, sessões com pauta e ata
// ---------------------------------------------------------------------------

type Demo = {
  sigla: string;
  assunto: string;
  interessado: string;
  texto: string;
  // etapas por onde o documento passa depois de protocolado, com despacho
  caminho: [string, string][];
};

const demosCamara: Demo[] = [
  {
    sigla: "PL",
    assunto: "Institui o Programa Municipal de Hortas Comunitárias e dá outras providências.",
    interessado: "Vereadora Helena Martins",
    texto: "Art. 1º Fica instituído o Programa Municipal de Hortas Comunitárias, destinado ao cultivo de hortaliças em áreas públicas ociosas.\nArt. 2º O Poder Executivo poderá firmar parcerias com associações de moradores e escolas.\nArt. 3º Esta Lei entra em vigor na data de sua publicação.",
    caminho: [
      ["Leitura no Expediente", "Lido na 1ª Sessão Ordinária."],
      ["Parecer jurídico", "Encaminho à Procuradoria para parecer."],
      ["Comissões", "Parecer favorável. Sem vícios de iniciativa."],
      ["Ordem do Dia", "Comissão de Justiça e Redação aprovou por unanimidade."],
      ["Aprovado e publicado", "Aprovado em turno único. Publique-se."],
    ],
  },
  {
    sigla: "PL",
    assunto: "Denomina Rua Professora Maria do Carmo Souza a via pública conhecida como Rua Projetada 3, no Bairro Esperança.",
    interessado: "Vereador Antônio Ribeiro",
    texto: "Art. 1º Fica denominada Rua Professora Maria do Carmo Souza a via pública conhecida como Rua Projetada 3.\nArt. 2º Esta Lei entra em vigor na data de sua publicação.",
    caminho: [
      ["Leitura no Expediente", "Lido em Plenário."],
      ["Parecer jurídico", "Solicito parecer quanto à documentação biográfica."],
    ],
  },
  {
    sigla: "REQ",
    assunto: "Requer ao Poder Executivo informações sobre o cronograma de manutenção das estradas rurais.",
    interessado: "Vereador Carlos Nogueira",
    texto: "Requeiro, na forma regimental, que seja oficiado ao Prefeito Municipal solicitando o cronograma de manutenção das estradas rurais para o exercício corrente.",
    caminho: [["Leitura no Expediente", "Incluir na pauta da próxima sessão."]],
  },
  {
    sigla: "IND",
    assunto: "Indica a instalação de redutor de velocidade na Rua das Flores, em frente à Escola Municipal Monteiro Lobato.",
    interessado: "Vereadora Helena Martins",
    texto: "Indico ao Poder Executivo, por meio do setor competente, a instalação de redutor de velocidade na Rua das Flores, em frente à escola.",
    caminho: [],
  },
  {
    sigla: "MOC",
    assunto: "Moção de aplauso à equipe da Escola Municipal Monteiro Lobato pelo 1º lugar na Olimpíada Regional de Matemática.",
    interessado: "Mesa Diretora",
    texto: "A Câmara Municipal de Vila Esperança manifesta aplauso aos alunos e professores da Escola Municipal Monteiro Lobato.",
    caminho: [
      ["Leitura no Expediente", "Lida em Plenário."],
      ["Ordem do Dia", "Incluída na Ordem do Dia."],
      ["Aprovado e publicado", "Aprovada por unanimidade."],
    ],
  },
  {
    sigla: "OF",
    assunto: "Encaminha ao Prefeito Municipal o autógrafo do Projeto de Lei das Hortas Comunitárias para sanção.",
    interessado: "Presidência da Câmara",
    texto: "Senhor Prefeito,\nEncaminhamos o autógrafo do Projeto de Lei aprovado em Plenário, para sanção ou veto no prazo legal.",
    caminho: [
      ["Em análise", "Conferir redação final."],
      ["Assinatura", "Para assinatura do Presidente."],
    ],
  },
  {
    sigla: "DA",
    assunto: "Dispõe sobre o expediente da Câmara Municipal no período de recesso parlamentar.",
    interessado: "Presidência da Câmara",
    texto: "Art. 1º Durante o recesso parlamentar, o expediente da Câmara Municipal será das 8h às 13h.\nArt. 2º Este Decreto entra em vigor na data de sua publicação.",
    caminho: [
      ["Em análise", "De acordo."],
      ["Assinatura", "Assinado."],
      ["Expedido", "Publique-se."],
    ],
  },
];

const demosPrefeitura: Demo[] = [
  {
    sigla: "DEC",
    assunto: "Declara ponto facultativo nas repartições públicas municipais no dia 28 de outubro, Dia do Servidor Público.",
    interessado: "Gabinete do Prefeito",
    texto: "Art. 1º Fica declarado ponto facultativo nas repartições públicas municipais no dia 28 de outubro.\nArt. 2º Os serviços essenciais funcionarão normalmente.",
    caminho: [
      ["Em análise", "De acordo."],
      ["Jurídico", "Sem óbices jurídicos."],
      ["Assinatura", "Assinado."],
      ["Publicado", "Publique-se."],
    ],
  },
  {
    sigla: "OF",
    assunto: "Solicita à Secretaria de Estado de Saúde a renovação do convênio de transporte sanitário.",
    interessado: "Secretaria Municipal de Saúde",
    texto: "Senhor Secretário,\nSolicitamos a renovação do convênio de transporte sanitário firmado em 2024.",
    caminho: [["Em análise", "Verificar valores atualizados."]],
  },
  {
    sigla: "PORT",
    assunto: "Designa a comissão de avaliação de bens inservíveis.",
    interessado: "Secretaria de Administração",
    texto: "Art. 1º Ficam designados os servidores abaixo para compor a comissão de avaliação de bens inservíveis.",
    caminho: [["Em análise", "Conferir matrículas."], ["Jurídico", "Para análise."]],
  },
];

async function semearProtocolo(orgaoId: string, orgao: (typeof orgaos)[number]) {
  const { count: tipos } = await supabase.from("tipos_documento").select("*", { count: "exact", head: true }).eq("orgao_id", orgaoId);
  if (!tipos) {
    const { error } = await supabase.rpc("configurar_protocolo_padrao", { p_orgao: orgaoId });
    if (error) throw error;
  }
  const { count: docs } = await supabase.from("documentos").select("*", { count: "exact", head: true }).eq("orgao_id", orgaoId);
  if (docs) {
    console.log(`Protocolo de ${orgao.slug}: já tem documentos, mantido.`);
    return;
  }

  const [{ data: listaTipos }, { data: etapas }] = await Promise.all([
    supabase.from("tipos_documento").select("id, sigla, fluxo_id").eq("orgao_id", orgaoId),
    supabase.from("etapas").select("id, nome, fluxo_id").eq("orgao_id", orgaoId),
  ]);
  const tipoPorSigla = new Map((listaTipos ?? []).map((t) => [t.sigla, t]));
  const idPorAssunto = new Map<string, string>();

  async function protocolar(d: Demo) {
    const tipo = tipoPorSigla.get(d.sigla)!;
    const { data, error } = await supabase
      .from("documentos")
      .insert({ orgao_id: orgaoId, tipo_id: tipo.id, assunto: d.assunto, interessado: d.interessado, texto: d.texto })
      .select("id")
      .single();
    if (error) throw error;
    for (const [nome, despacho] of d.caminho) {
      const etapa = (etapas ?? []).find((e) => e.fluxo_id === tipo.fluxo_id && e.nome === nome)!;
      const { error: e } = await supabase.rpc("tramitar_documento", { p_documento: data.id, p_etapa: etapa.id, p_despacho: despacho });
      if (e) throw e;
    }
    idPorAssunto.set(d.assunto, data.id);
    return data.id as string;
  }

  const camara = orgao.tipo === "camara";
  for (const d of camara ? demosCamara : demosPrefeitura) await protocolar(d);
  console.log(`Protocolo de ${orgao.slug}: ${idPorAssunto.size} documentos de exemplo.`);
  if (!camara) return;

  // Sessões: uma realizada (com ata em tramitação), uma ordinária e uma extraordinária agendadas.
  const { data: fases } = await supabase.from("fases_sessao").select("id, nome, ordem").eq("orgao_id", orgaoId);
  const fase = (nome: string) => fases!.find((f) => f.nome === nome)!;
  const hoje = new Date();
  const emDias = (dias: number, hora: string) => {
    const d = new Date(hoje.getTime() + dias * 86400000);
    return `${d.toISOString().slice(0, 10)}T${hora}:00-03:00`;
  };
  const { data: sessoes, error } = await supabase
    .from("sessoes")
    .insert([
      { orgao_id: orgaoId, tipo: "ordinaria", data_hora: emDias(-7, "19:00"), local: "Plenário Vereador José Alves", situacao: "realizada",
        observacoes: "Presentes os nove vereadores. Presidiu a sessão o Vereador Paulo Henrique Lima." },
      { orgao_id: orgaoId, tipo: "ordinaria", data_hora: emDias(7, "19:00"), local: "Plenário Vereador José Alves", situacao: "agendada", observacoes: null },
      { orgao_id: orgaoId, tipo: "extraordinaria", data_hora: emDias(10, "10:00"), local: "Plenário Vereador José Alves", situacao: "agendada", observacoes: null },
    ])
    .select("id, tipo, numero, ano, data_hora, local, observacoes, situacao");
  if (error) throw error;
  const [realizada, proxima] = sessoes!;

  const pl = demosCamara[0].assunto;
  const moc = demosCamara[4].assunto;
  const req = demosCamara[2].assunto;
  const ind = demosCamara[3].assunto;
  const pauta: { sessao: string; fase: string; descricao: string; documento?: string; resultado?: ResultadoPauta }[] = [
    { sessao: realizada.id, fase: "Expediente", descricao: "PL nº 1/" + realizada.ano + ", da Vereadora Helena Martins: hortas comunitárias", documento: idPorAssunto.get(pl), resultado: "lido" },
    { sessao: realizada.id, fase: "Expediente", descricao: "Moção nº 1/" + realizada.ano + ", da Mesa Diretora: aplauso à E. M. Monteiro Lobato", documento: idPorAssunto.get(moc), resultado: "lido" },
    { sessao: realizada.id, fase: "Tribuna Livre", descricao: "Sra. Joana Pereira, Associação de Moradores do Bairro Esperança: iluminação pública na Avenida Central" },
    { sessao: realizada.id, fase: "Ordem do Dia", descricao: "PL nº 1/" + realizada.ano + ": Programa Municipal de Hortas Comunitárias", documento: idPorAssunto.get(pl), resultado: "aprovado" },
    { sessao: realizada.id, fase: "Ordem do Dia", descricao: "Moção nº 1/" + realizada.ano + ": aplauso à E. M. Monteiro Lobato", documento: idPorAssunto.get(moc), resultado: "aprovado" },
    { sessao: realizada.id, fase: "Explicações Pessoais", descricao: "Vereador Antônio Ribeiro: andamento das obras da Unidade Básica de Saúde" },
    { sessao: proxima.id, fase: "Expediente", descricao: "Requerimento nº 1/" + proxima.ano + ", do Vereador Carlos Nogueira: manutenção das estradas rurais", documento: idPorAssunto.get(req) },
    { sessao: proxima.id, fase: "Expediente", descricao: "Indicação nº 1/" + proxima.ano + ", da Vereadora Helena Martins: redutor de velocidade na Rua das Flores", documento: idPorAssunto.get(ind) },
    { sessao: proxima.id, fase: "Tribuna Livre", descricao: "Sr. Roberto Alves, Sindicato dos Produtores Rurais: escoamento da safra" },
  ];
  const { error: ePauta } = await supabase.from("pauta_itens").insert(
    pauta.map((p, i) => ({
      orgao_id: orgaoId, sessao_id: p.sessao, fase_id: fase(p.fase).id, ordem: i + 1,
      descricao: p.descricao, documento_id: p.documento ?? null, resultado: p.resultado ?? null,
    })),
  );
  if (ePauta) throw ePauta;

  // Ata da sessão realizada, parada na etapa Jurídico para a demonstração.
  const itens: ItemAta[] = pauta
    .filter((p) => p.sessao === realizada.id)
    .sort((a, b) => fase(a.fase).ordem - fase(b.fase).ordem)
    .map((p) => ({ fase: p.fase, descricao: p.descricao, resultado: p.resultado ?? null }));
  const { titulo, texto } = minutaAta(orgao, realizada, itens);
  const ata = await protocolar({
    sigla: "ATA",
    assunto: titulo,
    interessado: "Mesa Diretora",
    texto,
    caminho: [["Análise", "Conferida pela Presidência."], ["Secretaria", "Ajustes de redação feitos."], ["Jurídico", "Para visto jurídico."]],
  });
  const { error: eAta } = await supabase.from("sessoes").update({ ata_documento_id: ata }).eq("id", realizada.id);
  if (eAta) throw eAta;
  console.log(`Sessões de ${orgao.slug}: 3, com pauta e ata.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

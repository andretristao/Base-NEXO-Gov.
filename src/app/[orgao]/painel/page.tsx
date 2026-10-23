import type { Metadata } from "next";
import Link from "next/link";
import { Icone, type NomeIcone } from "@/components/Icone";
import { exigirAcessoOrgao, podeAdministrar } from "@/lib/dal";
import { diasAtras, formatarDataExtenso, formatarHora, nomeSessao, partesDataHora, tempoDecorrido } from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resumo" };

const modulos = [
  { nome: "Protocolo e processo legislativo", situacao: "Disponível" },
  { nome: "Conteúdo do portal", situacao: "Disponível" },
  { nome: "Diário Oficial", situacao: "Em construção" },
  { nome: "Portal da Transparência", situacao: "Em construção" },
  { nome: "Integração PNCP", situacao: "Em construção" },
  { nome: "Cesta de preços", situacao: "Planejado" },
  { nome: "Ouvidoria e e-SIC", situacao: "Planejado" },
];

function Indicador({ rotulo, valor, href, icone, alerta }: {
  rotulo: string;
  valor: number | string;
  href?: string;
  icone: NomeIcone;
  alerta?: boolean;
}) {
  const conteudo = (
    <>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${alerta ? "bg-erro/10 text-erro" : "bg-orgao/10 text-orgao"}`}>
        <Icone nome={icone} />
      </span>
      <span>
        <span className="block text-3xl font-bold leading-none">{valor}</span>
        <span className="mt-1 block text-sm text-texto-suave">{rotulo}</span>
      </span>
    </>
  );
  const classe = "flex h-full items-center gap-4 rounded-lg border border-borda bg-fundo p-4 text-texto no-underline";
  return (
    <li>
      {href
        ? <Link href={href} className={`${classe} transition hover:border-orgao hover:shadow-md`}>{conteudo}</Link>
        : <div className={classe}>{conteudo}</div>}
    </li>
  );
}

export default async function ResumoPainel({ params }: PageProps<"/[orgao]/painel">) {
  const { orgao: slug } = await params;
  const { orgao, papel, usuario } = await exigirAcessoOrgao(slug);
  const base = `/${slug}/painel`;
  const camara = orgao.tipo === "camara";
  const hoje = new Date();
  const seteDias = diasAtras(7);
  const inicioMes = `${partesDataHora(hoje.toISOString()).data.slice(0, 7)}-01T00:00:00-03:00`;

  const config = await carregarConfiguracao(orgao.id);
  const supabase = await createClient();
  const contar = (tabela: string) => supabase.from(tabela).select("*", { count: "exact", head: true }).eq("orgao_id", orgao.id);
  const emTramitacao = () => contar("documentos").is("publicado_em", null).is("arquivado_em", null);

  const [tramitando, novos, parados, publicadosMes, agendadas, usuariosAtivos, porEtapa, movimentos, proxima, noticias] = await Promise.all([
    emTramitacao(),
    contar("documentos").gte("criado_em", seteDias),
    emTramitacao().lt("atualizado_em", seteDias),
    contar("documentos").gte("publicado_em", inicioMes),
    camara ? contar("sessoes").eq("situacao", "agendada") : Promise.resolve({ count: null }),
    contar("membros").eq("ativo", true),
    supabase.from("documentos").select("etapa_id").eq("orgao_id", orgao.id)
      .is("publicado_em", null).is("arquivado_em", null).limit(2000),
    supabase.from("tramitacoes").select("id, documento_id, etapa_nome, setor_nome, usuario_id, criado_em")
      .eq("orgao_id", orgao.id).order("id", { ascending: false }).limit(6),
    camara
      ? supabase.from("sessoes").select("id, tipo, numero, ano, data_hora, local").eq("orgao_id", orgao.id)
          .eq("situacao", "agendada").gte("data_hora", hoje.toISOString()).order("data_hora").limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    contar("noticias").eq("publicada", true),
  ]);

  // Contagem por etapa, na ordem do fluxo.
  const contagem = new Map<string, number>();
  for (const d of porEtapa.data ?? []) contagem.set(d.etapa_id, (contagem.get(d.etapa_id) ?? 0) + 1);
  const etapas = config.etapas.filter((e) => contagem.has(e.id));
  const maior = Math.max(1, ...contagem.values());
  const fluxos = new Map(config.fluxos.map((f) => [f.id, f.nome]));

  // Documentos e pessoas das últimas movimentações.
  const docIds = [...new Set((movimentos.data ?? []).map((m) => m.documento_id))];
  const pessoaIds = [...new Set((movimentos.data ?? []).map((m) => m.usuario_id).filter(Boolean))] as string[];
  const [docs, pessoas] = await Promise.all([
    docIds.length ? supabase.from("documentos").select("id, protocolo, assunto").in("id", docIds) : Promise.resolve({ data: [] }),
    pessoaIds.length ? supabase.from("usuarios").select("id, nome, email").in("id", pessoaIds) : Promise.resolve({ data: [] }),
  ]);
  const docPorId = new Map((docs.data ?? []).map((d) => [d.id, d]));
  const nomePorId = new Map((pessoas.data ?? []).map((p) => [p.id, p.nome || p.email]));

  const podeEditar = papel !== "consulta";
  const acoes = [
    ...(podeEditar && config.tipos.length ? [{ href: `${base}/documentos/novo`, rotulo: "Novo documento", icone: "mais" as const }] : []),
    ...(podeEditar ? [{ href: `${base}/conteudo/noticias/nova`, rotulo: "Nova notícia", icone: "diario" as const }] : []),
    ...(podeEditar && camara ? [{ href: `${base}/sessoes#agendar`, rotulo: "Agendar sessão", icone: "sessao" as const }] : []),
    { href: `${base}/documentos/quadro`, rotulo: "Quadro de tramitação", icone: "quadro" as const },
    { href: `/${slug}`, rotulo: "Ver portal", icone: "olho" as const },
  ];
  const sessao = proxima.data;
  const primeiroNome = usuario.nome.split(/[\s@]/)[0];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Olá, {primeiroNome}</h1>
          <p className="text-texto-suave">{orgao.nome} · {formatarDataExtenso(hoje.toISOString())}</p>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Ações rápidas">
          {acoes.map((a, i) => (
            <li key={a.href}>
              <Link href={a.href}
                className={`flex items-center gap-2 rounded px-3 py-2 font-semibold no-underline ${
                  i === 0 ? "botao-primario" : "border border-borda bg-fundo text-texto hover:border-orgao"
                }`}>
                <Icone nome={a.icone} className="h-4 w-4" />
                {a.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <h2 className="sr-only">Indicadores</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Em tramitação" valor={tramitando.count ?? 0} icone="movimento"
          href={`${base}/documentos/quadro`} />
        <Indicador rotulo="Protocolados nos últimos 7 dias" valor={novos.count ?? 0} icone="documento"
          href={`${base}/documentos`} />
        <Indicador rotulo="Parados há mais de 7 dias" valor={parados.count ?? 0} icone="alerta"
          alerta={(parados.count ?? 0) > 0} href={`${base}/documentos?parados=1`} />
        <Indicador rotulo="Publicados neste mês" valor={publicadosMes.count ?? 0} icone="diario"
          href={`${base}/documentos?situacao=concluido`} />
        {camara && (
          <Indicador rotulo="Sessões agendadas" valor={agendadas.count ?? 0} icone="sessao" href={`${base}/sessoes`} />
        )}
        <Indicador rotulo="Notícias publicadas" valor={noticias.count ?? 0} icone="diario"
          href={`${base}/conteudo/noticias?situacao=publicada`} />
        <Indicador rotulo="Usuários ativos" valor={usuariosAtivos.count ?? "—"} icone="usuarios"
          href={podeAdministrar(papel) ? `${base}/usuarios` : undefined} />
        <Indicador rotulo="2FA obrigatório" valor={orgao.exigir_2fa ? "Sim" : "Não"} icone="cadeado"
          href={podeAdministrar(papel) ? `${base}/orgao` : undefined} />
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section aria-labelledby="titulo-etapas" className="min-w-0 rounded-lg border border-borda bg-fundo p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="titulo-etapas" className="text-lg font-semibold">Em tramitação por etapa</h2>
            <Link href={`${base}/documentos/quadro`} className="text-sm">Abrir o quadro</Link>
          </div>
          {etapas.length ? (
            <ul className="mt-4 space-y-3">
              {etapas.map((e) => {
                const n = contagem.get(e.id) ?? 0;
                return (
                  <li key={e.id}>
                    <Link href={`${base}/documentos/quadro?fluxo=${e.fluxo_id}`} className="block text-texto no-underline hover:underline">
                      <span className="flex justify-between text-sm">
                        <span>
                          <span className="font-semibold">{e.nome}</span>
                          {config.fluxos.length > 1 && <span className="text-texto-suave"> · {fluxos.get(e.fluxo_id)}</span>}
                        </span>
                        <span className="font-semibold">{n}</span>
                      </span>
                      <span className="mt-1 block h-2 rounded-full bg-fundo-suave" aria-hidden="true">
                        <span className="block h-2 rounded-full bg-orgao" style={{ width: `${(n / maior) * 100}%` }} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-texto-suave">Nenhum documento em tramitação.</p>
          )}
        </section>

        <div className="min-w-0 space-y-6 lg:col-span-2">
          {camara && (
            <section aria-labelledby="titulo-proxima" className="rounded-lg border border-borda bg-fundo p-5">
              <h2 id="titulo-proxima" className="flex items-center gap-2 text-lg font-semibold">
                <Icone nome="sessao" className="h-5 w-5 text-orgao" /> Próxima sessão
              </h2>
              {sessao ? (
                <p className="mt-2">
                  <Link href={`${base}/sessoes/${sessao.id}`} className="font-semibold">
                    {nomeSessao(sessao.tipo, sessao.numero, sessao.ano)}
                  </Link>
                  <span className="block text-sm text-texto-suave">
                    {formatarDataExtenso(sessao.data_hora)}, às {formatarHora(sessao.data_hora)}{sessao.local ? ` · ${sessao.local}` : ""}
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-texto-suave">Nenhuma sessão agendada.</p>
              )}
            </section>
          )}

          <section aria-labelledby="titulo-movimentos" className="rounded-lg border border-borda bg-fundo p-5">
            <h2 id="titulo-movimentos" className="text-lg font-semibold">Últimas movimentações</h2>
            {movimentos.data?.length ? (
              <ol className="mt-3 space-y-3">
                {movimentos.data.map((m) => {
                  const d = docPorId.get(m.documento_id);
                  return (
                    <li key={m.id} className="border-l-2 border-orgao pl-3 text-sm">
                      <Link href={`${base}/documentos/${m.documento_id}`} className="font-semibold">{d?.protocolo ?? "Documento"}</Link>
                      <span> foi para <strong>{m.etapa_nome}</strong>{m.setor_nome ? ` (${m.setor_nome})` : ""}</span>
                      {d && <span className="block truncate text-texto-suave">{d.assunto}</span>}
                      <span className="block text-texto-suave">
                        {tempoDecorrido(m.criado_em)}{m.usuario_id && nomePorId.get(m.usuario_id) ? ` · ${nomePorId.get(m.usuario_id)}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-3 text-texto-suave">Nenhuma movimentação registrada.</p>
            )}
          </section>
        </div>
      </div>

      <section aria-labelledby="titulo-modulos" className="mt-8">
        <h2 id="titulo-modulos" className="text-lg font-semibold">Módulos</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((m) => (
            <li key={m.nome} className="flex items-center justify-between gap-3 rounded-lg border border-borda bg-fundo px-4 py-3">
              <span>{m.nome}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                m.situacao === "Disponível" ? "border border-sucesso text-sucesso" : "border border-borda text-texto-suave"
              }`}>{m.situacao}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

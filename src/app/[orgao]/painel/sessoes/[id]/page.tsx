import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Campo, CampoSelecao, CampoTexto, Formulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import {
  identificacao, nomeSessao, partesDataHora, rotuloResultado, rotuloSituacaoSessao,
  type ResultadoPauta, type SituacaoSessao,
} from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { createClient } from "@/lib/supabase/server";
import { excluirSessao, gerarAta, incluirItemPauta, removerItemPauta, salvarItemPauta, salvarSessao } from "../actions";

export const metadata: Metadata = { title: "Sessão" };

const SITUACOES = (Object.entries(rotuloSituacaoSessao) as [SituacaoSessao, string][]).map(([valor, rotulo]) => ({ valor, rotulo }));
const RESULTADOS = (Object.entries(rotuloResultado) as [ResultadoPauta, string][]).map(([valor, rotulo]) => ({ valor, rotulo }));

export default async function Sessao({ params }: PageProps<"/[orgao]/painel/sessoes/[id]">) {
  const { orgao: slug, id } = await params;
  const { orgao, papel } = await exigirAcessoOrgao(slug);
  const supabase = await createClient();

  const [{ data: sessao }, { data: itens }, { data: documentos }, config] = await Promise.all([
    supabase.from("sessoes").select("*").eq("id", id).eq("orgao_id", orgao.id).maybeSingle(),
    supabase.from("pauta_itens").select("id, fase_id, ordem, descricao, resultado, documento_id").eq("sessao_id", id).order("ordem"),
    supabase.from("documentos").select("id, numero, ano, assunto, tipo_id")
      .eq("orgao_id", orgao.id).is("arquivado_em", null).order("criado_em", { ascending: false }).limit(200),
    carregarConfiguracao(orgao.id),
  ]);
  if (!sessao) notFound();

  const podeEditar = papel !== "consulta";
  const titulo = nomeSessao(sessao.tipo, sessao.numero, sessao.ano);
  const { data, hora } = partesDataHora(sessao.data_hora);
  const tipos = new Map(config.tipos.map((t) => [t.id, t]));
  const fasesAtivas = config.fases.filter((f) => f.ativo);
  const fasesComItens = config.fases.filter((f) => f.ativo || itens?.some((i) => i.fase_id === f.id));
  const opcoesDocumento = (documentos ?? [])
    .filter((d) => tipos.get(d.tipo_id)?.categoria !== "ata")
    .map((d) => {
      const t = tipos.get(d.tipo_id)!;
      return { valor: d.id, rotulo: `${identificacao(t.sigla, d.numero, d.ano)} · ${d.assunto.slice(0, 70)}`, grupo: t.nome };
    });
  const ocultos = (
    <>
      <input type="hidden" name="orgao" value={slug} />
      <input type="hidden" name="id" value={sessao.id} />
    </>
  );

  return (
    <>
      <p><Link href={`/${slug}/painel/sessoes`}>Voltar para sessões</Link></p>
      <h1 className="mt-2 text-2xl font-bold">{titulo}</h1>

      {podeEditar ? (
        <Formulario acao={salvarSessao} botao="Salvar sessão" className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
          {ocultos}
          <Campo id="data" rotulo="Data" type="date" defaultValue={data} required />
          <Campo id="hora" rotulo="Horário" type="time" defaultValue={hora} required />
          <Campo id="local" rotulo="Local" defaultValue={sessao.local ?? ""} />
          <CampoSelecao id="situacao" rotulo="Situação" opcoes={SITUACOES} defaultValue={sessao.situacao} />
          <div className="sm:col-span-2">
            <CampoTexto id="observacoes" rotulo="Observações" rows={3} defaultValue={sessao.observacoes ?? ""}
              ajuda="Entram no fim da minuta da ata (ex.: presenças, ausências justificadas)." />
          </div>
        </Formulario>
      ) : (
        <p className="mt-2">{rotuloSituacaoSessao[sessao.situacao as SituacaoSessao]} · {sessao.local ?? ""}</p>
      )}

      <section aria-labelledby="titulo-pauta" className="mt-10">
        <h2 id="titulo-pauta" className="text-xl font-semibold">Pauta</h2>
        {fasesComItens.length === 0 && (
          <p className="mt-2">Cadastre as fases da sessão em <Link href={`/${slug}/painel/configuracao/fases`}>Configuração</Link>.</p>
        )}
        {fasesComItens.map((f) => {
          const daFase = (itens ?? []).filter((i) => i.fase_id === f.id);
          return (
            <div key={f.id} className="mt-5">
              <h3 className="text-lg font-semibold">{f.nome}</h3>
              {daFase.length === 0 && <p className="text-texto-suave">Nenhum item.</p>}
              <ol className="mt-2 space-y-3">
                {daFase.map((i) => (
                  <li key={i.id} className="rounded border border-borda p-3">
                    {podeEditar ? (
                      <>
                        <Formulario acao={salvarItemPauta} botao="Salvar" className="grid items-end gap-3 sm:grid-cols-[5rem_1fr_12rem_auto]">
                          <input type="hidden" name="orgao" value={slug} />
                          <input type="hidden" name="item" value={i.id} />
                          <Campo id={`ordem-${i.id}`} name="ordem" rotulo="Ordem" type="number" min={0} defaultValue={i.ordem} />
                          <Campo id={`descricao-${i.id}`} name="descricao" rotulo="Descrição" defaultValue={i.descricao} required />
                          <CampoSelecao id={`resultado-${i.id}`} name="resultado" rotulo="Resultado" vazio="Pendente"
                            opcoes={RESULTADOS} defaultValue={i.resultado ?? ""} />
                        </Formulario>
                        <div className="mt-2 flex flex-wrap items-center gap-4">
                          {i.documento_id && <Link href={`/${slug}/painel/documentos/${i.documento_id}`}>Abrir documento</Link>}
                          <Formulario acao={removerItemPauta} botao={<>Remover da pauta<span className="sr-only">: {i.descricao}</span></>}
                            classeBotao="text-erro underline" className="flex items-center gap-2">
                            <input type="hidden" name="orgao" value={slug} />
                            <input type="hidden" name="item" value={i.id} />
                          </Formulario>
                        </div>
                      </>
                    ) : (
                      <p>{i.ordem}. {i.descricao}{i.resultado ? ` · ${rotuloResultado[i.resultado as ResultadoPauta]}` : ""}</p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}

        {podeEditar && fasesAtivas.length > 0 && (
          <div className="mt-8 rounded border border-borda bg-fundo-suave p-5">
            <h3 className="text-lg font-semibold">Incluir na pauta</h3>
            <Formulario acao={incluirItemPauta} botao="Incluir" className="mt-3 max-w-2xl space-y-4">
              {ocultos}
              <CampoSelecao id="fase_id" rotulo="Fase" opcoes={fasesAtivas.map((f) => ({ valor: f.id, rotulo: f.nome }))} />
              <CampoSelecao id="documento_id" rotulo="Documento (opcional)" vazio="Sem documento vinculado" opcoes={opcoesDocumento} />
              <Campo id="descricao" rotulo="Descrição" ajuda="Deixe em branco para usar o número e o assunto do documento. Na Tribuna Livre, informe o orador e o tema." />
            </Formulario>
          </div>
        )}
      </section>

      <section aria-labelledby="titulo-ata" className="mt-10">
        <h2 id="titulo-ata" className="text-xl font-semibold">Ata</h2>
        {sessao.ata_documento_id ? (
          <p className="mt-2"><Link href={`/${slug}/painel/documentos/${sessao.ata_documento_id}`}>Abrir a ata e acompanhar a tramitação</Link></p>
        ) : podeEditar ? (
          <>
            <p className="mt-1 text-texto-suave">
              Gera a minuta a partir da pauta e dos resultados. A ata entra no fluxo de atas (Criada, Análise, Secretaria, Jurídico, Publicada).
            </p>
            <Formulario acao={gerarAta} botao="Gerar ata" className="mt-3">
              {ocultos}
            </Formulario>
          </>
        ) : <p className="mt-2 text-texto-suave">Ata ainda não gerada.</p>}
      </section>

      {(papel === "administrador" || papel === "superadmin") && (
        <section aria-labelledby="titulo-excluir" className="mt-10 border-t border-borda pt-6">
          <h2 id="titulo-excluir" className="text-lg font-semibold">Excluir sessão</h2>
          <p className="text-sm text-texto-suave">Prefira marcar como cancelada. A ata, se houver, continua como documento.</p>
          <Formulario acao={excluirSessao} botao="Excluir sessão" classeBotao="mt-2 rounded border border-erro px-4 py-2 font-semibold text-erro" className="mt-2">
            {ocultos}
          </Formulario>
        </section>
      )}
    </>
  );
}

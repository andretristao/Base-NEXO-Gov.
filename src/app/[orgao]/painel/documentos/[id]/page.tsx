import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Campo, CampoSelecao, CampoTexto, Formulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import {
  formatarDataHora, formatarTamanho, identificacao, rotuloNatureza, situacaoDocumento,
} from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { createClient } from "@/lib/supabase/server";
import { enviarAnexo, excluirDocumento, removerAnexo, salvarDocumento, tramitarDocumento } from "../actions";

export const metadata: Metadata = { title: "Documento" };

export default async function Documento({ params }: PageProps<"/[orgao]/painel/documentos/[id]">) {
  const { orgao: slug, id } = await params;
  const { orgao, papel } = await exigirAcessoOrgao(slug);
  const supabase = await createClient();

  const [{ data: doc }, { data: historico }, { data: anexos }, config] = await Promise.all([
    supabase.from("documentos").select("*").eq("id", id).eq("orgao_id", orgao.id).maybeSingle(),
    supabase.from("tramitacoes").select("id, etapa_nome, setor_nome, despacho, usuario_id, criado_em").eq("documento_id", id).order("id"),
    supabase.from("anexos").select("id, nome_arquivo, tamanho, criado_em").eq("documento_id", id).order("criado_em"),
    carregarConfiguracao(orgao.id),
  ]);
  if (!doc) notFound();

  const tipo = config.tipos.find((t) => t.id === doc.tipo_id)!;
  const etapaAtual = config.etapas.find((e) => e.id === doc.etapa_id);
  const setorAtual = config.setores.find((s) => s.id === doc.setor_id);
  const etapasFluxo = config.etapas.filter((e) => e.fluxo_id === tipo.fluxo_id);

  const ids = [...new Set([doc.criado_por, ...(historico ?? []).map((h) => h.usuario_id)].filter(Boolean))] as string[];
  const { data: pessoas } = ids.length
    ? await supabase.from("usuarios").select("id, nome, email").in("id", ids)
    : { data: [] };
  const nomes = new Map((pessoas ?? []).map((p) => [p.id, p.nome || p.email]));

  const podeEditar = papel !== "consulta";
  const podePublicar = papel === "superadmin" || papel === "administrador" || papel === "gestor";
  const emTramitacao = !doc.publicado_em && !doc.arquivado_em;
  const destinos = etapasFluxo.filter((e) =>
    doc.publicado_em ? e.natureza === "arquivamento" : podePublicar || e.natureza !== "conclusao",
  );
  const titulo = identificacao(tipo.sigla, doc.numero, doc.ano);
  const ocultos = (
    <>
      <input type="hidden" name="orgao" value={slug} />
      <input type="hidden" name="id" value={doc.id} />
    </>
  );

  return (
    <>
      <p><Link href={`/${slug}/painel/documentos`}>Voltar para documentos</Link></p>
      <h1 className="mt-2 text-2xl font-bold">{tipo.nome} · {titulo}</h1>
      <dl className="mt-4 grid gap-3 rounded border border-borda p-4 sm:grid-cols-3">
        <div><dt className="text-sm text-texto-suave">Protocolo</dt><dd className="font-semibold">{doc.protocolo}</dd></div>
        <div><dt className="text-sm text-texto-suave">Situação</dt><dd className="font-semibold">{situacaoDocumento(doc)}</dd></div>
        <div><dt className="text-sm text-texto-suave">Etapa atual</dt><dd className="font-semibold">{etapaAtual?.nome ?? "—"}</dd></div>
        <div><dt className="text-sm text-texto-suave">Setor atual</dt><dd>{setorAtual ? `${setorAtual.nome} (${setorAtual.sigla})` : "—"}</dd></div>
        <div><dt className="text-sm text-texto-suave">Protocolado em</dt><dd>{formatarDataHora(doc.criado_em)}{doc.criado_por ? ` por ${nomes.get(doc.criado_por) ?? "—"}` : ""}</dd></div>
        <div>
          <dt className="text-sm text-texto-suave">Publicação</dt>
          <dd>
            {doc.publicado_em ? formatarDataHora(doc.publicado_em) : "Não publicado"}
            {doc.publicado_em && tipo.publico && (
              <> · <Link href={`/${slug}/documentos/${doc.id}`}>ver no portal</Link></>
            )}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="titulo-dados" className="mt-8">
        <h2 id="titulo-dados" className="text-xl font-semibold">Conteúdo</h2>
        {podeEditar && emTramitacao ? (
          <Formulario acao={salvarDocumento} botao="Salvar alterações" className="mt-3 max-w-3xl space-y-4">
            {ocultos}
            <Campo id="assunto" rotulo="Assunto ou ementa" defaultValue={doc.assunto} required maxLength={500} />
            <Campo id="interessado" rotulo="Autor ou interessado" defaultValue={doc.interessado ?? ""} />
            <CampoTexto id="texto" rotulo="Texto" rows={14} defaultValue={doc.texto ?? ""} />
          </Formulario>
        ) : (
          <div className="mt-3 max-w-3xl space-y-3">
            <p><strong>Assunto:</strong> {doc.assunto}</p>
            {doc.interessado && <p><strong>Autor ou interessado:</strong> {doc.interessado}</p>}
            {doc.texto && <div className="whitespace-pre-line rounded border border-borda p-4">{doc.texto}</div>}
            {!emTramitacao && <p className="text-texto-suave">Documento concluído ou arquivado: o conteúdo não pode mais ser alterado.</p>}
          </div>
        )}
      </section>

      <section aria-labelledby="titulo-anexos" className="mt-8">
        <h2 id="titulo-anexos" className="text-xl font-semibold">Anexos</h2>
        {anexos?.length ? (
          <ul className="mt-3 space-y-2">
            {anexos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3">
                <a href={`/${slug}/anexos/${a.id}`}>{a.nome_arquivo}</a>
                <span className="text-sm text-texto-suave">{formatarTamanho(a.tamanho)}</span>
                {podeEditar && emTramitacao && (
                  <Formulario acao={removerAnexo} botao={<>Remover<span className="sr-only"> {a.nome_arquivo}</span></>}
                    classeBotao="text-erro underline" className="flex items-center gap-2">
                    <input type="hidden" name="orgao" value={slug} />
                    <input type="hidden" name="anexo" value={a.id} />
                  </Formulario>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-texto-suave">Nenhum anexo.</p>}
        {podeEditar && emTramitacao && (
          <Formulario acao={enviarAnexo} botao="Anexar" className="mt-4 max-w-xl space-y-3">
            {ocultos}
            <Campo id="arquivo" rotulo="Arquivo" type="file" ajuda="PDF, imagem ou documento de até 4 MB." required
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.odt,.xls,.xlsx,.ods" />
          </Formulario>
        )}
      </section>

      {podeEditar && !doc.arquivado_em && destinos.length > 0 && (
        <section aria-labelledby="titulo-tramitar" className="mt-8 rounded border border-borda bg-fundo-suave p-5">
          <h2 id="titulo-tramitar" className="text-xl font-semibold">Tramitar</h2>
          {!podePublicar && (
            <p className="mt-1 text-sm text-texto-suave">Etapas de conclusão (publicação) ficam com gestores e administradores.</p>
          )}
          <Formulario acao={tramitarDocumento} botao="Tramitar" className="mt-3 max-w-2xl space-y-4">
            {ocultos}
            <CampoSelecao id="etapa_id" rotulo="Enviar para a etapa" vazio="Escolha a etapa" required
              opcoes={destinos.map((e) => ({
                valor: e.id,
                rotulo: `${e.ordem}. ${e.nome}${e.natureza !== "andamento" ? ` · ${rotuloNatureza[e.natureza]}` : ""}`,
              }))} />
            <CampoSelecao id="setor_id" rotulo="Setor de destino" vazio="Setor padrão da etapa"
              opcoes={config.setores.filter((s) => s.ativo).map((s) => ({ valor: s.id, rotulo: `${s.nome} (${s.sigla})` }))} />
            <CampoTexto id="despacho" rotulo="Despacho" rows={3} ajuda="Fica no histórico interno. Não aparece na consulta pública." />
          </Formulario>
        </section>
      )}

      <section aria-labelledby="titulo-historico" className="mt-8">
        <h2 id="titulo-historico" className="text-xl font-semibold">Histórico de tramitação</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Movimentações do documento {titulo}, da mais antiga para a mais recente</caption>
            <thead>
              <tr className="border-b border-borda">
                <th scope="col" className="py-2 pr-3">Data e hora</th>
                <th scope="col" className="pr-3">Etapa</th>
                <th scope="col" className="pr-3">Setor</th>
                <th scope="col" className="pr-3">Despacho</th>
                <th scope="col">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {(historico ?? []).map((h) => (
                <tr key={h.id} className="border-b border-borda align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatarDataHora(h.criado_em)}</td>
                  <td className="pr-3">{h.etapa_nome}</td>
                  <td className="pr-3">{h.setor_nome ?? "—"}</td>
                  <td className="pr-3 whitespace-pre-line">{h.despacho ?? "—"}</td>
                  <td>{h.usuario_id ? nomes.get(h.usuario_id) ?? "—" : "Sistema"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(papel === "administrador" || papel === "superadmin") && !doc.publicado_em && (
        <section aria-labelledby="titulo-excluir" className="mt-10 border-t border-borda pt-6">
          <h2 id="titulo-excluir" className="text-lg font-semibold">Excluir documento</h2>
          <p className="text-sm text-texto-suave">O número de protocolo não é reaproveitado e a exclusão fica na auditoria.</p>
          <Formulario acao={excluirDocumento} botao="Excluir definitivamente" classeBotao="mt-2 rounded border border-erro px-4 py-2 font-semibold text-erro" className="mt-2">
            {ocultos}
          </Formulario>
        </section>
      )}
    </>
  );
}

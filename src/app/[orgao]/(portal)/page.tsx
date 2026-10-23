import Link from "next/link";
import { Icone } from "@/components/Icone";
import { exigirOrgao } from "@/lib/dal";
import { servicosDoOrgao } from "@/lib/portal";
import { formatarData, formatarDataExtenso, formatarHora, identificacao, nomeSessao } from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { createClient } from "@/lib/supabase/server";

const NENHUM = "00000000-0000-0000-0000-000000000000";

export default async function InicioOrgao({ params }: PageProps<"/[orgao]">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);
  const base = `/${orgao.slug}`;
  const camara = orgao.tipo === "camara";
  const servicos = servicosDoOrgao(orgao);

  const config = await carregarConfiguracao(orgao.id);
  const publicos = config.tipos.filter((t) => t.publico);
  const tipos = new Map(publicos.map((t) => [t.id, t]));
  const idsPublicos = publicos.length ? publicos.map((t) => t.id) : [NENHUM];
  const inicioAno = `${new Date().getFullYear()}-01-01T00:00:00-03:00`;

  const supabase = await createClient();
  const [recentes, publicadosAno, proxima, realizadasAno] = await Promise.all([
    supabase
      .from("documentos")
      .select("id, numero, ano, assunto, tipo_id, publicado_em")
      .eq("orgao_id", orgao.id)
      .not("publicado_em", "is", null)
      .in("tipo_id", idsPublicos)
      .order("publicado_em", { ascending: false })
      .limit(4),
    supabase
      .from("documentos")
      .select("*", { count: "exact", head: true })
      .eq("orgao_id", orgao.id)
      .in("tipo_id", idsPublicos)
      .gte("publicado_em", inicioAno),
    camara
      ? supabase
          .from("sessoes")
          .select("id, tipo, numero, ano, data_hora, local")
          .eq("orgao_id", orgao.id)
          .eq("situacao", "agendada")
          .gte("data_hora", new Date().toISOString())
          .order("data_hora")
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    camara
      ? supabase
          .from("sessoes")
          .select("*", { count: "exact", head: true })
          .eq("orgao_id", orgao.id)
          .eq("situacao", "realizada")
          .gte("data_hora", inicioAno)
      : Promise.resolve({ count: null }),
  ]);
  const sessao = proxima.data;

  return (
    <>
      <section aria-labelledby="titulo-servicos">
        <h1 id="titulo-servicos" className="text-2xl font-bold sm:text-3xl">Como podemos ajudar?</h1>
        <p className="mt-1 text-texto-suave">Serviços e informações da {orgao.nome}.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {servicos.map((s) => {
            const corpo = (
              <>
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${s.disponivel ? "bg-orgao/10 text-orgao" : "bg-fundo-suave text-texto-suave"}`}>
                  <Icone nome={s.icone} className="h-6 w-6" />
                </span>
                <span className="mt-3 block text-lg font-semibold">{s.titulo}</span>
                <span className="mt-1 block text-sm text-texto-suave">{s.texto}</span>
              </>
            );
            return (
              <li key={s.caminho}>
                {s.disponivel ? (
                  <Link href={`${base}/${s.caminho}`}
                    className="block h-full rounded-lg border border-borda p-5 text-texto no-underline transition hover:-translate-y-0.5 hover:border-orgao hover:shadow-md">
                    {corpo}
                  </Link>
                ) : (
                  <div className="relative h-full rounded-lg border border-dashed border-borda p-5">
                    {corpo}
                    <span className="absolute right-3 top-3 rounded-full bg-fundo-suave px-2 py-0.5 text-xs font-semibold text-texto-suave">Em breve</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="titulo-recentes" className="lg:col-span-2">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="titulo-recentes" className="text-xl font-bold">Publicações recentes</h2>
            <Link href={`${base}/documentos`} className="flex items-center gap-1 text-sm">
              Ver todas <Icone nome="seta" className="h-4 w-4" />
            </Link>
          </div>
          {recentes.data?.length ? (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {recentes.data.map((d) => {
                const t = tipos.get(d.tipo_id)!;
                return (
                  <li key={d.id} className="flex flex-col rounded-lg border border-borda p-4">
                    <p className="flex items-center justify-between gap-2 text-sm">
                      <span className="rounded border border-orgao px-2 py-0.5 font-semibold text-orgao">{t.nome}</span>
                      <span className="text-texto-suave">{formatarData(d.publicado_em)}</span>
                    </p>
                    <h3 className="mt-3 font-semibold">
                      <Link href={`${base}/documentos/${d.id}`}>{identificacao(t.sigla, d.numero, d.ano)}</Link>
                    </h3>
                    <p className="mt-1 line-clamp-3 text-sm">{d.assunto}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-texto-suave">Nenhuma publicação ainda.</p>
          )}
        </section>

        <aside aria-label="Destaques" className="space-y-6">
          {camara && (
            <section aria-labelledby="titulo-proxima" className="faixa-orgao rounded-lg bg-orgao p-5 text-white">
              <h2 id="titulo-proxima" className="flex items-center gap-2 font-bold">
                <Icone nome="sessao" /> Próxima sessão
              </h2>
              {sessao ? (
                <>
                  <p className="mt-3 text-lg font-semibold">{nomeSessao(sessao.tipo, sessao.numero, sessao.ano)}</p>
                  <p className="mt-1">{formatarDataExtenso(sessao.data_hora)}, às {formatarHora(sessao.data_hora)}</p>
                  {sessao.local && <p>{sessao.local}</p>}
                  <p className="mt-3"><Link href={`${base}/sessoes/${sessao.id}`} className="text-white">Ver a pauta</Link></p>
                </>
              ) : (
                <p className="mt-3">Nenhuma sessão agendada no momento.</p>
              )}
            </section>
          )}

          <section aria-labelledby="titulo-consulta" className="rounded-lg border border-borda bg-fundo-suave p-5">
            <h2 id="titulo-consulta" className="flex items-center gap-2 font-bold">
              <Icone nome="protocolo" /> Consultar protocolo
            </h2>
            <form action={`${base}/protocolo`} className="mt-3">
              <label htmlFor="numero-inicio" className="block text-sm font-semibold">Número do protocolo</label>
              <div className="mt-1 flex gap-2">
                <input id="numero-inicio" name="numero" required placeholder="2026/000123"
                  className="min-w-0 flex-1 rounded border border-borda bg-fundo px-3 py-2" />
                <button type="submit" className="botao-primario">Consultar</button>
              </div>
            </form>
          </section>

          <section aria-labelledby="titulo-numeros" className="rounded-lg border border-borda p-5">
            <h2 id="titulo-numeros" className="font-bold">Em {new Date().getFullYear()}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-texto-suave">Publicações</dt>
                <dd className="text-3xl font-bold text-orgao">{publicadosAno.count ?? 0}</dd>
              </div>
              {camara && (
                <div>
                  <dt className="text-sm text-texto-suave">Sessões realizadas</dt>
                  <dd className="text-3xl font-bold text-orgao">{realizadasAno.count ?? 0}</dd>
                </div>
              )}
            </dl>
          </section>
        </aside>
      </div>

      <section aria-labelledby="titulo-atendimento" className="mt-12 rounded-lg bg-fundo-suave p-6">
        <h2 id="titulo-atendimento" className="text-xl font-bold">Atendimento</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {orgao.endereco && (
            <li className="flex gap-3"><Icone nome="local" className="mt-0.5 h-6 w-6 text-orgao" /><span>{orgao.endereco}</span></li>
          )}
          {orgao.telefone && (
            <li className="flex gap-3"><Icone nome="telefone" className="mt-0.5 h-6 w-6 text-orgao" /><span>{orgao.telefone}</span></li>
          )}
          {orgao.email_contato && (
            <li className="flex gap-3">
              <Icone nome="email" className="mt-0.5 h-6 w-6 text-orgao" />
              <a href={`mailto:${orgao.email_contato}`}>{orgao.email_contato}</a>
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

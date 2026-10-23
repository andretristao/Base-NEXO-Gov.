import Link from "next/link";
import { exigirOrgao } from "@/lib/dal";

const servicosProtocolo = (camara: boolean) => [
  ...(camara
    ? [{ caminho: "sessoes", titulo: "Sessões plenárias", texto: "Pautas, resultados das votações e atas." }]
    : []),
  {
    caminho: "documentos",
    titulo: camara ? "Proposições e atos" : "Atos publicados",
    texto: camara ? "Projetos de lei, requerimentos, indicações, moções e atas." : "Decretos, portarias e demais atos oficiais.",
  },
  { caminho: "protocolo", titulo: "Consulta de protocolo", texto: "Acompanhe a tramitação de um documento pelo número." },
];

const servicos = [
  { caminho: "diario-oficial", titulo: "Diário Oficial", texto: "Edições, atos oficiais e busca por publicações." },
  { caminho: "transparencia", titulo: "Portal da Transparência", texto: "Receitas, despesas, licitações, contratos e pessoal." },
  { caminho: "ouvidoria", titulo: "Ouvidoria", texto: "Reclamações, sugestões, elogios e denúncias." },
  { caminho: "e-sic", titulo: "e-SIC", texto: "Pedidos de acesso à informação (Lei 12.527/2011)." },
];

export default async function InicioOrgao({ params }: PageProps<"/[orgao]">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);

  return (
    <>
      <h1 className="text-2xl font-bold">Serviços ao cidadão</h1>
      <p className="mt-1 text-texto-suave">{orgao.nome}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {[...servicosProtocolo(orgao.tipo === "camara"), ...servicos].map((s) => (
          <li key={s.caminho} className="rounded border border-borda p-5">
            <h2 className="text-lg font-semibold">
              <Link href={`/${orgao.slug}/${s.caminho}`}>{s.titulo}</Link>
            </h2>
            <p className="mt-1 text-texto-suave">{s.texto}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

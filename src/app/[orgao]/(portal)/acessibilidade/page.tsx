import type { Metadata } from "next";
import { exigirOrgao } from "@/lib/dal";

export const metadata: Metadata = { title: "Acessibilidade" };

export default async function Acessibilidade({ params }: PageProps<"/[orgao]/acessibilidade">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);

  return (
    <article className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Acessibilidade</h1>
      <p>
        Este portal segue o Modelo de Acessibilidade em Governo Eletrônico (eMAG 3.1) e as
        Diretrizes de Acessibilidade para Conteúdo Web (WCAG 2.1, nível AA), conforme a
        Lei Brasileira de Inclusão (Lei 13.146/2015).
      </p>
      <h2 className="text-xl font-semibold">Atalhos de teclado</h2>
      <p>Use Alt + número (Chrome e Edge), Alt + Shift + número (Firefox) ou Control + Option + número (Safari no Mac).</p>
      <ul className="list-disc pl-6">
        <li>1: ir para o conteúdo</li>
        <li>2: ir para o menu</li>
        <li>3: ir para a busca</li>
        <li>4: ir para o rodapé</li>
      </ul>
      <h2 className="text-xl font-semibold">Recursos disponíveis</h2>
      <ul className="list-disc pl-6">
        <li>Alto contraste e ajuste do tamanho da fonte na barra do topo.</li>
        <li>Tradução para Libras pelo VLibras, no ícone lateral.</li>
        <li>Navegação completa pelo teclado, com foco visível.</li>
        <li>Compatível com leitores de tela como NVDA, JAWS e VoiceOver.</li>
      </ul>
      <h2 className="text-xl font-semibold">Encontrou alguma barreira?</h2>
      <p>
        Fale com a Ouvidoria de {orgao.nome}
        {orgao.email_contato ? <> ou escreva para <a href={`mailto:${orgao.email_contato}`}>{orgao.email_contato}</a></> : null}.
      </p>
    </article>
  );
}

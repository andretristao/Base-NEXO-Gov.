import Link from "next/link";

// Fora do portal (área restrita) não há moldura; o (portal)/not-found.tsx cobre as páginas públicas.
export default function NaoEncontrado() {
  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2">O endereço pode ter mudado ou você não tem acesso a esta área.</p>
      <p className="mt-4"><Link href="/painel">Voltar aos meus órgãos</Link></p>
    </main>
  );
}

import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2"><Link href="/">Voltar ao início</Link></p>
    </main>
  );
}

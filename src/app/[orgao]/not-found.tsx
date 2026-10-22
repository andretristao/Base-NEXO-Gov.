import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <>
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2">O endereço pode ter mudado ou o serviço ainda não está disponível neste órgão.</p>
      <p className="mt-4"><Link href="/">Voltar ao início</Link></p>
    </>
  );
}

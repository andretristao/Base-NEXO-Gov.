import type { Metadata } from "next";
import { Campo, Formulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { rotuloPapel, type Papel } from "@/lib/tipos";
import { adicionarUsuario, alterarMembro } from "./actions";

export const metadata: Metadata = { title: "Usuários e perfis" };

const PAPEIS = Object.entries(rotuloPapel) as [Papel, string][];

export default async function Usuarios({ params }: PageProps<"/[orgao]/painel/usuarios">) {
  const { orgao: slug } = await params;
  const { orgao, usuario } = await exigirAcessoOrgao(slug, ["administrador"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("membros")
    .select("usuario_id, papel, ativo, usuarios!inner(nome, email)")
    .eq("orgao_id", orgao.id)
    .order("criado_em");

  const membros = (data ?? []).map((m) => ({
    id: m.usuario_id as string,
    papel: m.papel as Papel,
    ativo: m.ativo as boolean,
    ...(m.usuarios as unknown as { nome: string; email: string }),
  }));

  return (
    <>
      <h1 className="text-2xl font-bold">Usuários e perfis</h1>
      <table className="mt-6 w-full border-collapse text-left">
        <caption className="sr-only">Usuários com acesso a {orgao.nome}</caption>
        <thead>
          <tr className="border-b border-borda">
            <th scope="col" className="py-2">Nome</th>
            <th scope="col">E-mail</th>
            <th scope="col">Perfil</th>
            <th scope="col"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {membros.map((m) => (
            <tr key={m.id} className="border-b border-borda align-middle">
              <td className="py-2">{m.nome || "—"}</td>
              <td>{m.email}</td>
              <td>
                <form action={alterarMembro} className="flex gap-2">
                  <input type="hidden" name="orgao" value={slug} />
                  <input type="hidden" name="usuario" value={m.id} />
                  <label htmlFor={`papel-${m.id}`} className="sr-only">Perfil de {m.email}</label>
                  <select id={`papel-${m.id}`} name="papel" defaultValue={m.papel} className="rounded border border-borda bg-fundo px-2 py-1">
                    {PAPEIS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                  </select>
                  <button type="submit" name="acao" value="alterar" className="underline">Salvar</button>
                </form>
              </td>
              <td>
                {m.id !== usuario.id && (
                  <form action={alterarMembro}>
                    <input type="hidden" name="orgao" value={slug} />
                    <input type="hidden" name="usuario" value={m.id} />
                    <button type="submit" name="acao" value="remover" className="text-erro underline">
                      Remover<span className="sr-only"> {m.email}</span>
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-10 text-xl font-semibold">Adicionar usuário</h2>
      <p className="text-sm text-texto-suave">Se a pessoa ainda não tiver conta, ela recebe um convite por e-mail.</p>
      <Formulario acao={adicionarUsuario} botao="Adicionar" className="mt-4 max-w-md space-y-4">
        <input type="hidden" name="orgao" value={slug} />
        <Campo id="nome" rotulo="Nome" />
        <Campo id="email" rotulo="E-mail" type="email" required />
        <div>
          <label htmlFor="papel" className="block font-semibold">Perfil</label>
          <select id="papel" name="papel" defaultValue="editor" className="mt-1 w-full rounded border border-borda bg-fundo px-3 py-2">
            {PAPEIS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
          </select>
        </div>
      </Formulario>
    </>
  );
}

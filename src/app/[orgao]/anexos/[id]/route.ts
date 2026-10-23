import { NextResponse, type NextRequest } from "next/server";
import { getOrgaoPorSlug } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

// Baixa um anexo por URL assinada de curta duração. As regras de quem pode
// ver (membro do órgão ou documento público) ficam no RLS de anexos e do Storage.
export async function GET(_req: NextRequest, ctx: RouteContext<"/[orgao]/anexos/[id]">) {
  const { orgao: slug, id } = await ctx.params;
  const orgao = await getOrgaoPorSlug(slug);
  if (!orgao) return new NextResponse("Órgão não encontrado.", { status: 404 });
  const supabase = await createClient();

  const { data: anexo } = await supabase
    .from("anexos")
    .select("caminho, nome_arquivo")
    .eq("id", id)
    .eq("orgao_id", orgao.id)
    .maybeSingle();
  if (!anexo) return new NextResponse("Arquivo não encontrado.", { status: 404 });

  const { data } = await supabase.storage
    .from("protocolo")
    .createSignedUrl(anexo.caminho, 60, { download: anexo.nome_arquivo });
  if (!data?.signedUrl) return new NextResponse("Arquivo indisponível.", { status: 404 });

  return NextResponse.redirect(data.signedUrl);
}

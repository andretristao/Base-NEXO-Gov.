"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Etapa = { tipo: "inicio" } | { tipo: "qr"; fatorId: string; qr: string; segredo: string };

export function Cadastro2fa({ proximo }: { proximo: string }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>({ tipo: "inicio" });
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);

  async function iniciar() {
    setPendente(true);
    setErro(null);
    const supabase = createClient();

    // Remove tentativas anteriores não concluídas.
    const { data: fatores } = await supabase.auth.mfa.listFactors();
    for (const f of fatores?.all ?? []) {
      if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Autenticador ${new Date().toISOString().slice(0, 16)}`,
      issuer: "NEXO Gov",
    });
    setPendente(false);
    if (error || !data) {
      setErro("Não foi possível iniciar o cadastro. Tente novamente.");
      return;
    }
    setEtapa({ tipo: "qr", fatorId: data.id, qr: data.totp.qr_code, segredo: data.totp.secret });
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (etapa.tipo !== "qr") return;
    setPendente(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: etapa.fatorId,
      code: codigo.replace(/\D/g, ""),
    });
    if (error) {
      setPendente(false);
      setErro("Código inválido. Confira o horário do celular e tente o código atual.");
      return;
    }
    await supabase.rpc("registrar_evento", { p_orgao: null, p_acao: "2fa_cadastrado", p_detalhes: null });
    router.replace(proximo);
    router.refresh();
  }

  if (etapa.tipo === "inicio") {
    return (
      <div className="space-y-4">
        <p>
          Para acessar a área restrita, cadastre um aplicativo autenticador no celular
          (Google Authenticator, Microsoft Authenticator, Authy ou similar).
        </p>
        <div role="status" aria-live="polite">{erro && <p className="font-semibold text-erro">{erro}</p>}</div>
        <button type="button" onClick={iniciar} disabled={pendente} className="botao-primario">
          {pendente ? "Aguarde…" : "Cadastrar autenticador"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={confirmar} className="space-y-4">
      <ol className="list-decimal space-y-2 pl-6">
        <li>No aplicativo, escolha adicionar conta e leia o QR Code abaixo.</li>
        <li>Digite o código de 6 dígitos que aparecer.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={etapa.qr} alt="QR Code para cadastrar o autenticador" width={200} height={200} className="bg-white p-2" />
      <p className="text-sm">
        Sem câmera? Digite a chave manualmente: <code className="break-all font-mono">{etapa.segredo}</code>
      </p>
      <div>
        <label htmlFor="codigo" className="block font-semibold">Código de 6 dígitos</label>
        <input
          id="codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          className="mt-1 w-40 rounded border border-borda bg-fundo px-3 py-2"
        />
      </div>
      <div role="status" aria-live="polite">{erro && <p className="font-semibold text-erro">{erro}</p>}</div>
      <button type="submit" disabled={pendente} className="botao-primario">
        {pendente ? "Aguarde…" : "Confirmar"}
      </button>
    </form>
  );
}

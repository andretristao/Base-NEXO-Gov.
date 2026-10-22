import Script from "next/script";

// O widget procura por estes atributos sem prefixo data-.
const vw: Record<string, string> = { vw: "" };

// Widget oficial de tradução para Libras (gov.br/vlibras).
export function VLibras() {
  return (
    <>
      <div {...vw} className="enabled">
        <div vw-access-button="" className="active" />
        <div vw-plugin-wrapper="">
          <div className="vw-plugin-top-wrapper" />
        </div>
      </div>
      <Script src="https://vlibras.gov.br/app/vlibras-plugin.js" strategy="lazyOnload" id="vlibras" />
      <Script id="vlibras-init" strategy="lazyOnload">
        {`(function iniciar(){if(window.VLibras){new window.VLibras.Widget('https://vlibras.gov.br/app');}else{setTimeout(iniciar,500);}})();`}
      </Script>
    </>
  );
}

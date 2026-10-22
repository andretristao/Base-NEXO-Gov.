import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NEXO Gov", template: "%s · NEXO Gov" },
  description: "Plataforma de serviços digitais para órgãos públicos.",
};

// Aplica contraste e fonte salvos antes da pintura, sem piscar.
const preferencias = `try{var d=document.documentElement;if(localStorage.getItem('nexo:contraste')==='1')d.classList.add('alto-contraste');var e=[1,1.125,1.25,1.5][Number(localStorage.getItem('nexo:escala'))||0];if(e)d.style.setProperty('--escala-fonte',String(e));}catch(_){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencias }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">{children}</body>
    </html>
  );
}

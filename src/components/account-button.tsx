"use client";

import { useState } from "react";
import { LogIn, Mail, X } from "lucide-react";
import { confirmEmailCode, requestEmailCode } from "@/lib/auth";

export default function AccountButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [session, setSession] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setMessage("");
    try { setSession(await requestEmailCode(email.trim().toLowerCase())); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar o código."); }
    finally { setLoading(false); }
  };

  const confirmCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setMessage("");
    try {
      const result = await confirmEmailCode(email.trim().toLowerCase(), code.trim(), session);
      sessionStorage.setItem("pocket-library-id-token", result.IdToken ?? "");
      setMessage("Entrada confirmada. A sincronização será ativada no próximo marco.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível confirmar o código."); }
    finally { setLoading(false); }
  };

  return <>
    <button className="account-button" onClick={() => setOpen(true)}><LogIn size={17} />Entrar</button>
    {open && <div className="account-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <button className="icon-button account-close" onClick={() => setOpen(false)} aria-label="Fechar entrada"><X size={18} /></button>
        <Mail size={24} /><h2 id="account-title">Entre com seu e-mail</h2>
        <p>Enviaremos um código de acesso. Você não precisa criar senha.</p>
        {!session ? <form onSubmit={sendCode}><input type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" /><button disabled={loading}>{loading ? "Enviando…" : "Receber código"}</button></form>
          : <form onSubmit={confirmCode}><input inputMode="numeric" required autoFocus maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="Código de 6 dígitos" /><button disabled={loading}>{loading ? "Confirmando…" : "Entrar"}</button><button type="button" className="account-link" onClick={() => { setSession(""); setCode(""); setMessage(""); }}>Usar outro e-mail</button></form>}
        {message && <p className="account-message">{message}</p>}
      </section>
    </div>}
  </>;
}

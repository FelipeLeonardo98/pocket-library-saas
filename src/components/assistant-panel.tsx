import { BookOpenCheck, Languages, LoaderCircle, Sparkles, X } from "lucide-react";

export type AssistantAction = "explain" | "translate" | "summarize";

interface AssistantPanelProps {
  action: AssistantAction | null;
  answer: string;
  error: string;
  loading: boolean;
  model: string;
  source: string;
  accessKey: string;
  remaining: number | null;
  onAccessKeyChange: (value: string) => void;
  onClose: () => void;
  onRun: (action: AssistantAction) => void;
}

const labels: Record<AssistantAction, string> = {
  explain: "Explicação",
  translate: "Tradução para PT-BR",
  summarize: "Resumo até aqui",
};

export default function AssistantPanel({ action, answer, error, loading, model, source, accessKey, remaining, onAccessKeyChange, onClose, onRun }: AssistantPanelProps) {
  return (
    <aside className="assistant-panel" aria-label="Assistente de leitura">
      <div className="panel-heading">
        <div><span className="eyebrow">IA local · {model || "Llama 3.2"}</span><h2>Assistente de leitura</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar assistente"><X size={19} /></button>
      </div>

      <label className="assistant-access"><span>Chave da beta</span><input type="password" value={accessKey} onChange={(event) => onAccessKeyChange(event.target.value)} placeholder="Cole a chave de acesso" autoComplete="off" /></label>

      <div className="assistant-actions">
        <button onClick={() => onRun("summarize")} disabled={loading}><BookOpenCheck size={17} /> Resumir até aqui</button>
        {source && <button onClick={() => onRun("explain")} disabled={loading}><Sparkles size={17} /> Explicar trecho</button>}
        {source && <button onClick={() => onRun("translate")} disabled={loading}><Languages size={17} /> Traduzir</button>}
      </div>

      {source && action !== "summarize" && <blockquote className="assistant-source">{source}</blockquote>}
      {loading && <div className="assistant-loading"><LoaderCircle size={19} /> O modelo local está pensando…</div>}
      {error && <div className="assistant-error">{error}</div>}
      {!loading && !error && answer && <section className="assistant-answer"><span>{action ? labels[action] : "Resposta"}</span><div>{answer}</div></section>}
      {!loading && !error && !answer && <p className="assistant-hint">Selecione um trecho para traduzir ou explicar. Para relembrar a leitura, gere um resumo até a página atual.</p>}
      <p className="assistant-privacy">{remaining === null ? "A chave fica somente nesta sessão do navegador." : `${remaining} interações disponíveis hoje nesta chave.`} O resumo considera até aproximadamente 14 mil caracteres anteriores.</p>
    </aside>
  );
}

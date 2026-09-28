import { BookOpenCheck, Languages, LoaderCircle, Sparkles, X } from "lucide-react";

export type AssistantAction = "explain" | "translate" | "summarize" | "ask";

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
  question: string;
  onQuestionChange: (value: string) => void;
}

const labels: Record<AssistantAction, string> = {
  explain: "Explicação",
  translate: "Tradução para PT-BR",
  summarize: "Resumo até aqui",
  ask: "Resposta sobre o documento",
};

export default function AssistantPanel({ action, answer, error, loading, model, source, accessKey, remaining, onAccessKeyChange, onClose, onRun, question, onQuestionChange }: AssistantPanelProps) {
  return (
    <aside className="assistant-panel" aria-label="Assistente de leitura">
      <div className="panel-heading">
        <div><span className="eyebrow">IA local · {model || "Llama 3.2"}</span><h2>Assistente de leitura</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar assistente"><X size={19} /></button>
      </div>

      <label className="assistant-access"><span>Chave da beta</span><input type="password" value={accessKey} onChange={(event) => onAccessKeyChange(event.target.value)} placeholder="Cole a chave de acesso" autoComplete="off" /></label>

      <div className="assistant-question"><span>Pergunte sobre este documento</span><textarea value={question} onChange={(event) => onQuestionChange(event.target.value)} placeholder="Ex.: Como configurar esta ferramenta?" rows={3} /><button onClick={() => onRun("ask")} disabled={loading || question.trim().length < 3}><Sparkles size={17} /> Perguntar ao PDF</button></div>

      <div className="assistant-actions">
        <button onClick={() => onRun("summarize")} disabled={loading}><BookOpenCheck size={17} /> Resumir até aqui</button>
        {source && <button onClick={() => onRun("explain")} disabled={loading}><Sparkles size={17} /> Explicar trecho</button>}
        {source && <button onClick={() => onRun("translate")} disabled={loading}><Languages size={17} /> Traduzir</button>}
      </div>

      {source && action !== "summarize" && action !== "ask" && <blockquote className="assistant-source">{source}</blockquote>}
      {loading && <div className="assistant-loading"><LoaderCircle size={19} /> O modelo local está pensando…</div>}
      {error && <div className="assistant-error">{error}</div>}
      {!loading && !error && answer && <section className="assistant-answer"><span>{action ? labels[action] : "Resposta"}</span><div>{answer}</div></section>}
      {!loading && !error && !answer && <p className="assistant-hint">Faça uma pergunta sobre o manual ou PDF, selecione um trecho para traduzir ou explicar, ou gere um resumo até a página atual.</p>}
      <p className="assistant-privacy">{remaining === null ? "A chave fica somente nesta sessão do navegador." : `${remaining} interações disponíveis hoje nesta chave.`} A pergunta usa apenas páginas relevantes, localizadas no navegador.</p>
    </aside>
  );
}

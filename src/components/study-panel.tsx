import { Bookmark, Download, Highlighter, StickyNote, Trash2, X } from "lucide-react";
import type { BookmarkRecord, HighlightRecord } from "@/lib/db";

interface StudyPanelProps {
  highlights: HighlightRecord[];
  bookmarks: BookmarkRecord[];
  onClose: () => void;
  onDeleteHighlight: (id: string) => void;
  onDeleteBookmark: (id: string) => void;
  onExport: () => void;
  onGoToPage: (page: number) => void;
}

export default function StudyPanel({
  highlights,
  bookmarks,
  onClose,
  onDeleteHighlight,
  onDeleteBookmark,
  onExport,
  onGoToPage,
}: StudyPanelProps) {
  return (
    <aside className="study-panel" aria-label="Caderno de estudo">
      <div className="panel-heading">
        <div><span className="eyebrow">Seu material</span><h2>Caderno de estudo</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar caderno"><X size={19} /></button>
      </div>

      <button className="export-button" onClick={onExport} disabled={!highlights.length && !bookmarks.length}>
        <Download size={17} /> Exportar em Markdown
      </button>

      <section className="study-section">
        <h3><Bookmark size={16} /> Marcadores <span>{bookmarks.length}</span></h3>
        {!bookmarks.length && <p className="study-empty">Marque páginas importantes para voltar a elas rapidamente.</p>}
        <div className="study-list">
          {bookmarks.map((bookmark) => (
            <article className="study-item bookmark-item" key={bookmark.id}>
              <button className="study-link" onClick={() => onGoToPage(bookmark.page)}>Página {bookmark.page}</button>
              <button className="mini-delete" onClick={() => onDeleteBookmark(bookmark.id)} aria-label={`Excluir marcador da página ${bookmark.page}`}><Trash2 size={15} /></button>
            </article>
          ))}
        </div>
      </section>

      <section className="study-section">
        <h3><Highlighter size={16} /> Destaques <span>{highlights.length}</span></h3>
        {!highlights.length && <p className="study-empty">No modo Leitura, selecione um trecho para destacar ou anotar.</p>}
        <div className="study-list">
          {highlights.map((highlight) => (
            <article className={`study-item highlight-card highlight-${highlight.color}`} key={highlight.id}>
              <div className="study-item-top">
                <button className="study-link" onClick={() => onGoToPage(highlight.page)}>Página {highlight.page}</button>
                <button className="mini-delete" onClick={() => onDeleteHighlight(highlight.id)} aria-label="Excluir destaque"><Trash2 size={15} /></button>
              </div>
              <blockquote>{highlight.text}</blockquote>
              {highlight.note && <p className="highlight-note"><StickyNote size={14} /> {highlight.note}</p>}
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}

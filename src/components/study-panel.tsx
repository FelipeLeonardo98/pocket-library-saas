import { useMemo, useState } from "react";
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
  const [contentFilter, setContentFilter] = useState<"all" | "notes" | "highlights" | "bookmarks">("all");
  const [pageFilter, setPageFilter] = useState("all");
  const availablePages = useMemo(() => [...new Set([...bookmarks, ...highlights].map((item) => item.page))].sort((a, b) => a - b), [bookmarks, highlights]);
  const matchesPage = (page: number) => pageFilter === "all" || page === Number(pageFilter);
  const visibleBookmarks = bookmarks.filter((item) => matchesPage(item.page) && (contentFilter === "all" || contentFilter === "bookmarks" || (contentFilter === "notes" && Boolean(item.note))));
  const visibleHighlights = highlights.filter((item) => matchesPage(item.page) && (contentFilter === "all" || contentFilter === "highlights" || (contentFilter === "notes" && Boolean(item.note))));
  const visibleCount = visibleBookmarks.length + visibleHighlights.length;

  return (
    <aside className="study-panel" aria-label="Caderno de estudo">
      <div className="panel-heading">
        <div><span className="eyebrow">Seu material</span><h2>Caderno de estudo</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar caderno"><X size={19} /></button>
      </div>

      <button className="export-button" onClick={onExport} disabled={!highlights.length && !bookmarks.length}>
        <Download size={17} /> Exportar em Markdown
      </button>

      <div className="study-filters" aria-label="Filtros do caderno">
        <div className="study-filter-tabs">
          {(["all", "notes", "highlights", "bookmarks"] as const).map((filter) => <button key={filter} className={contentFilter === filter ? "active" : ""} onClick={() => setContentFilter(filter)}>{filter === "all" ? "Tudo" : filter === "notes" ? "Notas" : filter === "highlights" ? "Destaques" : "Marcadores"}</button>)}
        </div>
        <label className="study-page-filter">Página<select value={pageFilter} onChange={(event) => setPageFilter(event.target.value)}><option value="all">Todas</option>{availablePages.map((item) => <option key={item} value={item}>Página {item}</option>)}</select></label>
      </div>
      {(contentFilter !== "all" || pageFilter !== "all") && <p className="study-filter-summary">{visibleCount === 1 ? "1 item encontrado" : `${visibleCount} itens encontrados`}</p>}

      <section className="study-section">
        <h3><Bookmark size={16} /> Marcadores <span>{visibleBookmarks.length}</span></h3>
        {!visibleBookmarks.length && <p className="study-empty">{bookmarks.length ? "Nenhum marcador corresponde a este filtro." : "Marque páginas importantes para voltar a elas rapidamente."}</p>}
        <div className="study-list">
          {visibleBookmarks.map((bookmark) => (
            <article className="study-item bookmark-item" key={bookmark.id}>
              <div className="study-item-top">
                <button className="study-link" onClick={() => onGoToPage(bookmark.page)}>Página {bookmark.page}</button>
                <button className="mini-delete" onClick={() => onDeleteBookmark(bookmark.id)} aria-label={`Excluir marcador da página ${bookmark.page}`}><Trash2 size={15} /></button>
              </div>
              {bookmark.note && <p className="highlight-note"><StickyNote size={14} /> {bookmark.note}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="study-section">
        <h3><Highlighter size={16} /> Destaques <span>{visibleHighlights.length}</span></h3>
        {!visibleHighlights.length && <p className="study-empty">{highlights.length ? "Nenhum destaque corresponde a este filtro." : "No modo Leitura, selecione um trecho para destacar ou anotar."}</p>}
        <div className="study-list">
          {visibleHighlights.map((highlight) => (
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

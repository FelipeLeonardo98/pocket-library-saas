"use client";

import { useCallback, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, FilePlus2, Library, Trash2 } from "lucide-react";
import { db, type BookRecord } from "@/lib/db";
import PdfViewer from "./pdf-viewer";

function formatBytes(bytes: number) {
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

export default function ReaderApp() {
  const [selectedBook, setSelectedBook] = useState<BookRecord | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const books = useLiveQuery(() => db.books.orderBy("updatedAt").reverse().toArray(), []);
  const selectedBookId = selectedBook?.id;

  const importPdf = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setMessage("Escolha um arquivo PDF válido.");
      return;
    }

    setImporting(true);
    setMessage(null);
    const existing = await db.books.where("fileName").equals(file.name).first();
    if (existing && existing.size === file.size) {
      setImporting(false);
      setMessage("Este PDF já está na sua biblioteca.");
      setSelectedBook(existing);
      return;
    }

    const now = Date.now();
    const book: BookRecord = {
      id: crypto.randomUUID(),
      title: file.name.replace(/\.pdf$/i, ""),
      fileName: file.name,
      file,
      size: file.size,
      pageCount: null,
      lastPage: 1,
      addedAt: now,
      updatedAt: now,
    };

    await db.books.add(book);
    setImporting(false);
    setSelectedBook(book);
  };

  const removeBook = async (book: BookRecord) => {
    if (!window.confirm(`Remover “${book.title}” da biblioteca local?`)) return;
    await db.books.delete(book.id);
  };

  const saveProgress = useCallback(async (page: number, pageCount: number) => {
    if (!selectedBookId) return;
    const updatedAt = Date.now();
    await db.books.update(selectedBookId, { lastPage: page, pageCount, updatedAt });
  }, [selectedBookId]);

  if (selectedBook) {
    return <PdfViewer book={selectedBook} onBack={() => setSelectedBook(null)} onProgress={saveProgress} />;
  }

  return (
    <main className="library-shell">
      <aside className="sidebar">
        <div className="brand"><BookOpen size={24} /><span>EstudoPDF</span></div>
        <nav><span className="nav-item active"><Library size={18} />Minha biblioteca</span></nav>
        <p className="sidebar-note">Seus PDFs ficam somente neste navegador.</p>
      </aside>

      <section className="library-content">
        <header className="library-header">
          <div>
            <span className="eyebrow">Leitor local</span>
            <h1>Minha Biblioteca</h1>
            <p>Seus livros técnicos, em um só lugar.</p>
          </div>
          <button className="primary-button" onClick={() => fileInput.current?.click()} disabled={importing}>
            <FilePlus2 size={19} />{importing ? "Importando…" : "Adicionar PDF"}
          </button>
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importPdf(file);
            event.currentTarget.value = "";
          }} />
        </header>

        {message && <div className="notice">{message}</div>}

        {!books ? (
          <div className="empty-state"><span className="spinner" />Carregando sua biblioteca…</div>
        ) : books.length === 0 ? (
          <button className="empty-state empty-action" onClick={() => fileInput.current?.click()}>
            <span className="empty-icon"><FilePlus2 size={28} /></span>
            <strong>Adicione seu primeiro livro</strong>
            <span>Escolha um PDF do computador para começar a leitura.</span>
          </button>
        ) : (
          <div className="book-grid">
            {books.map((book) => {
              const progress = book.pageCount ? Math.round((book.lastPage / book.pageCount) * 100) : 0;
              return (
                <article className="book-card" key={book.id}>
                  <button className="book-main" onClick={() => setSelectedBook(book)}>
                    <span className="book-cover"><BookOpen size={42} /><small>PDF</small></span>
                    <span className="book-info"><strong>{book.title}</strong><small>{book.pageCount ? `${book.pageCount} páginas` : formatBytes(book.size)}</small></span>
                    <span className="book-progress"><i style={{ width: `${progress}%` }} /></span>
                    <span className="progress-label">{progress ? `${progress}% lido` : "Começar leitura"}</span>
                  </button>
                  <button className="book-menu" onClick={() => void removeBook(book)} aria-label={`Remover ${book.title}`} title="Remover da biblioteca"><Trash2 size={17} /></button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

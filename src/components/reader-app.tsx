"use client";

import { useCallback, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, FilePlus2, FolderPlus, Library, Pencil, Search, Trash2 } from "lucide-react";
import { db, type BookRecord, type CollectionRecord, type CoverTone, type ReadingProfile } from "@/lib/db";
import AccountButton from "./account-button";
import PdfViewer from "./pdf-viewer";

const profiles: Record<ReadingProfile, { label: string; description: string }> = {
  literary: { label: "Livro literário", description: "Recapitulações sem spoilers." },
  technical: { label: "Estudo técnico", description: "Explicações, tradução e revisão." },
  manual: { label: "Manual ou tutorial", description: "Passos, alertas e perguntas práticas." },
};
const tones: CoverTone[] = ["charcoal", "ocean", "forest", "plum", "sunset"];
const formatBytes = (bytes: number) => { const mb = bytes / 1024 / 1024; return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`; };
const formatReadingTime = (seconds = 0) => { const min = Math.floor(seconds / 60); return min < 1 ? "Comece a ler" : min < 60 ? `${min} min lidos` : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}min` : ""} lidas`; };
function estimateRemaining(book: BookRecord) { const seconds = book.readingSeconds ?? 0; if (!book.pageCount || book.lastPage < 2 || seconds < 60) return null; const min = Math.max(1, Math.ceil(((book.pageCount - book.lastPage) / ((book.lastPage - 1) / seconds)) / 60)); return min < 60 ? `~${min} min restantes` : `~${Math.ceil(min / 60)}h restantes`; }

export default function ReaderApp() {
  const [selectedBook, setSelectedBook] = useState<BookRecord | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editingBook, setEditingBook] = useState<BookRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [profileFilter, setProfileFilter] = useState<"all" | ReadingProfile>("all");
  const [collectionFilter, setCollectionFilter] = useState<string | "all">("all");
  const fileInput = useRef<HTMLInputElement>(null);
  const books = useLiveQuery(() => db.books.orderBy("updatedAt").reverse().toArray(), []);
  const collections = useLiveQuery(() => db.collections.orderBy("name").toArray(), []);
  const selectedBookId = selectedBook?.id;

  const stageImport = (file: File) => { if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { setMessage("Escolha um arquivo PDF válido."); return; } setMessage(null); setPendingFile(file); };
  const createBook = async (draft: Draft) => { if (!pendingFile) return; const existing = await db.books.where("fileName").equals(pendingFile.name).first(); if (existing && existing.size === pendingFile.size) { setMessage("Este PDF já está na sua biblioteca."); setSelectedBook(existing); setPendingFile(null); return; } const now = Date.now(); const book: BookRecord = { id: crypto.randomUUID(), title: draft.title.trim() || pendingFile.name.replace(/\.pdf$/i, ""), fileName: pendingFile.name, file: pendingFile, size: pendingFile.size, pageCount: null, lastPage: 1, readingSeconds: 0, readingProfile: draft.readingProfile, coverTone: draft.coverTone, collectionId: draft.collectionId, addedAt: now, updatedAt: now }; await db.books.add(book); setPendingFile(null); setSelectedBook(book); };
  const updateBook = async (draft: Draft) => { if (!editingBook) return; await db.books.update(editingBook.id, { ...draft, updatedAt: Date.now() }); setEditingBook(null); };
  const removeBook = async (book: BookRecord) => { if (window.confirm(`Remover “${book.title}” da biblioteca local?`)) await db.books.delete(book.id); };
  const addCollection = async () => { const name = window.prompt("Nome da nova coleção:"); if (name?.trim()) await db.collections.add({ id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now() }); };
  const saveProgress = useCallback(async (page: number, pageCount: number) => { if (selectedBookId) await db.books.update(selectedBookId, { lastPage: page, pageCount, updatedAt: Date.now() }); }, [selectedBookId]);
  const saveReadingTime = useCallback(async (seconds: number) => { if (!selectedBookId || seconds < 1) return; const book = await db.books.get(selectedBookId); if (book) await db.books.update(selectedBookId, { readingSeconds: (book.readingSeconds ?? 0) + seconds, updatedAt: Date.now() }); }, [selectedBookId]);
  if (selectedBook) return <PdfViewer book={selectedBook} onBack={() => setSelectedBook(null)} onProgress={saveProgress} onReadingTime={saveReadingTime} />;
  const filteredBooks = (books ?? []).filter((book) => (profileFilter === "all" || (book.readingProfile ?? "technical") === profileFilter) && (collectionFilter === "all" || book.collectionId === collectionFilter) && book.title.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));

  return <main className="library-shell">
    <aside className="sidebar"><div className="brand"><BookOpen size={24} /><span>Pocket Library</span></div><nav><span className="nav-item active"><Library size={18} />Minha biblioteca</span></nav><div className="collection-nav"><span>Coleções</span><button onClick={() => void addCollection()} aria-label="Criar coleção"><FolderPlus size={16} /></button></div><button className={`collection-link ${collectionFilter === "all" ? "selected" : ""}`} onClick={() => setCollectionFilter("all")}>Todos os PDFs</button>{collections?.map((item) => <button key={item.id} className={`collection-link ${collectionFilter === item.id ? "selected" : ""}`} onClick={() => setCollectionFilter(item.id)}>{item.name}</button>)}<p className="sidebar-note">Seus PDFs e coleções ficam somente neste navegador.</p></aside>
    <section className="library-content"><header className="library-header"><div><span className="eyebrow">Biblioteca pessoal</span><h1>Minha Biblioteca</h1><p>Livros, manuais e materiais de estudo em um só lugar.</p></div><button className="primary-button" onClick={() => fileInput.current?.click()}><FilePlus2 size={19} />Adicionar PDF</button><AccountButton /><input ref={fileInput} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) stageImport(file); event.currentTarget.value = ""; }} /></header>
      {message && <div className="notice">{message}</div>}<div className="library-filters"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na biblioteca" /></label><select value={profileFilter} onChange={(event) => setProfileFilter(event.target.value as "all" | ReadingProfile)}><option value="all">Todos os perfis</option>{Object.entries(profiles).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></div>
      {!books ? <div className="empty-state"><span className="spinner" />Carregando sua biblioteca…</div> : books.length === 0 ? <button className="empty-state empty-action" onClick={() => fileInput.current?.click()}><span className="empty-icon"><FilePlus2 size={28} /></span><strong>Adicione seu primeiro PDF</strong><span>Escolha um livro, manual ou tutorial para começar.</span></button> : <div className="book-grid">{filteredBooks.map((book) => { const progress = book.pageCount ? Math.round((book.lastPage / book.pageCount) * 100) : 0; const profile = profiles[book.readingProfile ?? "technical"]; return <article className="book-card" key={book.id}><button className="book-main" onClick={() => setSelectedBook(book)}><span className={`book-cover tone-${book.coverTone ?? "charcoal"}`}><BookOpen size={42} /><small>{profile.label}</small></span><span className="book-info"><strong>{book.title}</strong><small>{book.pageCount ? `${book.pageCount} páginas · ${formatReadingTime(book.readingSeconds)}` : formatBytes(book.size)}</small></span><span className="book-progress"><i style={{ width: `${progress}%` }} /></span><span className="progress-label">{estimateRemaining(book) ?? (progress ? `${progress}% lido` : profile.label)}</span></button><div className="book-actions"><button onClick={() => setEditingBook(book)} aria-label={`Editar ${book.title}`}><Pencil size={16} /></button><button onClick={() => void removeBook(book)} aria-label={`Remover ${book.title}`}><Trash2 size={16} /></button></div></article>; })}</div>}
    </section>{(pendingFile || editingBook) && <BookEditor file={pendingFile} book={editingBook} collections={collections ?? []} onClose={() => { setPendingFile(null); setEditingBook(null); }} onSave={(draft) => void (pendingFile ? createBook(draft) : updateBook(draft))} />}
  </main>;
}

type Draft = Pick<BookRecord, "title" | "readingProfile" | "coverTone" | "collectionId">;
function BookEditor({ file, book, collections, onClose, onSave }: { file: File | null; book: BookRecord | null; collections: CollectionRecord[]; onClose: () => void; onSave: (draft: Draft) => void; }) {
  const [title, setTitle] = useState(book?.title ?? file?.name.replace(/\.pdf$/i, "") ?? ""); const [profile, setProfile] = useState<ReadingProfile>(book?.readingProfile ?? "technical"); const [tone, setTone] = useState<CoverTone>(book?.coverTone ?? "charcoal"); const [collectionId, setCollectionId] = useState(book?.collectionId ?? "");
  return <div className="book-editor-backdrop"><section className="book-editor"><span className="eyebrow">{book ? "Organizar PDF" : "Novo PDF"}</span><h2>{book ? "Editar documento" : "Como você vai ler este PDF?"}</h2><label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><fieldset><legend>Perfil de leitura</legend>{Object.entries(profiles).map(([id, item]) => <button key={id} className={profile === id ? "selected" : ""} onClick={() => setProfile(id as ReadingProfile)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</fieldset><label>Coleção<select value={collectionId} onChange={(event) => setCollectionId(event.target.value)}><option value="">Sem coleção</option>{collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><fieldset><legend>Capa visual</legend><div className="tone-options">{tones.map((item) => <button key={item} className={`tone-${item} ${tone === item ? "selected" : ""}`} onClick={() => setTone(item)} aria-label={`Capa ${item}`} />)}</div></fieldset><div className="dialog-actions"><button onClick={onClose}>Cancelar</button><button className="save-note" onClick={() => onSave({ title, readingProfile: profile, coverTone: tone, collectionId: collectionId || undefined })}>{book ? "Salvar" : "Adicionar à biblioteca"}</button></div></section></div>;
}

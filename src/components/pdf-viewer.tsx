"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Expand,
  FileText,
  Focus,
  Highlighter,
  Languages,
  Minus,
  Plus,
  RotateCcw,
  ScanText,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask, TextLayer } from "pdfjs-dist";
import AssistantPanel, { type AssistantAction } from "@/components/assistant-panel";
import StudyPanel from "@/components/study-panel";
import { db, type BookRecord, type HighlightColor, type HighlightRecord, type HighlightRect, type ReaderPreferences } from "@/lib/db";

const defaultPreferences: ReaderPreferences = {
  key: "reader",
  viewMode: "page",
  theme: "light",
  fontFamily: "serif",
  fontSize: 19,
  lineHeight: 1.7,
  margin: 64,
  brightness: 1,
};

interface PdfViewerProps {
  book: BookRecord;
  onBack: () => void;
  onProgress: (page: number, pageCount: number) => void;
  onReadingTime: (seconds: number) => void;
}

interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  top: number;
  left: number;
  rects?: HighlightRect[];
}

interface SearchResult {
  page: number;
  excerpt: string;
}

export default function PdfViewer({ book, onBack, onProgress, onReadingTime }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageSurfaceRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const readingParagraphRef = useRef<HTMLParagraphElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textCache = useRef(new Map<number, string>());
  const searchCancelled = useRef(false);
  const readingTickRef = useRef(Date.now());
  const preferences = useLiveQuery(() => db.settings.get("reader"), []) ?? defaultPreferences;
  const highlights = useLiveQuery(() => db.highlights.where("bookId").equals(book.id).sortBy("page"), [book.id]) ?? [];
  const bookmarks = useLiveQuery(() => db.bookmarks.where("bookId").equals(book.id).sortBy("page"), [book.id]) ?? [];
  const ocrPageRecords = useLiveQuery(() => db.ocrPages.where("bookId").equals(book.id).toArray(), [book.id]);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(Math.max(1, book.lastPage));
  const [pageInput, setPageInput] = useState(String(Math.max(1, book.lastPage)));
  const [pageCount, setPageCount] = useState(book.pageCount ?? 0);
  const [scale, setScale] = useState(1.1);
  const [readingText, setReadingText] = useState("");
  const [extractingText, setExtractingText] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantAction, setAssistantAction] = useState<AssistantAction | null>(null);
  const [assistantSource, setAssistantSource] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [assistantError, setAssistantError] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantModel, setAssistantModel] = useState("Llama 3.2");
  const [assistantAccessKey, setAssistantAccessKey] = useState("");
  const [assistantRemaining, setAssistantRemaining] = useState<number | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [textSelection, setTextSelection] = useState<TextSelection | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTheme, setShareTheme] = useState<"paper" | "dark" | "caramel">("paper");
  const [shareFormat, setShareFormat] = useState<"feed" | "story">("feed");
  const [bookmarkNoteOpen, setBookmarkNoteOpen] = useState(false);
  const [bookmarkNoteDraft, setBookmarkNoteDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const pageHighlights = highlights.filter((highlight) => highlight.page === page);
  const currentBookmark = bookmarks.find((bookmark) => bookmark.page === page);
  const ocrByPage = useMemo(() => new Map((ocrPageRecords ?? []).map((item) => [item.page, item.text])), [ocrPageRecords]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const createShareCard = async () => {
    if (!textSelection) throw new Error("Selecione um trecho primeiro.");
    const dimensions = shareFormat === "feed" ? { width: 1080, height: 1350 } : { width: 1080, height: 1920 };
    const palette = shareTheme === "dark" ? { background: "#29231e", ink: "#f7f3ec", accent: "#cf9b5a" } : shareTheme === "caramel" ? { background: "#cf9b5a", ink: "#3b2d20", accent: "#f7f3ec" } : { background: "#f7f3ec", ink: "#3b2d20", accent: "#cf9b5a" };
    const canvas = document.createElement("canvas"); canvas.width = dimensions.width; canvas.height = dimensions.height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Não foi possível criar o card.");
    context.fillStyle = palette.background; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = palette.accent; context.fillRect(76, 94, 130, 10);
    context.fillStyle = palette.ink; context.font = "700 25px Arial"; context.fillText("POCKET LIBRARY", 76, 155);
    const quote = textSelection.text.length > 420 ? `${textSelection.text.slice(0, 417).trimEnd()}…` : textSelection.text;
    context.font = "700 56px Georgia"; context.fillStyle = palette.ink;
    const lines = wrapCanvasText(context, `“${quote}”`, canvas.width - 152); let y = shareFormat === "feed" ? 300 : 420;
    for (const line of lines) { context.fillText(line, 76, y); y += 76; }
    const footerY = canvas.height - 175; context.fillStyle = palette.accent; context.fillRect(76, footerY - 50, canvas.width - 152, 2);
    context.fillStyle = palette.ink; context.font = "600 26px Arial"; context.fillText(book.title.slice(0, 64), 76, footerY);
    context.font = "400 23px Arial"; context.fillText(`Página ${page}  •  Leve o conhecimento. Não o peso.`, 76, footerY + 44);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível exportar o card.")), "image/png"));
  };

  const downloadShareCard = async () => {
    const blob = await createShareCard(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "pocket-library-destaque.png"; link.click(); URL.revokeObjectURL(url); showToast("Card baixado para compartilhar.");
  };

  const shareCard = async () => {
    const blob = await createShareCard(); const file = new File([blob], "pocket-library-destaque.png", { type: "image/png" });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) { await navigator.share({ title: "Pocket Library", text: `${book.title} — página ${page}`, files: [file] }); showToast("Card pronto para compartilhar."); return; }
    await downloadShareCard();
  };

  const getPageText = useCallback(async (pageNumber: number) => {
    if (!pdfDocument) return "";
    const cached = textCache.current.get(pageNumber);
    if (cached !== undefined) return cached;
    const pdfPage = await pdfDocument.getPage(pageNumber);
    const content = await pdfPage.getTextContent();
    const text = content.items
      .filter((item): item is typeof item & { str: string; hasEOL?: boolean } => "str" in item)
      .map((item) => `${item.str}${item.hasEOL ? "\n" : " "}`)
      .join("")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const resolvedText = text || ocrByPage.get(pageNumber) || "";
    textCache.current.set(pageNumber, resolvedText);
    return resolvedText;
  }, [ocrByPage, pdfDocument]);

  const runOcrForCurrentPage = async () => {
    if (!pdfDocument || ocrProcessing) return;
    setOcrProcessing(true);
    setOcrProgress(0);
    try {
      const pdfPage = await pdfDocument.getPage(page);
      const viewport = pdfPage.getViewport({ scale: 2.25 });
      const image = document.createElement("canvas");
      image.width = Math.ceil(viewport.width);
      image.height = Math.ceil(viewport.height);
      const context = image.getContext("2d");
      if (!context) throw new Error("Não foi possível preparar a imagem para OCR.");
      await pdfPage.render({ canvas: image, viewport }).promise;
      const { recognize } = await import("tesseract.js");
      const result = await recognize(image, "por+eng", {
        logger: (event) => {
          if (event.status === "recognizing text") setOcrProgress(Math.round(event.progress * 100));
        },
      });
      const text = result.data.text.replace(/\n{3,}/g, "\n\n").trim();
      if (!text) throw new Error("Não foi possível identificar texto nesta página.");
      const now = Date.now();
      await db.ocrPages.put({ id: `${book.id}:${page}`, bookId: book.id, page, text, createdAt: now });
      textCache.current.set(page, text);
      setReadingText(text);
      showToast("OCR concluído. O texto foi salvo neste dispositivo.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível executar o OCR desta página.");
    } finally {
      setOcrProcessing(false);
      setOcrProgress(0);
    }
  };

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    const flushReadingTime = () => {
      if (document.visibilityState !== "visible") {
        readingTickRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - readingTickRef.current) / 1000);
      readingTickRef.current = now;
      if (elapsedSeconds > 0) onReadingTime(elapsedSeconds);
    };
    const onVisibilityChange = () => flushReadingTime();
    readingTickRef.current = Date.now();
    const timer = window.setInterval(flushReadingTime, 15_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flushReadingTime();
    };
  }, [onReadingTime]);

  useEffect(() => {
    setAssistantAccessKey(sessionStorage.getItem("estudo-pdf-beta-key") ?? "");
  }, []);

  const updateAssistantAccessKey = (value: string) => {
    setAssistantAccessKey(value);
    if (value) sessionStorage.setItem("estudo-pdf-beta-key", value);
    else sessionStorage.removeItem("estudo-pdf-beta-key");
  };

  const updatePreferences = useCallback((change: Partial<ReaderPreferences>) => {
    void db.settings.put({ ...preferences, ...change, key: "reader" });
  }, [preferences]);

  useEffect(() => {
    let disposed = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        loadingTask = pdfjs.getDocument({ data: new Uint8Array(await book.file.arrayBuffer()) });
        const loadedDocument = await loadingTask.promise;
        if (disposed) return;
        const count = loadedDocument.numPages;
        const initialPage = Math.min(Math.max(book.lastPage, 1), count);
        setPdfDocument(loadedDocument);
        setPageCount(count);
        setPage(initialPage);
        setPageInput(String(initialPage));
        onProgress(initialPage, count);
      } catch (error) {
        if (!disposed) setLoadingError(error instanceof Error ? error.message : "Não foi possível abrir este PDF.");
      }
    })();

    return () => {
      disposed = true;
      void loadingTask?.destroy();
    };
  }, [book.file, book.lastPage, onProgress]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || preferences.viewMode !== "page") return;
    let task: RenderTask | null = null;
    let textLayer: TextLayer | null = null;
    let cancelled = false;

    void (async () => {
      const pdfPage = await pdfDocument.getPage(page);
      if (cancelled || !canvasRef.current || !textLayerRef.current) return;
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      task = pdfPage.render({ canvas, viewport });
      const textContent = await pdfPage.getTextContent();
      await task.promise;
      if (cancelled || !textLayerRef.current) return;
      const container = textLayerRef.current;
      container.replaceChildren();
      container.style.setProperty("--total-scale-factor", String(viewport.scale));
      const pdfjs = await import("pdfjs-dist");
      textLayer = new pdfjs.TextLayer({ textContentSource: textContent, container, viewport });
      await textLayer.render();
    })().catch((error) => {
      if (!cancelled && error instanceof Error && error.name !== "RenderingCancelledException") setLoadingError(error.message);
    });

    return () => {
      cancelled = true;
      task?.cancel();
      textLayer?.cancel();
    };
  }, [page, pdfDocument, preferences.viewMode, scale]);

  useEffect(() => {
    if (!pdfDocument || preferences.viewMode !== "reading") return;
    let cancelled = false;

    void (async () => {
      setExtractingText(true);
      const text = await getPageText(page);
      if (cancelled) return;
      setReadingText(text);
      setExtractingText(false);
    })().catch((error) => {
      if (!cancelled) {
        setExtractingText(false);
        setLoadingError(error instanceof Error ? error.message : "Não foi possível extrair o texto.");
      }
    });

    return () => { cancelled = true; };
  }, [getPageText, page, pdfDocument, preferences.viewMode]);

  useEffect(() => {
    const handleFullscreen = () => {
      if (!document.fullscreenElement) setFocusMode(false);
    };
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  const goToPage = useCallback((nextPage: number) => {
    const bounded = Math.min(Math.max(nextPage, 1), pageCount || 1);
    setPage(bounded);
    setPageInput(String(bounded));
    setReadingText("");
    setTextSelection(null);
    if (pageCount) onProgress(bounded, pageCount);
  }, [onProgress, pageCount]);

  const submitPageInput = () => {
    const requestedPage = Number.parseInt(pageInput, 10);
    if (Number.isFinite(requestedPage) && requestedPage >= 1) {
      goToPage(requestedPage);
      return;
    }
    setPageInput(String(page));
  };

  const handleTextSelection = useCallback(() => {
    const paragraph = readingParagraphRef.current;
    const selection = window.getSelection();
    if (!paragraph || !selection || selection.isCollapsed || !selection.rangeCount) {
      setTextSelection(null);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!paragraph.contains(range.commonAncestorContainer)) return;
    const rawText = range.toString();
    const selectedText = rawText.trim();
    if (!selectedText) return;

    const prefixRange = range.cloneRange();
    prefixRange.selectNodeContents(paragraph);
    prefixRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = prefixRange.toString().length + (rawText.length - rawText.trimStart().length);
    const rect = range.getBoundingClientRect();
    setTextSelection({
      text: selectedText,
      startOffset,
      endOffset: startOffset + selectedText.length,
      top: Math.max(70, rect.top - 52),
      left: Math.min(window.innerWidth - 155, Math.max(155, rect.left + rect.width / 2)),
    });
  }, []);

  const handlePdfSelection = useCallback(() => {
    const textLayer = textLayerRef.current;
    const surface = pageSurfaceRef.current;
    const selection = window.getSelection();
    if (!textLayer || !surface || !selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!textLayer.contains(range.commonAncestorContainer)) return;
    const selectedText = range.toString().replace(/\s+/g, " ").trim();
    if (!selectedText) return;

    const surfaceRect = surface.getBoundingClientRect();
    const rects = Array.from(range.getClientRects())
      .filter((rect) => rect.width > 1 && rect.height > 1)
      .map((rect) => ({
        left: ((rect.left - surfaceRect.left) / surfaceRect.width) * 100,
        top: ((rect.top - surfaceRect.top) / surfaceRect.height) * 100,
        width: (rect.width / surfaceRect.width) * 100,
        height: (rect.height / surfaceRect.height) * 100,
      }));
    if (!rects.length) return;
    const selectionRect = range.getBoundingClientRect();
    setTextSelection({
      text: selectedText,
      startOffset: -1,
      endOffset: -1,
      rects,
      top: Math.max(70, selectionRect.top - 52),
      left: Math.min(window.innerWidth - 155, Math.max(155, selectionRect.left + selectionRect.width / 2)),
    });
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        if (preferences.viewMode === "page") handlePdfSelection();
        else handleTextSelection();
      });
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      cancelAnimationFrame(animationFrame);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handlePdfSelection, handleTextSelection, preferences.viewMode]);

  const saveHighlight = async (color: HighlightColor, note = "") => {
    if (!textSelection) return;
    const overlaps = textSelection.startOffset >= 0 && pageHighlights.some((item) => item.startOffset >= 0 && textSelection.startOffset < item.endOffset && textSelection.endOffset > item.startOffset);
    if (overlaps) {
      showToast("Este trecho já faz parte de outro destaque.");
      return;
    }

    const now = new Date().getTime();
    await db.highlights.add({
      id: crypto.randomUUID(),
      bookId: book.id,
      page,
      text: textSelection.text,
      startOffset: textSelection.startOffset,
      endOffset: textSelection.endOffset,
      color,
      note: note.trim(),
      rects: textSelection.rects,
      createdAt: now,
      updatedAt: now,
    });
    window.getSelection()?.removeAllRanges();
    setTextSelection(null);
    setNoteOpen(false);
    setNoteDraft("");
    showToast(note.trim() ? "Destaque e nota salvos." : "Destaque salvo.");
  };

  const openBookmarkNote = () => {
    setBookmarkNoteDraft(currentBookmark?.note ?? "");
    setBookmarkNoteOpen(true);
  };

  const saveBookmark = async () => {
    const now = new Date().getTime();
    const note = bookmarkNoteDraft.trim();
    if (currentBookmark) {
      await db.bookmarks.update(currentBookmark.id, { note, updatedAt: now });
      showToast(note ? "Anotação do marcador atualizada." : "Marcador atualizado.");
    } else {
      await db.bookmarks.add({ id: `${book.id}:${page}`, bookId: book.id, page, note, createdAt: now, updatedAt: now });
      showToast(note ? "Página marcada com anotação." : "Página marcada.");
    }
    setBookmarkNoteOpen(false);
    setBookmarkNoteDraft("");
  };

  const removeCurrentBookmark = async () => {
    if (!currentBookmark) return;
    await db.bookmarks.delete(currentBookmark.id);
    setBookmarkNoteOpen(false);
    setBookmarkNoteDraft("");
    showToast("Marcador removido.");
  };

  const exportStudyNotes = () => {
    const lines = [`# ${book.title}`, "", "## Marcadores", ""];
    lines.push(...(bookmarks.length ? bookmarks.flatMap((item) => item.note ? [`- Página ${item.page}`, `  - Nota: ${item.note}`] : [`- Página ${item.page}`]) : ["Nenhum marcador."]));
    lines.push("", "## Destaques", "");
    if (!highlights.length) lines.push("Nenhum destaque.");
    for (const item of highlights) {
      lines.push(`### Página ${item.page}`, "", `> ${item.text.replace(/\n/g, "\n> ")}`, "");
      if (item.note) lines.push(`**Nota:** ${item.note}`, "");
    }
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${book.title.replace(/[^a-z0-9áàâãéêíóôõúç_-]+/gi, "-").replace(/^-|-$/g, "") || "notas"}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Caderno exportado.");
  };

  const collectReadingContext = async () => {
    if (!pdfDocument) return "";
    const chunks: string[] = [];
    let characterCount = 0;
    for (let pageNumber = page; pageNumber >= 1 && characterCount < 14_000; pageNumber -= 1) {
      const text = await getPageText(pageNumber);
      if (text) {
        chunks.unshift(`Página ${pageNumber}\n${text}`);
        characterCount += text.length;
      }
    }
    return chunks.join("\n\n").slice(-14_000);
  };

  const collectQuestionContext = async (question: string) => {
    if (!pdfDocument) return "";
    const terms = question.toLocaleLowerCase("pt-BR").match(/[\p{L}\p{N}_-]{3,}/gu) ?? [];
    const scored: Array<{ page: number; score: number; text: string }> = [];
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const text = await getPageText(pageNumber);
      const normalized = text.toLocaleLowerCase("pt-BR");
      const score = terms.reduce((total, term) => total + normalized.split(term).length - 1, 0);
      if (score) scored.push({ page: pageNumber, score, text });
    }
    const selected = (scored.length ? scored.sort((a, b) => b.score - a.score) : [{ page, score: 0, text: await getPageText(page) }]).slice(0, 4);
    let used = 0;
    return selected.reduce<string[]>((chunks, item) => {
      if (!item.text || used >= 14_000) return chunks;
      const excerpt = item.text.slice(0, 14_000 - used);
      used += excerpt.length;
      chunks.push(`Página ${item.page}\n${excerpt}`);
      return chunks;
    }, []).join("\n\n");
  };

  const runSearch = async () => {
    const query = searchQuery.trim().replace(/\s+/g, " ");
    if (!pdfDocument || query.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    searchCancelled.current = false;
    setSearching(true);
    setHasSearched(true);
    setSearchResults([]);
    const normalizedQuery = query.toLocaleLowerCase("pt-BR");
    const results: SearchResult[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        if (searchCancelled.current) return;
        const text = await getPageText(pageNumber);
        const normalizedText = text.toLocaleLowerCase("pt-BR");
        const matchAt = normalizedText.indexOf(normalizedQuery);
        if (matchAt < 0) continue;
        const start = Math.max(0, matchAt - 64);
        const end = Math.min(text.length, matchAt + query.length + 96);
        results.push({
          page: pageNumber,
          excerpt: `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ")}${end < text.length ? "…" : ""}`,
        });
        setSearchResults([...results]);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível pesquisar neste PDF.");
    } finally {
      if (!searchCancelled.current) setSearching(false);
    }
  };

  const runAssistant = async (action: AssistantAction, sourceOverride?: string) => {
    if (assistantLoading) return;
    const source = sourceOverride ?? (action === "ask" ? assistantQuestion : assistantSource);
    setAssistantOpen(true);
    setAssistantAction(action);
    setAssistantAnswer("");
    setAssistantError("");
    setAssistantLoading(true);
    setSettingsOpen(false);
    setStudyOpen(false);
    if (sourceOverride) setAssistantSource(sourceOverride);
    if (sourceOverride) {
      window.getSelection()?.removeAllRanges();
      setTextSelection(null);
    }

    try {
      const configuredUrl = process.env.NEXT_PUBLIC_ASSISTANT_API_URL?.replace(/\/$/, "");
      if (!configuredUrl) throw new Error("Configure NEXT_PUBLIC_ASSISTANT_API_URL para usar a inteligência artificial.");
      const endpoint = `${configuredUrl}/assistant`;
      if (!assistantAccessKey.trim()) throw new Error("Informe a chave da beta para usar a inteligência artificial.");
      const context = action === "summarize" ? await collectReadingContext() : action === "ask" ? await collectQuestionContext(source) : "";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(assistantAccessKey.trim() ? { "X-Beta-Key": assistantAccessKey.trim() } : {}) },
        body: JSON.stringify({ action, text: source, context, bookTitle: book.title, page, readingProfile: book.readingProfile ?? "technical" }),
      });
      const data = await response.json() as { answer?: string; error?: string; model?: string; quota?: { remaining?: number } };
      if (!response.ok || !data.answer) throw new Error(data.error || "O assistente não retornou uma resposta.");
      setAssistantAnswer(data.answer);
      if (data.model) setAssistantModel(data.model);
      if (typeof data.quota?.remaining === "number") setAssistantRemaining(data.quota.remaining);
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : "Não foi possível consultar o assistente.");
    } finally {
      setAssistantLoading(false);
    }
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goToPage(page - 1);
      if (event.key === "ArrowRight") goToPage(page + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goToPage, page]);

  const enterFocusMode = async () => {
    setSettingsOpen(false);
    setStudyOpen(false);
    setAssistantOpen(false);
    setFocusMode(true);
    try { await document.documentElement.requestFullscreen(); } catch { /* Interface limpa ainda funciona sem fullscreen. */ }
  };

  const exitFocusMode = async () => {
    setFocusMode(false);
    if (document.fullscreenElement) await document.exitFullscreen();
  };

  const progress = pageCount ? Math.round((page / pageCount) * 100) : 0;
  const readerStyle = {
    "--reader-brightness": preferences.brightness,
    "--reading-size": `${preferences.fontSize}px`,
    "--reading-leading": preferences.lineHeight,
    "--reading-margin": `${preferences.margin}px`,
  } as CSSProperties;

  return (
    <main className={`reader-shell theme-${preferences.theme} ${focusMode ? "focus-mode" : ""}`} style={readerStyle}>
      <header className="reader-header">
        <button className="icon-button" onClick={onBack} aria-label="Voltar à biblioteca"><ArrowLeft size={20} /></button>
        <div className="reader-title"><strong>{book.title}</strong><span>{pageCount ? `${pageCount} páginas` : "Carregando PDF…"}</span></div>
        <div className="reader-actions">
          <div className="view-switch" aria-label="Modo de visualização">
            <button className={preferences.viewMode === "page" ? "active" : ""} onClick={() => updatePreferences({ viewMode: "page" })}><FileText size={16} />Página</button>
            <button className={preferences.viewMode === "reading" ? "active" : ""} onClick={() => updatePreferences({ viewMode: "reading" })}><BookOpenText size={16} />Leitura</button>
          </div>
          {preferences.viewMode === "page" && <>
            <button className="icon-button" onClick={() => setScale((value) => Math.max(0.55, value - 0.15))} aria-label="Diminuir zoom"><Minus size={19} /></button>
            <span className="zoom-value">{Math.round(scale * 100)}%</span>
            <button className="icon-button" onClick={() => setScale((value) => Math.min(2.4, value + 0.15))} aria-label="Aumentar zoom"><Plus size={19} /></button>
            <button className="icon-button" onClick={() => setScale(1.1)} aria-label="Restaurar zoom"><RotateCcw size={18} /></button>
          </>}
          <button className={`icon-button ${ocrProcessing ? "active-tool" : ""}`} onClick={() => void runOcrForCurrentPage()} disabled={ocrProcessing} aria-label="Extrair texto desta página com OCR" title="OCR desta página">{ocrProcessing ? <span className="toolbar-progress">{ocrProgress}%</span> : <ScanText size={19} />}</button>
          <button className={`icon-button ${currentBookmark ? "active-tool" : ""}`} onClick={openBookmarkNote} aria-label={currentBookmark ? "Editar marcador e anotação da página" : "Salvar página com anotação"}>{currentBookmark ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}</button>
          <button className={`icon-button ${studyOpen ? "active-tool" : ""}`} onClick={() => { setStudyOpen((value) => !value); setSettingsOpen(false); setAssistantOpen(false); }} aria-label="Caderno de estudo"><Highlighter size={19} /><span className="toolbar-badge">{highlights.length + bookmarks.length}</span></button>
          <button className={`icon-button ${searchOpen ? "active-tool" : ""}`} onClick={() => { setSearchOpen((value) => !value); setSettingsOpen(false); setStudyOpen(false); setAssistantOpen(false); }} aria-label="Pesquisar no PDF"><Search size={19} /></button>
          <button className={`icon-button ${assistantOpen ? "active-tool" : ""}`} onClick={() => { setAssistantOpen((value) => !value); setSettingsOpen(false); setStudyOpen(false); }} aria-label="Assistente de leitura"><Sparkles size={19} /></button>
          <button className="icon-button" onClick={() => { setSettingsOpen((value) => !value); setStudyOpen(false); setAssistantOpen(false); }} aria-label="Aparência"><SlidersHorizontal size={19} /></button>
          <button className="icon-button" onClick={enterFocusMode} aria-label="Modo foco"><Focus size={19} /></button>
          <button className="icon-button" onClick={enterFocusMode} aria-label="Tela cheia"><Expand size={19} /></button>
        </div>
      </header>

      {settingsOpen && <AppearancePanel preferences={preferences} onChange={updatePreferences} onClose={() => setSettingsOpen(false)} />}
      {studyOpen && <StudyPanel highlights={highlights} bookmarks={bookmarks} onClose={() => setStudyOpen(false)} onGoToPage={goToPage} onDeleteHighlight={(id) => void db.highlights.delete(id)} onDeleteBookmark={(id) => void db.bookmarks.delete(id)} onExport={exportStudyNotes} />}
      {searchOpen && <SearchPanel query={searchQuery} results={searchResults} searching={searching} hasSearched={hasSearched} onQueryChange={setSearchQuery} onSearch={() => void runSearch()} onClose={() => { searchCancelled.current = true; setSearching(false); setSearchOpen(false); }} onGoToPage={(resultPage) => { goToPage(resultPage); setSearchOpen(false); }} />}
      {assistantOpen && <AssistantPanel action={assistantAction} answer={assistantAnswer} error={assistantError} loading={assistantLoading} model={assistantModel} source={assistantSource} accessKey={assistantAccessKey} remaining={assistantRemaining} onAccessKeyChange={updateAssistantAccessKey} onClose={() => setAssistantOpen(false)} onRun={(action) => void runAssistant(action)} question={assistantQuestion} onQuestionChange={setAssistantQuestion} />}
      {focusMode && <button className="exit-focus" onClick={exitFocusMode}><X size={17} />Sair do foco</button>}

      <section className="document-stage">
        {!pdfDocument && !loadingError && <div className="reader-message"><span className="spinner" />Preparando o livro…</div>}
        {loadingError && <div className="reader-message error">{loadingError}</div>}
        <div ref={pageSurfaceRef} className={pdfDocument && !loadingError && preferences.viewMode === "page" ? "pdf-page-surface" : "pdf-page-surface hidden"} onMouseUp={handlePdfSelection} onTouchEnd={handlePdfSelection}>
          <canvas ref={canvasRef} className="pdf-canvas" />
          <div className="pdf-highlight-layer" aria-hidden="true">
            {pageHighlights.flatMap((highlight) => (highlight.rects ?? []).map((rect, index) => <span key={`${highlight.id}:${index}`} className={`pdf-highlight highlight-${highlight.color}`} style={{ left: `${rect.left}%`, top: `${rect.top}%`, width: `${rect.width}%`, height: `${rect.height}%` }} />))}
          </div>
          <div ref={textLayerRef} className="pdf-text-layer" />
        </div>
        {pdfDocument && !loadingError && preferences.viewMode === "reading" && (
          <article className={`reading-page font-${preferences.fontFamily}`}>
            <span className="reading-page-number">Página {page}</span>
            {extractingText ? <div className="reading-loading"><span className="spinner" />Extraindo texto…</div> : readingText ? <p ref={readingParagraphRef} onMouseUp={handleTextSelection} onTouchEnd={handleTextSelection}>{renderHighlightedText(readingText, pageHighlights)}</p> : <div className="reading-empty"><div><p>Esta página não possui texto selecionável.</p><button className="ocr-button" onClick={() => void runOcrForCurrentPage()} disabled={ocrProcessing}>{ocrProcessing ? `Lendo imagem… ${ocrProgress}%` : <><ScanText size={18} /> Extrair texto com OCR</>}</button><small>Processamento no seu navegador; o texto fica salvo apenas neste dispositivo.</small></div></div>}
          </article>
        )}
      </section>

      {textSelection && !noteOpen && (
        <div className="selection-toolbar" style={{ top: textSelection.top, left: textSelection.left }}>
          {(["yellow", "green", "blue"] as const).map((color) => <button key={color} className={`color-dot color-${color}`} onClick={() => void saveHighlight(color)} aria-label={`Destacar em ${color}`} />)}
          <span />
          <button onClick={() => setNoteOpen(true)} aria-label="Adicionar nota"><StickyNote size={17} /></button>
          <button onClick={() => setShareOpen(true)} aria-label="Criar card para compartilhar"><Share2 size={17} /></button>
          <button onClick={() => void runAssistant("explain", textSelection.text)} aria-label="Explicar trecho"><Sparkles size={17} /></button>
          <button onClick={() => void runAssistant("translate", textSelection.text)} aria-label="Traduzir para português"><Languages size={17} /></button>
        </div>
      )}

      {noteOpen && textSelection && (
        <div className="note-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setNoteOpen(false); }}>
          <div className="note-dialog" role="dialog" aria-modal="true" aria-labelledby="note-title">
            <div className="panel-heading"><div><span className="eyebrow">Página {page}</span><h2 id="note-title">Adicionar nota</h2></div><button className="icon-button" onClick={() => setNoteOpen(false)} aria-label="Fechar nota"><X size={19} /></button></div>
            <blockquote>{textSelection.text}</blockquote>
            <textarea autoFocus value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Escreva sua observação…" rows={5} />
            <div className="dialog-actions"><button onClick={() => setNoteOpen(false)}>Cancelar</button><button className="save-note" onClick={() => void saveHighlight("yellow", noteDraft)}>Salvar nota</button></div>
          </div>
        </div>
      )}

      {shareOpen && textSelection && <div className="note-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShareOpen(false); }}><div className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title"><div className="panel-heading"><div><span className="eyebrow">Destaque compartilhável</span><h2 id="share-title">Criar card</h2></div><button className="icon-button" onClick={() => setShareOpen(false)} aria-label="Fechar compartilhamento"><X size={19} /></button></div><blockquote>{textSelection.text}</blockquote><div className="share-options"><fieldset><legend>Tema</legend>{(["paper", "dark", "caramel"] as const).map((theme) => <button key={theme} className={shareTheme === theme ? `selected ${theme}` : theme} onClick={() => setShareTheme(theme)}>{theme === "paper" ? "Papel" : theme === "dark" ? "Escuro" : "Caramelo"}</button>)}</fieldset><fieldset><legend>Formato</legend><button className={shareFormat === "feed" ? "selected" : ""} onClick={() => setShareFormat("feed")}>Feed</button><button className={shareFormat === "story" ? "selected" : ""} onClick={() => setShareFormat("story")}>Story</button></fieldset></div><p className="share-hint">O card inclui o título e a página. Compartilhe apenas trechos que você tenha direito de publicar.</p><div className="dialog-actions"><button onClick={() => void downloadShareCard()}>Baixar PNG</button><button className="save-note" onClick={() => void shareCard()}><Share2 size={16} /> Compartilhar</button></div></div></div>}

      {bookmarkNoteOpen && (
        <div className="note-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setBookmarkNoteOpen(false); }}>
          <div className="note-dialog" role="dialog" aria-modal="true" aria-labelledby="bookmark-note-title">
            <div className="panel-heading"><div><span className="eyebrow">Página {page}</span><h2 id="bookmark-note-title">Salvar página</h2></div><button className="icon-button" onClick={() => setBookmarkNoteOpen(false)} aria-label="Fechar marcador"><X size={19} /></button></div>
            <p className="search-hint">Adicione um lembrete opcional para explicar por que esta página é importante.</p>
            <textarea autoFocus value={bookmarkNoteDraft} onChange={(event) => setBookmarkNoteDraft(event.target.value)} placeholder="Ex.: Rever este algoritmo antes da prova." rows={5} />
            <div className="dialog-actions">{currentBookmark && <button onClick={() => void removeCurrentBookmark()}>Remover marcador</button>}<button onClick={() => setBookmarkNoteOpen(false)}>Cancelar</button><button className="save-note" onClick={() => void saveBookmark()}>{currentBookmark ? "Salvar alterações" : "Salvar página"}</button></div>
          </div>
        </div>
      )}

      {toast && <div className="reader-toast" role="status">{toast}</div>}

      <footer className="reader-footer">
        <button className="page-button" onClick={() => goToPage(page - 1)} disabled={page <= 1}><ChevronLeft size={18} /> Anterior</button>
        <div className="progress-area">
          <div className="page-input-row"><label htmlFor="page-number">Página</label><input id="page-number" type="text" inputMode="numeric" pattern="[0-9]*" value={pageInput} onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))} onBlur={submitPageInput} onKeyDown={(event) => { if (event.key === "Enter") { event.currentTarget.blur(); } if (event.key === "Escape") { setPageInput(String(page)); event.currentTarget.blur(); } }} aria-label="Ir para a página" /><span>de {pageCount || "—"}</span></div>
          <div className="progress-track" aria-label={`${progress}% concluído`}><span style={{ width: `${progress}%` }} /></div>
        </div>
        <button className="page-button" onClick={() => goToPage(page + 1)} disabled={!pageCount || page >= pageCount}>Próxima <ChevronRight size={18} /></button>
      </footer>
    </main>
  );
}

function renderHighlightedText(text: string, highlights: HighlightRecord[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const highlight of [...highlights].sort((a, b) => a.startOffset - b.startOffset)) {
    if (highlight.startOffset < cursor || highlight.startOffset < 0 || highlight.endOffset > text.length) continue;
    nodes.push(text.slice(cursor, highlight.startOffset));
    nodes.push(<mark key={highlight.id} className={`highlight-${highlight.color}`} title={highlight.note || "Destaque salvo"}>{text.slice(highlight.startOffset, highlight.endOffset)}</mark>);
    cursor = highlight.endOffset;
  }
  nodes.push(text.slice(cursor));
  return nodes;
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []; let line = "";
  for (const word of text.replace(/\s+/g, " ").split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function SearchPanel({ query, results, searching, hasSearched, onQueryChange, onSearch, onClose, onGoToPage }: {
  query: string;
  results: SearchResult[];
  searching: boolean;
  hasSearched: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onClose: () => void;
  onGoToPage: (page: number) => void;
}) {
  return (
    <aside className="search-panel" aria-label="Pesquisar no PDF">
      <div className="panel-heading"><div><span className="eyebrow">No seu dispositivo</span><h2>Pesquisar no PDF</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar pesquisa"><X size={19} /></button></div>
      <form className="search-form" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
        <input autoFocus value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Termo, conceito ou tecnologia" aria-label="Termo de pesquisa" minLength={2} />
        <button type="submit" disabled={searching || query.trim().length < 2}>{searching ? "Pesquisando…" : "Pesquisar"}</button>
      </form>
      <p className="search-hint">O conteúdo não sai do seu navegador. PDFs digitalizados como imagem podem não retornar resultados.</p>
      {searching && <div className="search-status"><span className="spinner" />Lendo as páginas do PDF…</div>}
      {!searching && results.length > 0 && <div className="search-results">{results.map((result) => <button key={result.page} className="search-result" onClick={() => onGoToPage(result.page)}><strong>Página {result.page}</strong><span>{result.excerpt}</span></button>)}</div>}
      {!searching && hasSearched && results.length === 0 && <p className="search-empty">Nenhuma ocorrência encontrada neste PDF.</p>}
    </aside>
  );
}

function AppearancePanel({ preferences, onChange, onClose }: {
  preferences: ReaderPreferences;
  onChange: (change: Partial<ReaderPreferences>) => void;
  onClose: () => void;
}) {
  return (
    <aside className="appearance-panel" aria-label="Configurações de aparência">
      <div className="panel-heading"><div><span className="eyebrow">Leitura</span><h2>Aparência</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar aparência"><X size={19} /></button></div>

      <fieldset className="setting-group">
        <legend>Tema</legend>
        <div className="theme-options">
          {(["light", "sepia", "dark"] as const).map((theme) => <button key={theme} className={`theme-choice theme-choice-${theme} ${preferences.theme === theme ? "selected" : ""}`} onClick={() => onChange({ theme })}>{theme === "light" ? "Claro" : theme === "sepia" ? "Sépia" : "Escuro"}</button>)}
        </div>
      </fieldset>

      <label className="setting-group"><span>Luminosidade <output>{Math.round(preferences.brightness * 100)}%</output></span><input type="range" min="0.65" max="1.1" step="0.05" value={preferences.brightness} onChange={(event) => onChange({ brightness: Number(event.target.value) })} /></label>

      <fieldset className="setting-group" disabled={preferences.viewMode !== "reading"}>
        <legend>Fonte</legend>
        <div className="font-options"><button className={preferences.fontFamily === "serif" ? "selected" : ""} onClick={() => onChange({ fontFamily: "serif" })}>Serifada</button><button className={preferences.fontFamily === "sans" ? "selected" : ""} onClick={() => onChange({ fontFamily: "sans" })}>Sem serifa</button></div>
      </fieldset>

      <label className="setting-group"><span>Tamanho <output>{preferences.fontSize}px</output></span><input disabled={preferences.viewMode !== "reading"} type="range" min="14" max="30" value={preferences.fontSize} onChange={(event) => onChange({ fontSize: Number(event.target.value) })} /></label>
      <label className="setting-group"><span>Espaçamento <output>{preferences.lineHeight.toFixed(1)}</output></span><input disabled={preferences.viewMode !== "reading"} type="range" min="1.3" max="2.1" step="0.1" value={preferences.lineHeight} onChange={(event) => onChange({ lineHeight: Number(event.target.value) })} /></label>
      <label className="setting-group"><span>Margens <output>{preferences.margin}px</output></span><input disabled={preferences.viewMode !== "reading"} type="range" min="24" max="110" step="4" value={preferences.margin} onChange={(event) => onChange({ margin: Number(event.target.value) })} /></label>
      {preferences.viewMode !== "reading" && <p className="setting-hint">Fonte, tamanho e margens ficam disponíveis no modo leitura.</p>}
    </aside>
  );
}

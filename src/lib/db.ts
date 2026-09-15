import Dexie, { type EntityTable } from "dexie";

export interface BookRecord {
  id: string;
  title: string;
  fileName: string;
  file: Blob;
  size: number;
  pageCount: number | null;
  lastPage: number;
  addedAt: number;
  updatedAt: number;
}

export interface ReaderPreferences {
  key: "reader";
  viewMode: "page" | "reading";
  theme: "light" | "sepia" | "dark";
  fontFamily: "serif" | "sans";
  fontSize: number;
  lineHeight: number;
  margin: number;
  brightness: number;
}

export type HighlightColor = "yellow" | "green" | "blue";

export interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface HighlightRecord {
  id: string;
  bookId: string;
  page: number;
  text: string;
  startOffset: number;
  endOffset: number;
  color: HighlightColor;
  note: string;
  rects?: HighlightRect[];
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkRecord {
  id: string;
  bookId: string;
  page: number;
  createdAt: number;
}

const database = new Dexie("estudo-pdf") as Dexie & {
  books: EntityTable<BookRecord, "id">;
  settings: EntityTable<ReaderPreferences, "key">;
  highlights: EntityTable<HighlightRecord, "id">;
  bookmarks: EntityTable<BookmarkRecord, "id">;
};

database.version(1).stores({
  books: "id, title, fileName, addedAt, updatedAt",
});

database.version(2).stores({
  books: "id, title, fileName, addedAt, updatedAt",
  settings: "key",
});

database.version(3).stores({
  books: "id, title, fileName, addedAt, updatedAt",
  settings: "key",
  highlights: "id, bookId, page, [bookId+page], createdAt",
  bookmarks: "id, bookId, page, [bookId+page], createdAt",
});

export const db = database;

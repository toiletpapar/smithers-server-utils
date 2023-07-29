interface Cursor<T> {
  hasNext: () => boolean;
  next: () => Promise<T[]>;
}

interface ChapterCursor {
  hasMoreChapters: () => boolean;
  nextChapters: () => Promise<Omit<IMangaUpdate, "mangaUpdateId">[]>;
}
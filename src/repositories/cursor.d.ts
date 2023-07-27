interface Cursor {
  hasMoreChapters: () => boolean;
  nextChapters: () => Promise<Omit<IMangaUpdate, "mangaUpdateId">[]>;
}
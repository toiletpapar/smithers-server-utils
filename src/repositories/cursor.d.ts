interface Cursor<T> {
  hasNext: () => boolean;
  next: () => Promise<T[]>;
}
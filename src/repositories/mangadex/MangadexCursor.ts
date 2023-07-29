import { SmithersError, SmithersErrorTypes } from '../../errors/SmithersError'

interface MangadexResponse<D> {
  getObject: () => {
    data: D[];
    total: number;
  }
}

interface MangadexCursorOptions<D, R extends MangadexResponse<D>, T> {
  getter: (limit: number, offset: number) => Promise<R>;
  transformer: (data: D) => T;
  limit: number;
  offset: number;
}

class MangadexCursor<D, R extends MangadexResponse<D>, T> implements Cursor<T> {
  private limit: number
  private offset: number
  private remaining: number | null = null
  private getter: (limit: number, offset: number) => Promise<R>
  private transformer: (data: D) => T

  constructor(opts: MangadexCursorOptions<D, R, T>) {
    this.getter = opts.getter
    this.transformer = opts.transformer
    this.limit = opts.limit
    this.offset = opts.offset
  }

  hasNext(): boolean {
    return this.remaining === null || this.remaining > 0
  }

  async next(): Promise<T[]> {
    if (!this.hasNext()) {
      throw new SmithersError(SmithersErrorTypes.MANGADEX_CURSOR_NO_NEXT, 'Trying to get more information from Mangadex when none is available')
    }

    const response = await this.getter(this.limit, this.offset)

    // Update cursor position
    this.offset += this.limit
    this.remaining = response.getObject().total - this.offset

    return response.getObject().data.map((d) => this.transformer(d))
  }
}

export {
  MangadexCursor
}
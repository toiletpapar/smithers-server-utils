import { SmithersError, SmithersErrorTypes } from '../../errors/SmithersError'
import { HTMLElement } from '../../httpParser/HtmlParser'
import { WEBTOON_BASE } from './utils'

interface WebtoonCursorOptions<T> {
  getter: (url: string) => Promise<HTMLElement>; // Must return an html element that contains pagination that this cursor understands
  transformer: (data: HTMLElement) => T[];
  url: string;
}

// Describes how to paginate through webtoon, provides consumers with hooks
class WebtoonCursor<T> implements Cursor<T> {
  private url: string | null = null
  private currentPage: HTMLElement | null = null
  private getter: (url: string) => Promise<HTMLElement>
  private transformer: (data: HTMLElement) => T[]

  constructor (opts: WebtoonCursorOptions<T>) {
    this.getter = opts.getter
    this.transformer = opts.transformer
    this.url = opts.url
  }

  hasNext(): boolean {
    return !!this.url
  }

  async next(): Promise<T[]> {
    if (!this.url) {
      throw new SmithersError(SmithersErrorTypes.WEBTOON_CURSOR_NO_NEXT, 'Trying to get more information from Webtoon when none is available')
    }

    this.currentPage = await this.getter(this.url)

    // Point towards the next page of data if applicable
    const el = this.currentPage.querySelector(".paginate > [href='#'] + a")

    if (el && el.getAttribute("href")) {
      this.url = WEBTOON_BASE + el.getAttribute("href")
    } else {
      this.url = null
    }

    return this.transformer(this.currentPage)
  }
}

export {
  WebtoonCursor
}
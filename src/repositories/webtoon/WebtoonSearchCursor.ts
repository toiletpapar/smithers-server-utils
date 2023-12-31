import { HTMLElement } from 'node-html-parser'
import { SmithersError, SmithersErrorTypes } from '../../errors/SmithersError'
import { CrawlerTypes, ICrawlTarget } from '../../models/crawlers/CrawlTarget'
import { CrawlTargetSourceSearchOptions } from '../../models/crawlers/CrawlTargetSourceSearchOptions'
import { WebtoonCursor } from './WebtoonCursor'
import { WEBTOON_BASE } from './utils'
import { httpClient } from '../../httpClient/HttpClient'
import { HTMLParser } from '../../httpParser/HtmlParser'

const parseMangaName = (el: HTMLElement): string => {
  const name = el.querySelector(".info > p.subj")?.innerText || null

  if (!name) {
    throw new SmithersError(SmithersErrorTypes.WEBTOON_CURSOR_UNPARSABLE_MANGA_NAME, 'Unable to parse manga name')
  }

  return name
}

const parseMangaUrl = (el: HTMLElement): string => {
  const url = el.querySelector("a.card_item")?.getAttribute('href')

  if (!url) {
    throw new SmithersError(SmithersErrorTypes.WEBTOON_CURSOR_UNPARSABLE_MANGA_URL, 'Unable to parse manga url')
  }

  return url
}

class WebtoonSearchCursor {
  private cursor: WebtoonCursor<Omit<ICrawlTarget, 'crawlTargetId'>>

  constructor (opts: CrawlTargetSourceSearchOptions) {
    const url = new URL(`${WEBTOON_BASE}/en/search`)
    url.searchParams.set("page", opts.getObject().page.toString())
    url.searchParams.set("searchType", "WEBTOON")
    url.searchParams.set("keyword", opts.getObject().query)
    this.cursor = new WebtoonCursor({
      getter: async (url: string): Promise<HTMLElement> => {
        console.log(`Searching webtoon mangas with query: ${opts.getObject().query}`)
        const res = await httpClient.get(url)
        return HTMLParser.parse(res.data)
      },
      transformer: (data: HTMLElement): Omit<ICrawlTarget, 'crawlTargetId'>[] => {
        const cardList = data.querySelectorAll(".card_lst > li")

        return cardList.map((card) => {
          return {
            name: parseMangaName(card),
            url: parseMangaUrl(card),
            adapter: CrawlerTypes.webtoon,
            lastCrawledOn: null,
            crawlSuccess: null,
            userId: opts.getObject().userId,
            coverImage: null,
            coverFormat: null,
            coverSignature: null,
            favourite: false,
          }
        })
      },
      url: url.toString()
    })
  }

  hasNext(): boolean {
    return this.cursor.hasNext()
  }

  async next(): Promise<Omit<ICrawlTarget, 'crawlTargetId'>[]> {
    return this.cursor.next()
  }
}

export {
  WebtoonSearchCursor
}
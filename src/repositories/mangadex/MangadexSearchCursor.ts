import { httpClient } from '../../httpClient/HttpClient'
import { CrawlerTypes, ICrawlTarget } from '../../models/crawlers/CrawlTarget'
import { MANGADEX_API_BASE, MANGADEX_BASE } from './utils'
import { MangadexCursor } from './MangadexCursor'
import { CrawlTargetSourceSearchOptions } from '../../models/crawlers/CrawlTargetSourceSearchOptions'
import { IMangadexApiSearchManga, MangadexApiSearchResponse } from '../../models/mangadex/MangadexApiSearchResponse'

class MangadexSearchCursor implements Cursor<Omit<ICrawlTarget, 'crawlTargetId'>> {
  private cursor: MangadexCursor<IMangadexApiSearchManga, MangadexApiSearchResponse, Omit<ICrawlTarget, 'crawlTargetId'>>

  // Given a url, provide an interface to retrieve chapters
  constructor (opts: CrawlTargetSourceSearchOptions) {
    const LIMIT = 10
    this.cursor = new MangadexCursor({
      getter: async (limit, offset) => {
        const url = `${MANGADEX_API_BASE}/manga`

        console.log(`Searching mangadex mangas with query: ${opts.getObject().query}`)

        const res = await httpClient.get(url, {params: {
          "availableTranslatedLanguage[]": 'en',
          "title": opts.getObject().query,
          "limit": limit.toString(),
          "offset": offset.toString()
        }})

        console.log(limit.toString())
        console.log(offset.toString())

        return new MangadexApiSearchResponse(res.data)
      },
      transformer: (manga): Omit<ICrawlTarget, 'crawlTargetId'> => {
        return {
          name: manga.attributes.title.en,
          url: `${MANGADEX_BASE}/title/${manga.id}`,
          adapter: CrawlerTypes.mangadex,
          lastCrawledOn: null,
          crawlSuccess: null,
          userId: opts.getObject().userId,
          coverImage: null,
          coverFormat: null
        }
      },
      limit: LIMIT,
      offset: (opts.getObject().page - 1) * LIMIT
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
  MangadexSearchCursor
}
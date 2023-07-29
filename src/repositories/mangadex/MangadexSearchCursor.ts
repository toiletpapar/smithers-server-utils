import { httpClient } from '../../httpClient/HttpClient'
import { CrawlTarget, CrawlerTypes, ICrawlTarget } from '../../models/crawlers/CrawlTarget'
import { MANGADEX_API_BASE, MANGADEX_BASE } from './utils'
import { MangadexCursor } from './MangadexCursor'
import { MangaSourceSearchOptions } from '../../models/manga/MangaSourceSearchOptions'
import { IMangadexApiSearchManga, MangadexApiSearchResponse } from '../../models/mangadex/MangadexApiSearchResponse'

class MangadexSearchCursor implements Cursor<Omit<ICrawlTarget, 'crawlTargetId'>> {
  private cursor: MangadexCursor<IMangadexApiSearchManga, MangadexApiSearchResponse, Omit<ICrawlTarget, 'crawlTargetId'>>

  // Given a url, provide an interface to retrieve chapters
  constructor (opts: MangaSourceSearchOptions) {
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
      limit: opts.getObject().limit,
      offset: opts.getObject().offset
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
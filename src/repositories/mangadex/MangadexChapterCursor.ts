import { httpClient } from '../../httpClient/HttpClient'
import { IMangadexApiFeedChapter, IMangadexApiFeedResponse, MangadexApiFeedResponse } from '../../models/mangadex/MangadexApiFeedResponse'
import { CrawlTarget } from '../../models/crawlers/CrawlTarget'
import { IMangaUpdate } from '../../models/manga/MangaUpdate'
import { scaleRound } from '../../utils/float'
import { MANGADEX_API_BASE, getMangadexIdFromUrl } from './utils'
import { MangadexCursor } from './MangadexCursor'

class MangadexChapterCursor implements ChapterCursor {
  private cursor: MangadexCursor<IMangadexApiFeedChapter, MangadexApiFeedResponse, Omit<IMangaUpdate, "mangaUpdateId">>

  // Given a url, provide an interface to retrieve chapters
  constructor (crawlTarget: CrawlTarget) {
    this.cursor = new MangadexCursor({
      getter: async (limit, offset) => {
        const url = `${MANGADEX_API_BASE}/manga/${getMangadexIdFromUrl(crawlTarget)}/feed`

        console.log(`Retrieving chapters from ${url}`)

        // Example Readat: https://mangadex.org/chapter/fe9052be-709c-4a13-901f-f1fab2dd53fa where chapterid is used

        const res = await httpClient.get(url, {params: {
          "translatedLanguage[]": 'en',
          "order[chapter]": 'desc',
          "limit": limit.toString(),
          "offset": offset.toString()
        }})

        return new MangadexApiFeedResponse(res.data)
      },
      transformer: (chapter): Omit<IMangaUpdate, "mangaUpdateId"> => {
        return {
          crawlId: crawlTarget.getObject().crawlTargetId,
          crawledOn: new Date(),
          chapterName: chapter.attributes.title,
          chapter: scaleRound(parseFloat(chapter.attributes.chapter), 1),
          isRead: false,
          readAt: `https://mangadex.org/chapter/${chapter.id}`,
          dateCreated: new Date()
        }
      },
      limit: 100,
      offset: 0
    })
  }

  hasMoreChapters(): boolean {
    return this.cursor.hasNext()
  }

  async nextChapters(): Promise<Omit<IMangaUpdate, "mangaUpdateId">[]> {
    return this.cursor.next()
  }
}

export {
  MangadexChapterCursor
}
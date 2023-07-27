import { httpClient } from '../../httpClient/HttpClient'
import { MangadexApiFeedResponse } from '../../models/mangadex/MangadexApiResponse'
import { CrawlTarget } from '../../models/CrawlTarget'
import { IMangaUpdate } from '../../models/manga/MangaUpdate'
import { scaleRound } from '../../utils/float'
import { SmithersError, SmithersErrorTypes } from '../../errors/SmithersError'

class MangadexCursor implements Cursor {
  private crawlTarget: CrawlTarget
  private limit = 100
  private offset = 0
  private remainingChapters = 1
  private language = 'en'

  // Given a url, provide an interface to retrieve chapters
  constructor (crawlTarget: CrawlTarget) {
    this.crawlTarget = crawlTarget
  }

  // Example: https://mangadex.org/title/077a3fed-1634-424f-be7a-9a96b7f07b78/kingdom?order=desc
  private getMangadexIdFromUrl(): string {
    const matches = this.crawlTarget.getObject().url.match(/\/title\/([^/]+)/)

    if (!matches || !matches[1]) {
      throw new SmithersError(SmithersErrorTypes.MANGADEX_CURSOR_FAILED_IDENTIFICATION, 'Unable to identify mangadex id from url')
    }
  
    return matches[1]
  }

  hasMoreChapters(): boolean {
    return this.remainingChapters > 0
  }

  async nextChapters(): Promise<Omit<IMangaUpdate, "mangaUpdateId">[]> {
    if (!this.hasMoreChapters()) {
      throw new SmithersError(SmithersErrorTypes.MANGADEX_CURSOR_NO_MORE_CHAPTERS, 'Trying to get more chapters when no more pages are left')
    }

    const url = `https://api.mangadex.org/manga/${this.getMangadexIdFromUrl()}/feed`

    console.log(`Retrieving chapters from ${url}`)

    // Example Readat: https://mangadex.org/chapter/fe9052be-709c-4a13-901f-f1fab2dd53fa where chapterid is used

    const res = await httpClient.get(url, {params: {
      "translatedLanguage[]": this.language,
      "order[chapter]": 'desc',
      "limit": this.limit.toString(),
      "offset": this.offset.toString()
    }})
    const feed = new MangadexApiFeedResponse(res.data)

    // Update cursor position
    this.offset += this.limit
    this.remainingChapters = feed.getObject().total - this.offset

    // The list of mangadex chapters
    return feed.getObject().data.map((chapter): Omit<IMangaUpdate, "mangaUpdateId"> => {
      return {
        crawlId: this.crawlTarget.getObject().crawlTargetId,
        crawledOn: new Date(),
        chapterName: chapter.attributes.title,
        chapter: scaleRound(parseFloat(chapter.attributes.chapter), 1),
        isRead: false,
        readAt: `https://mangadex.org/chapter/${chapter.id}`,
        dateCreated: new Date()
      }
    })
  }
}

export {
  MangadexCursor
}
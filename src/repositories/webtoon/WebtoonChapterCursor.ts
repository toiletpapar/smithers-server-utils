import { SmithersError, SmithersErrorTypes } from '../../errors/SmithersError'
import { httpClient } from '../../httpClient/HttpClient'
import { HTMLParser, HTMLElement } from '../../httpParser/HtmlParser'
import { CrawlTarget } from '../../models/crawlers/CrawlTarget'
import { IMangaUpdate } from '../../models/manga/MangaUpdate'
import { WebtoonCursor } from './WebtoonCursor'

const parseChapterName = (el: HTMLElement): string | null => {
  return el.querySelector(".subj > span")?.innerText || null
}

const parseChapter = (el: HTMLElement): number => {
  // Try to get it from the ending of the episode item
  const trailingEpisodeEl = el.querySelector(".tx")
  if (trailingEpisodeEl) {
    return parseInt(trailingEpisodeEl.innerText.slice(1))
  }

  throw new SmithersError(SmithersErrorTypes.WEBTOON_CURSOR_UNPARSABLE_CHAPTER, 'Unable to parse chapter', {trailingEpisodeEl})
}

const parseChapterUrl = (el: HTMLElement): string => {
  const link = el.querySelector("a")
  const href = link?.getAttribute("href")
  
  if (!link || !href) {
    throw new SmithersError(SmithersErrorTypes.WEBTOON_CURSOR_UNPARSABLE_CHAPTER_LINK, 'Unable to get chapter link', {el})
  }

  return href
}

class WebtoonChapterCursor implements Cursor<Omit<IMangaUpdate, "mangaUpdateId">> {
  private cursor: WebtoonCursor<Omit<IMangaUpdate, "mangaUpdateId">>
  private crawlTarget: CrawlTarget

  // Given a url, provide an interface to retrieve chapters
  constructor (crawlTarget: CrawlTarget) {
    this.crawlTarget = crawlTarget
    const url = new URL(this.crawlTarget.getObject().url)
    url.searchParams.set("page", "1")

    if (!url.searchParams.get("title_no")) {
      throw new SmithersError(SmithersErrorTypes.WEBTOON_CURSOR_NO_TITLE, 'Webtoon URL must contain a title_no query parameter', {url: url})
    }

    this.cursor = new WebtoonCursor({
      getter: async (url: string) => {
        console.log(`Retrieving chapters from ${url.toString()}`)
        const res = await httpClient.get(url)
        return HTMLParser.parse(res.data)
      },
      transformer: (data: HTMLElement): Omit<IMangaUpdate, "mangaUpdateId">[] => {
        // Find relevant chapters (called Findings)
        // The list of webtoon episodes
        const list = data.querySelectorAll("._episodeItem")
        return list.map((el): Omit<IMangaUpdate, "mangaUpdateId"> => {
          return {
            crawlId: this.crawlTarget.getObject().crawlTargetId,
            crawledOn: new Date(),
            chapterName: parseChapterName(el),
            chapter: parseChapter(el),
            isRead: false,
            readAt: parseChapterUrl(el),
            dateCreated: new Date()
          }
        })
      },
      url: url.toString()
    })
  }

  hasNext(): boolean {
    return this.cursor.hasNext()
  }

  async next(): Promise<Omit<IMangaUpdate, "mangaUpdateId">[]> {
    return this.cursor.next()
  }
}

export {
  WebtoonChapterCursor
}
import { SmithersError, SmithersErrorTypes } from '../../errors/SmithersError'
import { httpClient } from '../../httpClient/HttpClient'
import { HTMLParser, HTMLElement } from '../../httpParser/HtmlParser'
import { CrawlTarget } from '../../models/CrawlTarget'
import { IMangaUpdate } from '../../models/manga/MangaUpdate'

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

class WebtoonCursor implements Cursor {
  private crawlTarget: CrawlTarget
  private url: URL | null
  private currentPage: HTMLElement | null = null

  // Given a url, provide an interface to retrieve chapters
  constructor (crawlTarget: CrawlTarget) {
    this.crawlTarget = crawlTarget
    this.url = new URL(this.crawlTarget.getObject().url)
    this.url.searchParams.set("page", "1")
    
    if (!this.url.searchParams.get("title_no")) {
      throw new SmithersError(SmithersErrorTypes.WEBTOON_CURSOR_NO_TITLE, 'Webtoon URL must contain a title_no query parameter', {url: this.url})
    }
  }

  hasMoreChapters(): boolean {
    return !!this.url
  }

  async nextChapters(): Promise<Omit<IMangaUpdate, "mangaUpdateId">[]> {
    if (!this.url) {
      throw new SmithersError(SmithersErrorTypes.WEBTOON_CURSOR_NO_MORE_CHAPTERS, 'Trying to get more chapters when no more pages are left')
    }

    console.log(`Retrieving chapters from ${this.url.toString()}`)

    // Update the page data that contains chapters
    const res = await httpClient.get(this.url.toString())
    this.currentPage = HTMLParser.parse(res.data)

    // Point towards the next page of data if applicable
    const el = this.currentPage.querySelector(".paginate > [href='#'] + a")

    if (el && el.getAttribute("href")) {
      this.url = new URL("https://www.webtoons.com" + el.getAttribute("href"))
    } else {
      this.url = null
    }

    // Find relevant chapters (called Findings)
    // The list of webtoon episodes
    const list = this.currentPage.querySelectorAll("._episodeItem")
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
  }
}

export {
  WebtoonCursor
}
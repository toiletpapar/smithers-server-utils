import { httpClient } from '../../httpClient/HttpClient';
import { HTMLParser } from '../../httpParser/HtmlParser';
import { CrawlTarget, ImageTypes } from '../../models/crawlers/CrawlTarget'
import { Image } from '../../models/image/Image';
import { IMangaUpdate } from '../../models/manga/MangaUpdate'
import { WebtoonChapterCursor } from "./WebtoonChapterCursor"
import Bottleneck from 'bottleneck'
import { WebtoonSearchCursor } from './WebtoonSearchCursor';
import { CrawlTargetSourceSearchOptions } from '../../models/crawlers/CrawlTargetSourceSearchOptions';

interface WebtoonAdapterOptions {
  onlyLatest: boolean;
  limiter: Bottleneck;
}

namespace WebtoonRepository {
  export const getCursor = (crawlTarget: CrawlTarget): WebtoonChapterCursor => {
    return new WebtoonChapterCursor(crawlTarget)
  }

  export const getChapters = async (crawlTarget: CrawlTarget, opts: WebtoonAdapterOptions): Promise<Omit<IMangaUpdate, "mangaUpdateId">[]> => {
    const cursor = getCursor(crawlTarget)

    if (opts.onlyLatest) {
      return cursor.nextChapters()
    }

    let chapters: Omit<IMangaUpdate, "mangaUpdateId">[] = []

    while (cursor.hasMoreChapters()) {
      chapters = [
        ...chapters,
        ...await opts.limiter.schedule(() => cursor.nextChapters())
      ]
    }

    return chapters
  }

  export const getSearchCursor = (opts: CrawlTargetSourceSearchOptions): WebtoonSearchCursor => {
    return new WebtoonSearchCursor(opts)
  }

  export const getLatestCover = async (crawlTarget: CrawlTarget): Promise<Image | null> => {
    const url = new URL(crawlTarget.getObject().url)
    url.searchParams.set("page", "1")
    const res = await httpClient.get(url.toString())
    const currentPage = HTMLParser.parse(res.data)

    const el = currentPage.querySelector('._episodeItem .thmb > img')
    const src = el?.getAttribute('src')

    if (!src) {
      console.log(`Could not find thumbnail image for ${crawlTarget.getObject().name}`)
      return null
    }

    const coverImageRes = await httpClient.get(src, {responseType: 'arraybuffer', headers: {'Referer': 'https://www.webtoons.com/'}})

    if (coverImageRes.headers['content-type'] === "image/png") {
      return new Image({
        format: ImageTypes.png,
        data: Buffer.from(coverImageRes.data)
      })
    } else {
      throw new Error(`Unrecognized mime type: ${coverImageRes.headers['Content-Type']}`)
    }
  }
}

export {
  WebtoonRepository
}
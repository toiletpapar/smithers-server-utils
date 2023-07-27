import { CrawlTarget } from '../../models/CrawlTarget'
import { IMangaUpdate } from '../../models/manga/MangaUpdate'
import { WebtoonCursor } from "./WebtoonCursor"
import Bottleneck from 'bottleneck'

interface WebtoonAdapterOptions {
  onlyLatest: boolean;
  limiter: Bottleneck;
}

namespace WebtoonRepository {
  export const getCursor = (crawlTarget: CrawlTarget): WebtoonCursor => {
    return new WebtoonCursor(crawlTarget)
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
}

export {
  WebtoonRepository
}
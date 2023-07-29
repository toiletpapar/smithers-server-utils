import { httpClient } from '../../httpClient/HttpClient';
import { CrawlTarget, ImageTypes } from '../../models/crawlers/CrawlTarget'
import { IMangaUpdate } from '../../models/manga/MangaUpdate'
import { MangadexChapterCursor } from "./MangadexChapterCursor"
import Bottleneck from 'bottleneck'
import { MANGADEX_API_BASE, MANGADEX_BASE, getMangadexIdFromUrl } from './utils';
import { MangadexApiCoverResponse } from '../../models/mangadex/MangadexApiCoverResponse';
import { Image } from '../../models/image/Image';
import { CrawlTargetSourceSearchOptions } from '../../models/crawlers/CrawlTargetSourceSearchOptions';
import { MangadexSearchCursor } from './MangadexSearchCursor';

interface MangadexAdapterOptions {
  onlyLatest: boolean;
  limiter: Bottleneck;
}

namespace MangadexRepository {
  export const getCursor = (crawlTarget: CrawlTarget): MangadexChapterCursor => {
    return new MangadexChapterCursor(crawlTarget)
  }

  export const getChapters = async (crawlTarget: CrawlTarget, opts: MangadexAdapterOptions): Promise<Omit<IMangaUpdate, "mangaUpdateId">[]> => {
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

  export const getSearchCursor = (opts: CrawlTargetSourceSearchOptions): MangadexSearchCursor => {
    return new MangadexSearchCursor(opts)
  }

  export const getLatestCover = async (crawlTarget: CrawlTarget): Promise<Image | null> => {
    // https://mangadex.org/covers/077a3fed-1634-424f-be7a-9a96b7f07b78/ed8e96d9-99a0-42cb-bb43-a0554c7c3b24.jpg
    const url = `${MANGADEX_API_BASE}/cover`
    const mangadexId = getMangadexIdFromUrl(crawlTarget)

    const coverIdRes = await httpClient.get(url, {params: {
      "manga[]": mangadexId,
      "order[createdAt]": "desc",
      "order[updatedAt]": "desc"
    }})
    const covers = new MangadexApiCoverResponse(coverIdRes.data)
    const coverData = covers.getObject().data[0]

    if (!coverData) {
      console.log(`Unable to find cover for ${crawlTarget.getObject().name}`)
      return null
    }

    const coverImageUrl = `${MANGADEX_BASE}/covers/${mangadexId}/${coverData.attributes.fileName}`
    const coverImageRes = await httpClient.get(coverImageUrl, {responseType: 'arraybuffer'})

    if (coverImageRes.headers['content-type'] === "image/jpeg") {
      return new Image({
        format: ImageTypes.jpeg,
        data: Buffer.from(coverImageRes.data)
      })
    } else {
      throw new Error(`Unrecognized mime type: ${coverImageRes.headers['Content-Type']}`)
    }
  }
}

export {
  MangadexRepository
}
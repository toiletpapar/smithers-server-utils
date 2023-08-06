import { CrawlTargetRepository, SQLCrawlTarget } from "../crawlers/CrawlTargetRepository"
import { MangaUpdateRepository, SQLMangaUpdate } from "./MangaUpdateRepository"
import { Database } from "../../database/Database"
import { CrawlTarget, CrawlerTypes, ICrawlTarget } from "../../models/crawlers/CrawlTarget";
import { WebtoonRepository } from "../webtoon/WebtoonRepository";
import { MangadexRepository } from "../mangadex/MangadexRepository";
import { IMangaUpdate, MangaUpdate } from "../../models/manga/MangaUpdate";
import { scaleEquals } from "../../utils/float";
import Bottleneck from "bottleneck";
import { MangaUpdateListOptions } from "../../models/manga/MangaUpdateListOptions";
import { SmithersError, SmithersErrorTypes } from "../../errors/SmithersError";
import { MangadexChapterCursor } from "../mangadex/MangadexChapterCursor";
import { WebtoonChapterCursor } from "../webtoon/WebtoonChapterCursor";
import { MangaUpdateGetOptions } from "../../models/manga/MangaUpdateGetOptions";
import { Image } from "../../models/image/Image";

const _getUpdateObject = (dbUpdate: MangaUpdate, update: Omit<IMangaUpdate, 'mangaUpdateId'>): Partial<Pick<IMangaUpdate, 'crawledOn' | 'chapterName' | 'readAt'>> => {
  const data = dbUpdate.getObject()

  return Object.keys(update).reduce((acc: Partial<Pick<IMangaUpdate, 'crawledOn' | 'chapterName' | 'readAt'>>, key) => {
    if (key === 'crawledOn' && data.crawledOn.valueOf() !== update[key].valueOf()) {
      return {
        ...acc,
        crawledOn: update[key]
      }
    } else if (key === 'chapterName' && data.chapterName !== update[key]) {
      return {
        ...acc,
        chapterName: update[key]
      }
    } else if (key === 'readAt' && data.readAt !== update[key]) {
      return {
        ...acc,
        readAt: update[key]
      }
    } else {
      // Ignore all other fields
      return acc
    }
  }, {})
}

const _updateDb = async (
  db: Database,
  limiter: Bottleneck,
  crawlTarget: CrawlTarget,  // The current manga updates in the database
  crawlerUpdate: Omit<IMangaUpdate, "mangaUpdateId"> // manga update created by the crawler
): Promise<void> => {
  const client = await db.getClient()
  try {
    await client.query('BEGIN')
    await client.query('LOCK TABLE manga_update IN ACCESS EXCLUSIVE MODE')

    // We must read on every insert to ensure that a crawlerUpdate is never out of sync with what is written
    const relatedUpdate = await MangaUpdateRepository.getByChapter(client, new MangaUpdateGetOptions({crawlTargetId: crawlTarget.getObject().crawlTargetId, chapter: crawlerUpdate.chapter}))

    // Write the result to db
    if (relatedUpdate) {
      // Merge MangaUpdate and History
      const updateData = _getUpdateObject(relatedUpdate, crawlerUpdate)

      if (Object.keys(updateData).length !== 0) {
        await limiter.schedule(() => MangaUpdateRepository.update(client, relatedUpdate.getObject().mangaUpdateId, updateData))
      }
    } else {
      await limiter.schedule(() => MangaUpdateRepository.insert(client, crawlerUpdate))
    }

    await client.query('COMMIT')

    return
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

const syncStrategy = async (db: Database, crawlTarget: CrawlTarget, cursor: Cursor<Omit<IMangaUpdate, "mangaUpdateId">>, sourceLimiter: Bottleneck, psqlLimiter: Bottleneck, onlyLatest: boolean, image: Image | null): Promise<void> => {
  console.log(`Now processing crawler ${crawlTarget.getObject().name}`)
  let chapterUpdates: Promise<void>[] = []

  const getAndUpdateChapters = async (): Promise<Promise<void>[]> => {
    console.log(`Crawled and updated a set of chapters from ${crawlTarget.getObject().name}...`)
    const chapters = await sourceLimiter.schedule(() => cursor.next())

    return chapters.map((chapter): Promise<void> => {
      return _updateDb(db, psqlLimiter, crawlTarget, chapter)
    })
  }

  if (onlyLatest && cursor.hasNext()) {
    chapterUpdates = [
      ...chapterUpdates,
      ...await getAndUpdateChapters()
    ]
  } else {
    while (cursor.hasNext()) {
      chapterUpdates = [
        ...chapterUpdates,
        ...await getAndUpdateChapters()
      ]
    }
  }

  // Push the manga updates
  await Promise.all(chapterUpdates)

  // Update the crawler
  let crawlerUpdate: Partial<Omit<ICrawlTarget, 'crawlTargetId' | 'userId'>> = {
    crawlSuccess: true,
    lastCrawledOn: new Date(),
  }

  if (image) {
    crawlerUpdate = {
      ...crawlerUpdate,
      coverFormat: image.getObject().format,
      coverImage: image.getObject().data
    }
  }

  await CrawlTargetRepository.update(
    db,
    crawlTarget.getObject().crawlTargetId,
    crawlerUpdate
  )

  return
}

// For each crawler, choose the appropriate adapter and store the MangaUpdates
// Return what was not successfully synced
const mangaSync = async (
  db: Database,
  crawlTargets: CrawlTarget[],
  webtoonLimiter: Bottleneck,
  mangadexLimiter: Bottleneck,
  psqlLimiter: Bottleneck,
  onlyLatest: boolean
): Promise<PromiseSettledResult<void>[]> => {
  return Promise.allSettled(crawlTargets.map(async (crawlTarget): Promise<void> => {
    try {
      if (crawlTarget.getObject().adapter === CrawlerTypes.webtoon) {
        const image = await webtoonLimiter.schedule(() => WebtoonRepository.getLatestCover(crawlTarget))
        await syncStrategy(db, crawlTarget, WebtoonRepository.getCursor(crawlTarget), webtoonLimiter, psqlLimiter, onlyLatest, image)
        console.log(`Done updating data from crawler ${crawlTarget.getObject().name}`)
        return
      } else if (crawlTarget.getObject().adapter === CrawlerTypes.mangadex) {
        const image = await mangadexLimiter.schedule(() => MangadexRepository.getLatestCover(crawlTarget))
        await syncStrategy(db, crawlTarget, MangadexRepository.getCursor(crawlTarget), mangadexLimiter, psqlLimiter, onlyLatest, image)
        console.log(`Done updating data from crawler ${crawlTarget.getObject().name}`)
        return
      } else {
        throw new SmithersError(
          SmithersErrorTypes.MANGA_CRAWL_TARGET_UNKNOWN_ADAPTER,
          `Unknown adapter ${crawlTarget.getObject().adapter} found for crawler ${crawlTarget.getObject().name}`,
          {crawlTarget}
        )
      }
    } catch (err: any) {
      // Override context
      err.smithersContext = crawlTarget
      return Promise.reject(err)
    }
  }))
}

export {
  mangaSync
}
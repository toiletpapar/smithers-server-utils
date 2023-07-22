import { CrawlTargetRepository, SQLCrawlTarget } from "../CrawlTargetRepository"
import { MangaUpdateRepository, SQLMangaUpdate } from "./MangaUpdateRepository"
import { Database } from "../../database/Database"
import { CrawlTarget, CrawlerTypes } from "../../models/CrawlTarget";
import { WebtoonRepository } from "../webtoon/WebtoonRepository";
import { MangadexRepository } from "../mangadex/MangadexRepository";
import { IMangaUpdate, MangaUpdate } from "../../models/manga/MangaUpdate";
import { scaleEquals } from "../../utils/float";
import Bottleneck from "bottleneck";
import { MangaUpdateListOptions } from "../../models/manga/MangaUpdateListOptions";

const _isRelatedUpdate = (dbUpdate: MangaUpdate, update: Omit<IMangaUpdate, 'mangaUpdateId'>): boolean => {
  const data = dbUpdate.getObject()

  return scaleEquals(data.chapter, update.chapter, 1) &&
    data.crawlId === update.crawlId
}

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
  crawlTarget: CrawlTarget, // what go crawled
  crawlerUpdates: Omit<IMangaUpdate, "mangaUpdateId">[] // manga updates created by the crawler
): Promise<void> => {
  const crawlTargetId = crawlTarget.getObject().crawlTargetId
  console.log(`Now updating data from crawler ${crawlTarget.getObject().name}`)

  // Read db to find the current state of the updates (the History)
  const dbUpdates = await MangaUpdateRepository.list(db, new MangaUpdateListOptions({crawlTargetId}))

  // Update the mangaUpdates
  await Promise.all(crawlerUpdates.reduce((acc: Promise<MangaUpdate | null>[], update) => {
    // Merge MangaUpdate and History
    const relatedUpdate = dbUpdates.find((dbUpdate) => _isRelatedUpdate(dbUpdate, update))

    // Write the result to db
    if (relatedUpdate) {
      const updateData = _getUpdateObject(relatedUpdate, update)

      if (Object.keys(updateData).length === 0) {
        return acc
      }

      return [
        ...acc,
        limiter.schedule(() => MangaUpdateRepository.update(db, relatedUpdate.getObject().mangaUpdateId, updateData))
      ]
    } else {
      return [
        ...acc,
        limiter.schedule(() => MangaUpdateRepository.insert(db, update))
      ]
    }
  }, []))

  // Update the crawler
  await CrawlTargetRepository.update(db, crawlTargetId, {crawlSuccess: true, lastCrawledOn: new Date()})

  console.log(`Done updating data from crawler ${crawlTarget.getObject().name}`)

  return
}

// For each crawler, choose the appropriate adapter and store the MangaUpdates
// Return what was not successfully synced
const mangaSync = async (db: Database, crawlTargets: CrawlTarget[], webtoonLimiter: Bottleneck, mangadexLimiter: Bottleneck, psqlLimiter: Bottleneck): Promise<PromiseSettledResult<void>[]> => {
  return Promise.allSettled(crawlTargets.map(async (crawlTarget) => {
    try {
      if (crawlTarget.getObject().adapter === CrawlerTypes.webtoon) {
        const crawlerUpdates = await WebtoonRepository.getChapters(crawlTarget, {onlyLatest: true, limiter: webtoonLimiter})
        await _updateDb(db, psqlLimiter, crawlTarget, crawlerUpdates)
  
        return
      } else if (crawlTarget.getObject().adapter === CrawlerTypes.mangadex) {
        const crawlerUpdates = await MangadexRepository.getChapters(crawlTarget, {onlyLatest: true, limiter: mangadexLimiter})
        await _updateDb(db, psqlLimiter, crawlTarget, crawlerUpdates)
  
        return
      } else {
        throw new Error(`Unknown adapter ${crawlTarget.getObject().adapter} found for crawler ${crawlTarget.getObject().name}`)
      }
    } catch (err: any) {
      err.smithersContext = crawlTarget
      return Promise.reject(err)
    }
  }))
}

export {
  mangaSync
}
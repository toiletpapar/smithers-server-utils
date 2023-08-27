import { QueryResult } from "pg";
import { CrawlTargetRepository, SQLCrawlTarget } from "../crawlers/CrawlTargetRepository"
import { SQLMangaUpdate } from "./MangaUpdateRepository"
import { Database, DatabaseQueryable } from "../../database/Database"
import { Manga } from "../../models/manga/Manga"
import { MangaListOptions } from "../../models/manga/MangaListOptions"
import { MangaSyncOptions } from "../../models/manga/MangaSyncOptions";
import { CrawlTargetListOptions } from "../../models/crawlers/CrawlTargetListOptions";
import { CrawlTarget } from "../../models/crawlers/CrawlTarget";
import { CrawlTargetGetOptions } from "../../models/crawlers/CrawlTargetGetOptions";
import { mangaSync } from "./mangaSync";
import { SmithersError, SmithersErrorTypes } from "../../errors/SmithersError";
import { CrawlTargetSourceSearchOptions } from "../../models/crawlers/CrawlTargetSourceSearchOptions";
import { MangadexRepository } from "../mangadex/MangadexRepository";

// Manga - Represented in SQL
interface SQLManga {
  // We convert cover_image into a string when we build the json object in our aggregation
  crawler: Omit<SQLCrawlTarget, 'cover_image' | 'last_crawled_on'> & {cover_image: string | null, last_crawled_on: string | null};
  manga_updates: SQLMangaUpdate[];
}

namespace MangaRepository {
  // Crawler + MangaUpdate
  // Each manga in the manga array is sorted by the manga's latest update's created date, descending
  // Each update within a manga is sorted by the chapter number, descending
  export const list = async (db: DatabaseQueryable, opts: MangaListOptions): Promise<Manga[]> => {
    // TODO: Stored Procedures
    let results: QueryResult<SQLManga> = await db.query({
      text: `
        SELECT
          json_build_object(
            'crawl_target_id', crawl_target_id,
            'name', name,
            'url', url,
            'adapter', adapter,
            'last_crawled_on', last_crawled_on,
            'crawl_success', crawl_success,
            'user_id', user_id,
            ${
              opts.getObject().projectImage ?
              `
                'cover_image', encode(cover_image::bytea, 'hex'),
                'cover_format', cover_format,
              ` :
              `
                'cover_image', null,
                'cover_format', null,
              `
            }
            'favourite', favourite
          ) crawler,
          COALESCE(
            json_agg(
              json_build_object(
                'manga_update_id', manga_update_id,
                'chapter', chapter,
                'chapter_name', chapter_name,
                'crawled_on', crawled_on,
                'is_read', is_read,
                'read_at', read_at,
                'date_created', date_created
              )
            ) FILTER (WHERE manga_update_id IS NOT NULL),
            '[]'
          ) AS manga_updates
        FROM (
          SELECT
            *,
            row_number() OVER (PARTITION BY crawl_target_id order by chapter DESC) as _rn
          FROM crawl_target
            LEFT JOIN manga_update
            USING (crawl_target_id)
          WHERE user_id = $1
          ORDER BY crawl_target_id ASC, chapter DESC
        ) x
        ${opts.getObject().onlyLatest ? 'WHERE _rn = 1' : ''}
        GROUP BY crawl_target_id, name, url, adapter, last_crawled_on, crawl_success, user_id, cover_image, cover_format, favourite
        ORDER BY favourite DESC, MAX(date_created) DESC NULLS LAST;
      `,
      values: [opts.getObject().userId]
    })

    return results.rows.map((row) => {
      return Manga.fromSQL(row)
    })
  }

  export const syncManga = async (db: Database, opts: MangaSyncOptions): Promise<void> => {
    let crawlTargets: CrawlTarget[] = []
    const optsData = opts.getObject()

    // Retreive from db what is supposed to be crawled
    if (optsData.crawlTargetId && optsData.userId) {
      const crawlTarget = await CrawlTargetRepository.getById(db, new CrawlTargetGetOptions({crawlTargetId: optsData.crawlTargetId, userId: optsData.userId}))

      if (!crawlTarget) {
        throw new SmithersError(SmithersErrorTypes.MANGA_CRAWL_TARGET_NOT_FOUND, 'Unable to find crawler to sync from', {crawlTargetId: optsData.crawlTargetId, userId: optsData.userId})
      } else {
        crawlTargets = [crawlTarget]
      }
    } else {
      crawlTargets = await CrawlTargetRepository.list(db, new CrawlTargetListOptions({}))
    }

    const results = await mangaSync(db, crawlTargets, optsData.webtoonLimiter, optsData.mangadexLimiter, optsData.psqlLimiter, optsData.onlyLatest)

    await Promise.all(results.reduce((acc: Promise<any>[], result) => {
      if (result.status === 'rejected' && result.reason.smithersContext) {
        console.error(result.reason)

        return [
          ...acc,
          CrawlTargetRepository.update(db, result.reason.smithersContext.getObject().crawlTargetId, {crawlSuccess: false, lastCrawledOn: new Date()})
        ]
      } else if (result.status === 'rejected') {
        console.error(result.reason)
        return acc
      } else {
        return acc
      }
    }, []))

    return
  }
}

export {
  SQLManga,
  MangaRepository
}
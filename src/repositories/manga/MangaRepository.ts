import { QueryResult } from "pg";
import { CrawlTargetRepository, SQLCrawlTarget } from "../CrawlTargetRepository"
import { SQLMangaUpdate } from "./MangaUpdateRepository"
import { Database } from "../../database/Database"
import { Manga } from "../../models/manga/Manga"
import { MangaListOptions } from "../../models/manga/MangaListOptions"
import { MangaSyncOptions } from "../../models/manga/MangaSyncOptions";
import { CrawlTargetListOptions } from "../../models/CrawlTargetListOptions";
import { CrawlTarget } from "../../models/CrawlTarget";
import { CrawlTargetGetOptions } from "../../models/CrawlTargetGetOptions";
import { mangaSync } from "./mangaSync";
import { SmithersError, SmithersErrorTypes } from "../../errors/SmithersError";

// Manga - Represented in SQL
interface SQLManga {
  crawler: SQLCrawlTarget;
  manga_updates: SQLMangaUpdate[];
}

namespace MangaRepository {
  export const list = async (db: Database, opts: MangaListOptions): Promise<Manga[]> => {
    let results: QueryResult<SQLManga>
  
    // TODO: Stored Procedures
    if (opts.getObject().onlyLatest) {
      results = await db.query({
        text: `
          SELECT
            x.crawler,
            x.manga_updates
          FROM (
            SELECT
              json_build_object(
              'crawl_target_id', crawl_target_id,
              'name', name,
              'url', url,
              'adapter', adapter,
              'last_crawled_on', last_crawled_on,
              'crawl_success', crawl_success,
              'user_id', user_id
              ) crawler,
              CASE
              WHEN manga_update_id IS NULL THEN ARRAY[]::json[]
              ELSE ARRAY[json_build_object(
                'manga_update_id', manga_update_id,
                'chapter', chapter,
                'chapter_name', chapter_name,
                'crawled_on', crawled_on,
                'is_read', is_read,
                'read_at', read_at
                )]
              END AS manga_updates,
              row_number() OVER (PARTITION BY crawl_target_id order by chapter DESC) as _rn
            FROM crawl_target
              LEFT JOIN manga_update
              USING (crawl_target_id)
            WHERE user_id = $1
            ORDER BY crawl_target_id
          ) x
          WHERE _rn = 1;
        `,
        values: [opts.getObject().userId]
      })
    } else {
      results = await db.query({
        text: `
          SELECT 
            json_build_object(
              'crawl_target_id', crawl_target_id,
              'name', name,
              'url', url,
              'adapter', adapter,
              'last_crawled_on', last_crawled_on,
              'crawl_success', crawl_success,
              'user_id', user_id
            ) crawler,
            COALESCE(
              json_agg(
                json_build_object(
                  'manga_update_id', manga_update_id,
                  'chapter', chapter,
                  'chapter_name', chapter_name,
                  'crawled_on', crawled_on,
                  'is_read', is_read,
                  'read_at', read_at
                )
              ) FILTER (WHERE manga_update_id IS NOT NULL),
              '[]'
            ) AS manga_updates
          FROM crawl_target
          LEFT JOIN manga_update
          USING (crawl_target_id)
          WHERE user_id = $1
          GROUP BY crawl_target_id
          ORDER BY crawl_target_id;
        `,
        values: [opts.getObject().userId]
      })
    }
  
    return results.rows.map((row) => {
      return Manga.fromSQL({
        ...row,
        crawler: {
          ...row.crawler,
          // Transform data types that aren't supported in JSON to their proper SQL representation
          last_crawled_on: row.crawler.last_crawled_on ? new Date(row.crawler.last_crawled_on) : row.crawler.last_crawled_on
        },
        manga_updates: row.manga_updates.map((update) => {
          return {
            ...update,
            crawled_on: new Date(update.crawled_on)
          }
        })
      })
    })
  }

  export const syncManga = async (db: Database, opts: MangaSyncOptions): Promise<void> => {
    let crawlTargets: CrawlTarget[] = []
    const optsData = opts.getObject()

    // Retreive from db what is supposed to be crawled
    if (optsData.crawlTargetId && optsData.userId) {
      const crawlTarget = await CrawlTargetRepository.getById(db, new CrawlTargetGetOptions({}))

      if (!crawlTarget) {
        throw new SmithersError(SmithersErrorTypes.MANGA_CRAWL_TARGET_NOT_FOUND, 'Unable to find crawler to sync from', {crawlTargetId: optsData.crawlTargetId, userId: optsData.userId})
      } else {
        crawlTargets = [crawlTarget]
      }
    } else {
      crawlTargets = await CrawlTargetRepository.list(db, new CrawlTargetListOptions({}))
    }

    const results = await mangaSync(db, crawlTargets, optsData.webtoonLimiter, optsData.mangadexLimiter, optsData.psqlLimiter)

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
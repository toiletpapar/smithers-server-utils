import { QueryResult } from "pg";
import { SQLCrawlTarget } from "../repositories/CrawlTargetRepository";
import { SQLMangaUpdate } from "../repositories/MangaUpdateRepository";
import { Database } from "../database/Database";
import { Manga } from "../models/Manga";
import { MangaListOptions } from "../models/MangaListOptions";

// Manga - Represented in SQL
interface SQLManga {
  crawler: SQLCrawlTarget;
  manga_updates: SQLMangaUpdate[];
}

namespace MangaRepository {
  export const list = async (opts: MangaListOptions): Promise<Manga[]> => {
    const db = await Database.getInstance()
  
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
}

export {
  SQLManga,
  MangaRepository
}
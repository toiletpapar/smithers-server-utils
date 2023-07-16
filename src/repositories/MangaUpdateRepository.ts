import { QueryResult } from 'pg'
import { Database } from '../database/Database'
import { IMangaUpdate, MangaUpdate } from '../models/MangaUpdate';
import { MangaUpdateListOptions } from '../models/MangaUpdateListOptions';

interface SQLMangaUpdate {
  manga_update_id: number;
  crawl_target_id: number;
  crawled_on: Date;
  chapter: number;
  chapter_name: string | null;
  is_read: boolean;
  read_at: string;
}

namespace MangaUpdateRepository {
  export const list = async (opts: MangaUpdateListOptions): Promise<MangaUpdate[]> => {
    const db = await Database.getInstance()
    const result: QueryResult<SQLMangaUpdate> = await db.query({
      text: `
        SELECT manga_update_id, manga_update.crawl_target_id, crawled_on, chapter, chapter_name, is_read, read_at
        FROM manga_update
        INNER JOIN crawl_target
          USING(crawl_target_id)
        WHERE user_id = $1;
      `,
      values: [opts.getObject().userId]
    })
  
    return result.rows.map((row) => {
      return MangaUpdate.fromSQL(row)
    })
  }
  
  export const insert = async (mangaUpdate: Omit<IMangaUpdate, 'mangaUpdateId'>): Promise<MangaUpdate> => {
    const db = await Database.getInstance()
  
    const result: QueryResult<SQLMangaUpdate> = await db.query({
      text: 'INSERT INTO manga_update (crawl_target_id, crawled_on, chapter, chapter_name, is_read, read_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;',
      values: [
        mangaUpdate.crawlId,
        mangaUpdate.crawledOn,
        mangaUpdate.chapter,
        mangaUpdate.chapterName,
        mangaUpdate.isRead,
        mangaUpdate.readAt
      ]
    })
  
    return MangaUpdate.fromSQL(result.rows[0])
  }
}

export {
  SQLMangaUpdate,
  MangaUpdateRepository
}
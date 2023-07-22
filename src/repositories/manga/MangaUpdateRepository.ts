import { QueryResult } from 'pg'
import { Database } from '../../database/Database'
import { IMangaUpdate, MangaUpdate } from '../../models/manga/MangaUpdate';
import { MangaUpdateListOptions } from '../../models/manga/MangaUpdateListOptions';

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
  const getSQLKey = (appKey: keyof IMangaUpdate): keyof SQLMangaUpdate => {
    switch(appKey) {
      case 'mangaUpdateId':
        return 'manga_update_id'
      case 'crawlId':
        return 'crawl_target_id'
      case 'crawledOn':
        return 'crawled_on'
      case 'chapter':
        return 'chapter'
      case 'chapterName':
        return 'chapter_name'
      case 'isRead':
        return 'is_read'
      case 'readAt':
        return 'read_at'
      default:
        throw new Error("Unknown appKey for MangaUpdate")
    }
  }

  export const list = async (db: Database, opts: MangaUpdateListOptions): Promise<MangaUpdate[]> => {
    const optsData = opts.getObject()
    let values: any[] = []
    let where = ''
    let join = ''

    if (optsData.userId) {
      values = [
        ...values,
        optsData.userId
      ]

      if (!join) {
        join = `
          INNER JOIN crawl_target
            USING(crawl_target_id)
        `
      }

      if (values.length === 1) {
        where = ` WHERE user_id = $${values.length.toString()}`
      } else {
        where = `${where} AND user_id = $${values.length.toString()}`
      }
    }

    if (optsData.crawlTargetId) {
      values = [
        ...values,
        optsData.crawlTargetId
      ]

      if (values.length === 1) {
        where = ` WHERE crawl_target_id = $${values.length.toString()}`
      } else {
        where = `${where} AND crawl_target_id = $${values.length.toString()}`
      }
    }

    const result: QueryResult<SQLMangaUpdate> = await db.query({
      text: `
        SELECT manga_update_id, manga_update.crawl_target_id, crawled_on, chapter, chapter_name, is_read, read_at
        FROM manga_update
        ${join}
        ${where};
      `,
      values
    })
  
    return result.rows.map((row) => {
      return MangaUpdate.fromSQL(row)
    })
  }
  
  export const insert = async (db: Database, mangaUpdate: Omit<IMangaUpdate, 'mangaUpdateId'>): Promise<MangaUpdate> => {
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

  export const update = async (db: Database, mangaUpdateId: number, mangaUpdate: Partial<Omit<IMangaUpdate, 'mangaUpdateId' | 'crawlId' | 'chapter'>>): Promise<MangaUpdate | null> => {
    const entries = Object.entries(mangaUpdate)

    if (entries.length === 0) {
      throw new Error ("Must update at least one property")
    }
  
    const result: QueryResult<SQLMangaUpdate> = await db.query({
      text: `
        UPDATE manga_update
        SET
          ${
            entries.reduce((acc, [key, value], index) => {
              let sql = `${acc}${getSQLKey(key as keyof IMangaUpdate)}=$${index+1}`

              if (index !== entries.length - 1) {
                sql = `${sql},\n`
              }

              return sql
            },'')
          }
        WHERE
          manga_update_id = $${entries.length + 1}
        RETURNING *;
      `,
      values: [...entries.map(([key, value]) => value), mangaUpdateId]
    })
  
    if (result.rows.length === 0) {
      return null
    }

    return MangaUpdate.fromSQL(result.rows[0])
  }
}

export {
  SQLMangaUpdate,
  MangaUpdateRepository
}
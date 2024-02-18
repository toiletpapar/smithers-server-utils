import { QueryResult } from 'pg'
import {  DatabaseQueryable } from '../../database/Database'
import { IMangaUpdate, MangaUpdate } from '../../models/manga/MangaUpdate';
import { IMangaUpdateListOptions, MangaUpdateListOptions } from '../../models/manga/MangaUpdateListOptions';
import { SmithersError, SmithersErrorTypes } from '../../errors/SmithersError';
import { MangaUpdateGetOptions } from '../../models/manga/MangaUpdateGetOptions';

interface SQLMangaUpdate {
  manga_update_id: number;
  crawl_target_id: number;
  crawled_on: Date;
  chapter: number;
  chapter_name: string | null;
  is_read: boolean;
  read_at: string;
  date_created: Date;
}

namespace MangaUpdateRepository {
  const getSQLKey = (appKey: keyof IMangaUpdate, prefix?: string): keyof SQLMangaUpdate => {
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
      case 'dateCreated':
        return 'date_created'
      default:
        throw new SmithersError(SmithersErrorTypes.MANGA_UPDATE_UNKNOWN_APP_KEY, 'Unknown appKey for MangaUpdate')
    }
  }

  export const list = async (db: DatabaseQueryable, opts: MangaUpdateListOptions): Promise<MangaUpdate[]> => {
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

    if (optsData.chapter) {
      values = [
        ...values,
        optsData.chapter
      ]

      if (values.length === 1) {
        where = ` WHERE chapter = $${values.length.toString()}`
      } else {
        where = `${where} AND chapter = $${values.length.toString()}`
      }
    }

    const result: QueryResult<SQLMangaUpdate> = await db.query({
      text: `
        SELECT manga_update_id, manga_update.crawl_target_id, crawled_on, chapter, chapter_name, is_read, read_at, date_created
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

  export const getByChapter = async (db: DatabaseQueryable, opts: MangaUpdateGetOptions) => {
    const optsData = opts.getObject()
    let listOptions: IMangaUpdateListOptions = {
      crawlTargetId: optsData.crawlTargetId,
      chapter: optsData.chapter
    }

    if (optsData.userId) {
      listOptions = {
        ...listOptions,
        userId: optsData.userId
      }
    }

    const result: MangaUpdate[] = await list(db, new MangaUpdateListOptions(listOptions))
  
    if (result[0]) {
      return result[0]
    } else {
      return null
    }
  }
  
  export const insert = async (db: DatabaseQueryable, mangaUpdate: Omit<IMangaUpdate, 'mangaUpdateId'>): Promise<MangaUpdate> => {
    const result: QueryResult<SQLMangaUpdate> = await db.query({
      text: 'INSERT INTO manga_update (crawl_target_id, crawled_on, chapter, chapter_name, is_read, read_at, date_created) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;',
      values: [
        mangaUpdate.crawlId,
        mangaUpdate.crawledOn,
        mangaUpdate.chapter,
        mangaUpdate.chapterName,
        mangaUpdate.isRead,
        mangaUpdate.readAt,
        mangaUpdate.dateCreated
      ]
    })
  
    return MangaUpdate.fromSQL(result.rows[0])
  }

  export const update = async (
    db: DatabaseQueryable,
    mangaUpdateId: number,
    mangaUpdate: Partial<Omit<IMangaUpdate, 'mangaUpdateId' | 'crawlId' | 'chapter' | 'dateCreated'>>,
    userId?: number
  ): Promise<MangaUpdate | null> => {
    const entries = Object.entries(mangaUpdate)

    if (entries.length === 0) {
      throw new SmithersError(SmithersErrorTypes.MANGA_UPDATE_UPDATE_AT_LEAST_ONE_PROPERTY, 'Must update at least one property', {mangaUpdateId})
    }

    let values = [...entries.map(([key, value]) => value), mangaUpdateId]

    if (userId) {
      values = [
        ...values,
        userId
      ]
    }
  
    const result: QueryResult<SQLMangaUpdate> = await db.query({
      text: `
        UPDATE manga_update mu
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
        ${
          !userId ? '' : `
            FROM
              crawl_target ct
          `
        }
        WHERE
          manga_update_id = $${entries.length + 1}
          ${!userId ? '' : `
            AND mu.crawl_target_id = ct.crawl_target_id
            AND ct.user_id = $${entries.length + 2}
          `}
        RETURNING *;
      `,
      values
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
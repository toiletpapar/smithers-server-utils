import { QueryResult } from 'pg'
import { Database, DatabaseQueryable } from '../database/Database'
import { CrawlTarget, CrawlerTypes, ICrawlTarget, ImageTypes } from '../models/crawlers/CrawlTarget'
import { CrawlTargetListOptions, ICrawlTargetListOptions } from '../models/crawlers/CrawlTargetListOptions';
import { CrawlTargetGetOptions } from '../models/crawlers/CrawlTargetGetOptions';
import { SmithersError, SmithersErrorTypes } from '../errors/SmithersError';
import { CrawlTargetSourceSearchOptions } from '../models/crawlers/CrawlTargetSourceSearchOptions';
import { MangadexRepository } from './mangadex/MangadexRepository';
import { WebtoonRepository } from './webtoon/WebtoonRepository';

interface SQLCrawlTarget {
  crawl_target_id: number;
  name: string;
  url: string;
  adapter: CrawlerTypes;
  last_crawled_on: Date | null;
  crawl_success: boolean | null;
  user_id: number;
  cover_image: string | null;
  cover_format: ImageTypes | null;
}

namespace CrawlTargetRepository {
  const getSQLKey = (appKey: keyof ICrawlTarget): keyof SQLCrawlTarget => {
    switch(appKey) {
      case 'crawlTargetId':
        return 'crawl_target_id'
      case 'name':
        return 'name'
      case 'url':
        return 'url'
      case 'adapter':
        return 'adapter'
      case 'lastCrawledOn':
        return 'last_crawled_on'
      case 'crawlSuccess':
        return 'crawl_success'
      case 'userId':
        return 'user_id'
      case 'coverImage':
        return 'cover_image'
      case 'coverFormat':
        return 'cover_format'
      default: {
        throw new SmithersError(SmithersErrorTypes.CRAWL_TARGET_UNKNOWN_APP_KEY, 'Unknown appKey for CrawlTarget')
      }
        
    }
  }

  // External search for crawl targets
  // On-demand, uncached, paginated - reduce unneeded crawling
  export const search = async (opts: CrawlTargetSourceSearchOptions): Promise<Omit<ICrawlTarget, "crawlTargetId">[]> => {
    let cursor: Cursor<Omit<ICrawlTarget, "crawlTargetId">>
    
    switch (opts.getObject().source) {
      case CrawlerTypes.mangadex:
        cursor = MangadexRepository.getSearchCursor(opts)
        break;
      case CrawlerTypes.webtoon:
        cursor = WebtoonRepository.getSearchCursor(opts)
        break;
      default:
        throw new SmithersError(SmithersErrorTypes.CRAWL_TARGET_UNKNOWN_SOURCE, 'Unknown source provided to crawler search', opts)
    }

    return cursor.next()
  }

  export const list = async(db: DatabaseQueryable, opts: CrawlTargetListOptions): Promise<CrawlTarget[]> => {
    const optsData = opts.getObject()
    let values: any[] = []
    let where = ''

    if (optsData.userId) {
      values = [
        ...values,
        optsData.userId
      ]

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

    const result: QueryResult<SQLCrawlTarget> = await db.query({
      text: `SELECT * FROM crawl_target${where};`,
      values
    })
  
    return result.rows.map((row) => {
      return CrawlTarget.fromSQL(row)
    })
  }

  export const getById = async(db: DatabaseQueryable, opts: CrawlTargetGetOptions) => {
    const optsData = opts.getObject()
    let listOptions: ICrawlTargetListOptions = {
      crawlTargetId: optsData.crawlTargetId
    }

    if (optsData.userId) {
      listOptions = {
        ...listOptions,
        userId: optsData.userId
      }
    }

    const result: CrawlTarget[] = await list(db, new CrawlTargetListOptions(listOptions))
  
    if (result[0]) {
      return result[0]
    } else {
      return null
    }
  }
  
  export const insert = async (db: DatabaseQueryable, crawlTarget: Omit<ICrawlTarget, 'crawlTargetId'>): Promise<CrawlTarget> => {
    const result: QueryResult<SQLCrawlTarget> = await db.query({
      text: 'INSERT INTO crawl_target (name, url, adapter, last_crawled_on, crawl_success, user_id, cover_image, cover_format) VALUES ($1, $2, $3, $4, $5, $6, $7::bytea, $8) RETURNING *;',
      values: [
        crawlTarget.name,
        crawlTarget.url,
        crawlTarget.adapter,
        crawlTarget.lastCrawledOn,
        crawlTarget.crawlSuccess,
        crawlTarget.userId,
        crawlTarget.coverImage ? crawlTarget.coverImage.toString('hex') : null,
        crawlTarget.coverFormat
      ]
    })
  
    return CrawlTarget.fromSQL(result.rows[0])
  }

  export const update = async (
    db: DatabaseQueryable,
    crawlTargetId: number,
    crawlTarget: Partial<Omit<ICrawlTarget, 'crawlTargetId' | 'userId'>>,
    userId?: number
  ): Promise<CrawlTarget | null> => {
    const entries = Object.entries(crawlTarget)

    if (entries.length === 0) {
      throw new SmithersError(SmithersErrorTypes.CRAWL_TARGET_UPDATE_AT_LEAST_ONE_PROPERTY, 'Must update at least one property', {crawlTargetId})
    }

    let values = [...entries.map(([key, value]) => {
      const sqlKey = getSQLKey(key as keyof ICrawlTarget)

      if (sqlKey === 'cover_image') {
        return value ? value.toString('hex') : null
      }

      return value
    }), crawlTargetId]

    if (userId) {
      values = [
        ...values,
        userId
      ]
    }
  
    const result: QueryResult<SQLCrawlTarget> = await db.query({
      text: `
        UPDATE crawl_target
        SET
          ${
            entries.reduce((acc, [key, value], index) => {
              let updateSql = ''
              const sqlKey = getSQLKey(key as keyof ICrawlTarget)

              if (sqlKey === 'cover_image') {
                updateSql = `${sqlKey}=$${index+1}::bytea`
              } else {
                updateSql = `${sqlKey}=$${index+1}`
              }

              let sql = `${acc}${updateSql}`

              if (index !== entries.length - 1) {
                sql = `${sql},\n`
              }

              return sql
            },'')
          }
        WHERE
          crawl_target_id = $${entries.length + 1}
          ${!userId ? '' : `
            AND user_id = $${entries.length + 2}
          `}
        RETURNING *;
      `,
      values
    })
  
    if (result.rows.length === 0) {
      return null
    }

    return CrawlTarget.fromSQL(result.rows[0])
  }
}

export {
  SQLCrawlTarget,
  CrawlTargetRepository
}
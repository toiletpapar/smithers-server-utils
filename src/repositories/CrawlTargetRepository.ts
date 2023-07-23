import { QueryResult } from 'pg'
import { Database } from '../database/Database'
import { CrawlTarget, CrawlerTypes, ICrawlTarget } from '../models/CrawlTarget'
import { CrawlTargetListOptions } from '../models/CrawlTargetListOptions';
import { CrawlTargetGetOptions } from '../models/CrawlTargetGetOptions';
import { SmithersError, SmithersErrorTypes } from '../errors/SmithersError';

interface SQLCrawlTarget {
  crawl_target_id: number;
  name: string;
  url: string;
  adapter: CrawlerTypes;
  last_crawled_on: Date | null;
  crawl_success: boolean | null;
  user_id: number;
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
      default: {
        throw new SmithersError(SmithersErrorTypes.CRAWL_TARGET_UNKNOWN_APP_KEY, 'Unknown appKey for CrawlTarget')
      }
        
    }
  }

  export const list = async(db: Database, opts: CrawlTargetListOptions): Promise<CrawlTarget[]> => {
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

    const result: QueryResult<SQLCrawlTarget> = await db.query({
      text: `SELECT * FROM crawl_target${where};`,
      values
    })
  
    return result.rows.map((row) => {
      return CrawlTarget.fromSQL(row)
    })
  }

  export const getById = async(db: Database, opts: CrawlTargetGetOptions) => {
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
  
    if (result.rows[0]) {
      return CrawlTarget.fromSQL(result.rows[0])
    } else {
      return null
    }
  }
  
  export const insert = async (db: Database, crawlTarget: Omit<ICrawlTarget, 'crawlTargetId'>): Promise<CrawlTarget> => {
    const result: QueryResult<SQLCrawlTarget> = await db.query({
      text: 'INSERT INTO crawl_target (name, url, adapter, last_crawled_on, crawl_success, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;',
      values: [
        crawlTarget.name,
        crawlTarget.url,
        crawlTarget.adapter,
        crawlTarget.lastCrawledOn,
        crawlTarget.crawlSuccess,
        crawlTarget.userId
      ]
    })
  
    return CrawlTarget.fromSQL(result.rows[0])
  }

  export const update = async (db: Database, crawlTargetId: number, crawlTarget: Partial<Omit<ICrawlTarget, 'crawlTargetId'>>): Promise<CrawlTarget | null> => {
    const entries = Object.entries(crawlTarget)

    if (entries.length === 0) {
      throw new SmithersError(SmithersErrorTypes.CRAWL_TARGET_UPDATE_AT_LEAST_ONE_PROPERTY, 'Must update at least one property', {crawlTargetId})
    }
  
    const result: QueryResult<SQLCrawlTarget> = await db.query({
      text: `
        UPDATE crawl_target
        SET
          ${
            entries.reduce((acc, [key, value], index) => {
              let sql = `${acc}${getSQLKey(key as keyof ICrawlTarget)}=$${index+1}`

              if (index !== entries.length - 1) {
                sql = `${sql},\n`
              }

              return sql
            },'')
          }
        WHERE
          crawl_target_id = $${entries.length + 1}
        RETURNING *;
      `,
      values: [...entries.map(([key, value]) => value), crawlTargetId]
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
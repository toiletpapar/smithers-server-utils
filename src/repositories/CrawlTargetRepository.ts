import { QueryResult } from 'pg'
import { Database } from '../database/Database'
import { CrawlTarget, CrawlerTypes, ICrawlTarget } from '../models/CrawlTarget'
import { CrawlTargetListOptions } from '../models/CrawlTargetListOptions';

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
  export const list = async(opts: CrawlTargetListOptions): Promise<CrawlTarget[]> => {
    const db = await Database.getInstance()
    const result: QueryResult<SQLCrawlTarget> = await db.query({
      text: 'SELECT * FROM crawl_target WHERE user_id = $1;',
      values: [opts.getObject().userId]
    })
  
    return result.rows.map((row) => {
      return CrawlTarget.fromSQL(row)
    })
  }
  
  export const insert = async (crawlTarget: Omit<ICrawlTarget, 'crawlTargetId'>): Promise<CrawlTarget> => {
    const db = await Database.getInstance()
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
}

export {
  SQLCrawlTarget,
  CrawlTargetRepository
}
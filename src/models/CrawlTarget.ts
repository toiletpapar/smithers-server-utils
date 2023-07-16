import { object, string, boolean, number, mixed, array } from 'yup'
import { isISO8601 } from '../utils/isISO8601'
import { SQLCrawlTarget } from '../repositories/CrawlTargetRepository'

enum CrawlerTypes {
  webtoon = 'webtoon',
  mangadex = 'mangadex'
}

interface ICrawlTarget {
  crawlTargetId: number;  // identifier, primary
  name: string;  // human readable identifier
  url: string;  // The place to search
  adapter: CrawlerTypes; // The strategy to use to find the information when crawling
  lastCrawledOn: Date | null; // The date of the latest crawl
  crawlSuccess: boolean | null; // Whether the latest crawl logged data
  userId: number; // the identifier of the owner of this target
}

class CrawlTarget {
  private data: ICrawlTarget;
  static allProperties: (keyof ICrawlTarget)[] = ['crawlTargetId', 'name', 'url', 'adapter', 'lastCrawledOn', 'crawlSuccess', 'userId']
  private static propertiesSchema = array().of(string().oneOf(this.allProperties).defined()).defined().strict(true)
  private static dataSchema = object({
    crawlTargetId: number().required(),
    name: string().max(100).required(),
    url: string().url().required(),
    adapter: mixed<CrawlerTypes>().oneOf(Object.values(CrawlerTypes)).required(),
    lastCrawledOn: string().defined().nullable().test('is-iso8601', 'Value must be in ISO8601 format or null', (input) => input === null || isISO8601(input)),
    crawlSuccess: boolean().defined().nullable(),
    userId: number().required()
  }).noUnknown()

  public constructor(data: ICrawlTarget) {
    this.data = data
  }

  public static fromSQL(data: SQLCrawlTarget) {
    return new this({
      crawlTargetId: data.crawl_target_id,
      name: data.name,
      url: data.url,
      adapter: data.adapter,
      lastCrawledOn: data.last_crawled_on,
      crawlSuccess: data.crawl_success,
      userId: data.user_id
    })
  }

  public static async fromRequest(data: any) {
    const result = (await this.validateRequest(data, this.allProperties)) as ICrawlTarget

    return new this({
      crawlTargetId: result.crawlTargetId,
      name: result.name,
      url: result.url,
      adapter: result.adapter,
      lastCrawledOn: result.lastCrawledOn,
      crawlSuccess: result.crawlSuccess,
      userId: result.userId
    })
  }

  public static async validateRequest(data: any, properties: string[], strict: boolean = true): Promise<Partial<ICrawlTarget>> {
    // Validate properties provided by the request
    const validatedProperties = await this.propertiesSchema.validate(properties)

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.dataSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})
    const coercedData: Partial<ICrawlTarget> = {}

    // coerce data types
    if (validatedData.lastCrawledOn) {
      coercedData.lastCrawledOn = new Date(validatedData.lastCrawledOn)
    }

    return {
      ...validatedData as any,
      ...coercedData
    }
  }

  public getObject(): ICrawlTarget {
    return {
      ...this.data
    }
  }

  public serialize() {
    return {
      ...this.data,
      lastCrawledOn: this.data.lastCrawledOn ? this.data.lastCrawledOn.toISOString() : this.data.lastCrawledOn
    }
  }
} 

export {
  CrawlTarget,
  CrawlerTypes,
  ICrawlTarget
}
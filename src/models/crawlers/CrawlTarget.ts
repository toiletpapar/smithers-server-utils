import { object, string, boolean, number, mixed, array } from 'yup'
import { isISO8601 } from '../../utils/isISO8601'
import { SQLCrawlTarget } from '../../repositories/crawlers/CrawlTargetRepository'
import zlib from 'zlib'
import util from 'util'
import { ImageTypes } from '../image/Image'

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
  coverImage: Buffer | null; // the manga cover's image data
  coverFormat: ImageTypes | null; // the format of the cover image data
  coverSignature: Buffer | null; // The SHA-256 hash of the image
  favourite: boolean;
}

class CrawlTarget {
  private data: ICrawlTarget;
  private static requestSchema = object({
    crawlTargetId: number().required(),
    name: string().max(100).required(),
    url: string().url().required(),
    adapter: mixed<CrawlerTypes>().oneOf(Object.values(CrawlerTypes)).required(),
    lastCrawledOn: string().defined().nullable().test('is-iso8601', 'Value must be in ISO8601 format or null', (input) => input === null || isISO8601(input)),
    crawlSuccess: boolean().defined().nullable(),
    userId: number().required(),
    coverImage: mixed<Buffer>().defined().nullable().test('is-buffer', 'Value must be a Buffer', (input) => input === null || Buffer.isBuffer(input)),
    coverFormat: mixed<ImageTypes>().oneOf(Object.values(ImageTypes)).required(),
    coverSignature: mixed<Buffer>().defined().nullable().test('is-buffer', 'Value must be a Buffer', (input) => input === null || Buffer.isBuffer(input)),
    favourite: boolean().required()
  }).noUnknown().defined("Data must be defined")

  static allRequestProperties: (keyof ICrawlTarget)[] = ['crawlTargetId', 'name', 'url', 'adapter', 'lastCrawledOn', 'crawlSuccess', 'userId', 'coverImage',  'coverFormat', 'coverSignature', 'favourite']
  static getPropertiesRequestSchema(validProperties: (keyof ICrawlTarget)[]) {
    return array().of(string().oneOf(validProperties).defined()).defined("Properties must be defined").min(1, "Properties must contain elements").strict(true)
  }

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
      userId: data.user_id,
      coverImage: data.cover_image ? data.cover_image : null,
      coverFormat: data.cover_format ? data.cover_format : null,
      coverSignature: data.cover_signature ? data.cover_signature : null,
      favourite: data.favourite
    })
  }

  public static async fromRequest(data: any, strict: boolean = true) {
    const result = (await this.validateRequest(data, this.allRequestProperties, strict)) as ICrawlTarget

    return new this({
      crawlTargetId: result.crawlTargetId,
      name: result.name,
      url: result.url,
      adapter: result.adapter,
      lastCrawledOn: result.lastCrawledOn,
      crawlSuccess: result.crawlSuccess,
      userId: result.userId,
      coverImage: result.coverImage,
      coverFormat: result.coverFormat,
      coverSignature: result.coverSignature,
      favourite: result.favourite
    })
  }

  public static async validateRequest(
    data: any,  // Data in the request
    properties: any, // Properties in the request
    strict: boolean = true,
    validProperties: (keyof ICrawlTarget)[] = this.allRequestProperties // Properties you accept from the request
  ): Promise<Partial<ICrawlTarget>> {
    // Validate properties provided by the request
    const validatedProperties = await this.getPropertiesRequestSchema(validProperties).validate(properties, {abortEarly: false})

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.requestSchema.pick(validatedProperties).strict(strict)
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

  public async serialize() {
    return {
      ...this.data,
      lastCrawledOn: this.data.lastCrawledOn ? this.data.lastCrawledOn.toISOString() : this.data.lastCrawledOn,
      coverImage: this.data.coverImage ? this.data.coverImage.toString('base64') : this.data.coverImage,
      coverSignature: this.data.coverSignature ? this.data.coverSignature.toString('hex') : this.data.coverSignature
    }
  }
} 

export {
  CrawlTarget,
  CrawlerTypes,
  ImageTypes,
  ICrawlTarget
}
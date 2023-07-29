import { object, string, array, number, mixed } from 'yup'
import { CrawlerTypes } from './CrawlTarget';

interface ICrawlTargetSourceSearchOptions {
  query: string;  // The manga to look for
  userId: number; // The person requesting the search
  page: number;   // Used to offset the results returned from different sources
  source: CrawlerTypes; // The source to find crawl targets from
}

class CrawlTargetSourceSearchOptions {
  private data: ICrawlTargetSourceSearchOptions;
  private static requestSchema = object({
    query: string().required(),
    userId: number().required(),
    page: number().positive().integer().required(),
    source: mixed<CrawlerTypes>().oneOf(Object.values(CrawlerTypes)).required()
  }).noUnknown().defined("Data must be defined")

  static allRequestProperties: (keyof ICrawlTargetSourceSearchOptions)[] = ['query', 'userId', 'page', 'source']
  private static getPropertiesRequestSchema(validProperties: (keyof ICrawlTargetSourceSearchOptions)[]) {
    return array().of(string().oneOf(validProperties).defined()).defined("Properties must be defined").min(1, "Properties must contain elements").strict(true)
  }

  public constructor(data: ICrawlTargetSourceSearchOptions) {
    this.data = data
  }

  public static async fromRequest(data: any, strict: boolean = true) {
    const result = (await this.validateRequest(data, this.allRequestProperties, strict)) as ICrawlTargetSourceSearchOptions

    return new this({
      query: result.query,
      userId: result.userId,
      page: result.page,
      source: result.source
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(
    data: any,  // Data from the request
    properties: any, // Properties from the request
    strict: boolean = true,
    validProperties: (keyof ICrawlTargetSourceSearchOptions)[] = this.allRequestProperties // Properties you accept from the request
  ): Promise<Partial<ICrawlTargetSourceSearchOptions>> {
    // Validate properties provided by the request
    const validatedProperties = await this.getPropertiesRequestSchema(validProperties).validate(properties, {abortEarly: false})

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.requestSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})
    const coercedData: Partial<ICrawlTargetSourceSearchOptions> = {}

    return {
      ...validatedData as any,
      ...coercedData
    }
  }

  public getObject(): ICrawlTargetSourceSearchOptions {
    return {
      ...this.data
    }
  }
}

export {
  CrawlTargetSourceSearchOptions,
  ICrawlTargetSourceSearchOptions,
}
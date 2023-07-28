import { object, number, array, string } from 'yup'

interface ICrawlTargetListOptions {
  userId?: number;
  crawlTargetId?: number;
}

class CrawlTargetListOptions {
  private data: ICrawlTargetListOptions;
  private static requestSchema = object({
    userId: number().required(),
    crawlTargetId: number().optional()
  }).noUnknown().defined("Data must be defined")

  static allRequestProperties: (keyof ICrawlTargetListOptions)[] = ['userId', 'crawlTargetId']
  private static getPropertiesRequestSchema(validProperties: (keyof ICrawlTargetListOptions)[]) {
    return array().of(string().oneOf(validProperties).defined()).defined("Properties must be defined").min(1, "Properties must contain elements").strict(true)
  }

  public constructor(data: ICrawlTargetListOptions) {
    this.data = data
  }

  public static async fromRequest(data: any, strict: boolean = true) {
    const result = (await this.validateRequest(data, this.allRequestProperties, strict)) as ICrawlTargetListOptions

    return new this({
      userId: result.userId,
      crawlTargetId: result.crawlTargetId
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(
    data: any,  // Data from the request
    properties: any, // Properties from the request
    strict: boolean = true,
    validProperties: (keyof ICrawlTargetListOptions)[] = this.allRequestProperties // Properties you accept from the request
  ): Promise<Partial<ICrawlTargetListOptions>> {
    // Validate properties provided by the request
    const validatedProperties = await this.getPropertiesRequestSchema(validProperties).validate(properties, {abortEarly: false})

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.requestSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})

    return validatedData
  }

  public getObject(): ICrawlTargetListOptions {
    return {
      ...this.data
    }
  }
}

export {
  CrawlTargetListOptions,
  ICrawlTargetListOptions,
}
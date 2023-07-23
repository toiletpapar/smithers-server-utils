import { object, number, array, string } from 'yup'

interface ICrawlTargetGetOptions {
  userId?: number;
  crawlTargetId?: number;
}

class CrawlTargetGetOptions {
  private data: ICrawlTargetGetOptions;
  static allRequestProperties: (keyof ICrawlTargetGetOptions)[] = ['userId', 'crawlTargetId']
  private static propertiesRequestSchema = array().of(string().oneOf(this.allRequestProperties).defined()).defined().strict(true)
  private static requestSchema = object({
    userId: number().required(),
    crawlTargetId: number().required()
  }).noUnknown()

  public constructor(data: ICrawlTargetGetOptions) {
    this.data = data
  }

  public static async fromRequest(data: any, strict: boolean = true) {
    const result = (await this.validateRequest(data, this.allRequestProperties, strict)) as ICrawlTargetGetOptions

    return new this({
      userId: result.userId
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(data: any, properties: string[], strict: boolean = true): Promise<Partial<ICrawlTargetGetOptions>> {
    // Validate properties provided by the request
    const validatedProperties = await this.propertiesRequestSchema.validate(properties)

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.requestSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})

    return validatedData
  }

  public getObject(): ICrawlTargetGetOptions {
    return {
      ...this.data
    }
  }
}

export {
  CrawlTargetGetOptions,
  ICrawlTargetGetOptions,
}
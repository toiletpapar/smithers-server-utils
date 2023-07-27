import { object, number, array, string } from 'yup'

interface IMangaUpdateGetOptions {
  userId?: number;
  crawlTargetId: number;
  chapter: number;
}

class MangaUpdateGetOptions {
  private data: IMangaUpdateGetOptions;
  private static requestSchema = object({
    userId: number().required(),
    crawlTargetId: number().required(),
    chapter: number().required()
  }).noUnknown().defined("Data must be defined")

  static allRequestProperties: (keyof IMangaUpdateGetOptions)[] = ['userId', 'crawlTargetId', 'chapter']
  private static getPropertiesRequestSchema(validProperties: (keyof IMangaUpdateGetOptions)[]) {
    return array().of(string().oneOf(validProperties).defined()).defined("Properties must be defined").min(1, "Properties must contain elements").strict(true)
  }

  public constructor(data: IMangaUpdateGetOptions) {
    this.data = data
  }

  public static async fromRequest(data: any, strict: boolean = true) {
    const result = (await this.validateRequest(data, this.allRequestProperties, strict)) as IMangaUpdateGetOptions

    return new this({
      userId: result.userId,
      crawlTargetId: result.crawlTargetId,
      chapter: result.chapter
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(
    data: any,  // Data from the request
    properties: any, // Properties from the request
    strict: boolean = true,
    validProperties: (keyof IMangaUpdateGetOptions)[] = this.allRequestProperties // Properties you accept from the request
  ): Promise<Partial<IMangaUpdateGetOptions>> {
    // Validate properties provided by the request
    const validatedProperties = await this.getPropertiesRequestSchema(validProperties).validate(properties, {abortEarly: false})

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.requestSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})

    return validatedData
  }

  public getObject(): IMangaUpdateGetOptions {
    return {
      ...this.data
    }
  }
}

export {
  MangaUpdateGetOptions,
  IMangaUpdateGetOptions,
}
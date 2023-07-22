import { object, number, array, string } from 'yup'

interface IMangaUpdateListOptions {
  userId?: number;
  crawlTargetId?: number;
}

class MangaUpdateListOptions {
  private data: IMangaUpdateListOptions;
  static allRequestProperties: (keyof IMangaUpdateListOptions)[] = ['userId', 'crawlTargetId']
  private static propertiesRequestSchema = array().of(string().oneOf(this.allRequestProperties).defined()).defined().strict(true)
  private static requestSchema = object({
    userId: number().required(),
    crawlTargetId: number().optional()
  }).noUnknown().strict(true)

  public constructor(data: IMangaUpdateListOptions) {
    this.data = data
  }

  public static async fromRequest(data: any) {
    const result = (await this.validateRequest(data, this.allRequestProperties)) as IMangaUpdateListOptions

    return new this({
      userId: result.userId
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(data: any, properties: string[], strict: boolean = true): Promise<Partial<IMangaUpdateListOptions>> {
    // Validate properties provided by the request
    const validatedProperties = await this.propertiesRequestSchema.validate(properties)

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.requestSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})

    return validatedData
  }

  public getObject(): IMangaUpdateListOptions {
    return {
      ...this.data
    }
  }
}

export {
  MangaUpdateListOptions,
  IMangaUpdateListOptions,
}
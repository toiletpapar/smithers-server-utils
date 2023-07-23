import Bottleneck from 'bottleneck'
import { object, string, array, number } from 'yup'

interface IMangaSyncOptions extends IRequestMangaSyncOptions {
  webtoonLimiter: Bottleneck;
  mangadexLimiter: Bottleneck;
  psqlLimiter: Bottleneck;
}

interface IRequestMangaSyncOptions {
  crawlTargetId?: number;
  userId?: number;
}

class MangaSyncOptions {
  private data: IMangaSyncOptions;
  static allRequestProperties: (keyof IRequestMangaSyncOptions)[] = ['crawlTargetId', 'userId']
  private static propertiesRequestSchema = array().of(string().oneOf(this.allRequestProperties).defined()).defined().strict(true)
  private static requestSchema = object({
    crawlTargetId: number().required(),
    userId: number().required()
  }).noUnknown()

  public constructor(data: Partial<Omit<IMangaSyncOptions, 'userId' | 'crawlTargetId'>> & IRequestMangaSyncOptions) {
    this.data = {
      ...data,
      webtoonLimiter: !data.webtoonLimiter ? new Bottleneck({maxConcurrent: 1}) : data.webtoonLimiter,
      mangadexLimiter: !data.mangadexLimiter ? new Bottleneck({maxConcurrent: 1}) : data.mangadexLimiter,
      psqlLimiter: !data.psqlLimiter ? new Bottleneck({maxConcurrent: 50}) : data.psqlLimiter
    }
  }

  public static async fromRequest(data: any): Promise<MangaSyncOptions> {
    const result = (await this.validateRequest(data, this.allRequestProperties)) as IRequestMangaSyncOptions

    return new this({
      crawlTargetId: result.crawlTargetId,
      userId: result.userId
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(data: any, properties: string[], strict: boolean = true): Promise<Partial<IRequestMangaSyncOptions>> {
    // Validate properties provided by the request
    const validatedProperties = await this.propertiesRequestSchema.validate(properties)

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.requestSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})
    const coercedData: Partial<IRequestMangaSyncOptions> = {}

    return {
      ...validatedData as any,
      ...coercedData
    }
  }

  public getObject(): IMangaSyncOptions {
    return {
      ...this.data
    }
  }
}

export {
  MangaSyncOptions,
  IMangaSyncOptions,
}
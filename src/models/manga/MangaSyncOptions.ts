import Bottleneck from 'bottleneck'
import { object, string, array, number } from 'yup'

interface IMangaSyncOptions extends IRequestMangaSyncOptions {
  webtoonLimiter: Bottleneck;
  mangadexLimiter: Bottleneck;
  psqlLimiter: Bottleneck;
  onlyLatest: boolean;
}

interface IRequestMangaSyncOptions {
  crawlTargetId?: number;
  userId?: number;
}

class MangaSyncOptions {
  private data: IMangaSyncOptions;
  private static requestSchema = object({
    crawlTargetId: number().required(),
    userId: number().required()
  }).noUnknown().defined("Data must be defined")

  static allRequestProperties: (keyof IRequestMangaSyncOptions)[] = ['crawlTargetId', 'userId']
  private static getPropertiesRequestSchema(validProperties: (keyof IRequestMangaSyncOptions)[]) {
    return array().of(string().oneOf(validProperties).defined()).defined("Properties must be defined").min(1, "Properties must contain elements").strict(true)
  }

  public constructor(data: Partial<Omit<IMangaSyncOptions, 'userId' | 'crawlTargetId'>> & IRequestMangaSyncOptions) {
    this.data = {
      ...data,
      webtoonLimiter: !data.webtoonLimiter ? new Bottleneck({maxConcurrent: 1}) : data.webtoonLimiter,
      mangadexLimiter: !data.mangadexLimiter ? new Bottleneck({maxConcurrent: 1}) : data.mangadexLimiter,
      psqlLimiter: !data.psqlLimiter ? new Bottleneck({maxConcurrent: 50}) : data.psqlLimiter,
      onlyLatest: data.onlyLatest === undefined ? true : data.onlyLatest
    }
  }

  public static async fromRequest(data: any, strict: boolean = true): Promise<MangaSyncOptions> {
    const result = (await this.validateRequest(data, this.allRequestProperties, strict)) as IRequestMangaSyncOptions

    return new this({
      crawlTargetId: result.crawlTargetId,
      userId: result.userId
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(
    data: any,  // Data from the request
    properties: any, // Properties from the request
    strict: boolean = true,
    validProperties: (keyof IRequestMangaSyncOptions)[] = this.allRequestProperties // Properties you accept from the request
  ): Promise<Partial<IRequestMangaSyncOptions>> {
    // Validate properties provided by the request
    const validatedProperties = await this.getPropertiesRequestSchema(validProperties).validate(properties, {abortEarly: false})

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
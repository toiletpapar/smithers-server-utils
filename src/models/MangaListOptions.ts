import { object, string, array, number } from 'yup'
import { decodeBoolean } from '../utils/decodeQuery';

interface IMangaListOptions {
  onlyLatest: boolean;
  userId: number;
}

class MangaListOptions {
  private data: IMangaListOptions;
  static allProperties: (keyof IMangaListOptions)[] = ['onlyLatest', 'userId']
  private static propertiesSchema = array().of(string().oneOf(this.allProperties).defined()).defined().strict(true)
  private static dataSchema = object({
    onlyLatest: string().oneOf(['true', 'false']).optional(),
    userId: number().required()
  }).noUnknown().strict(true)

  public constructor(data: IMangaListOptions) {
    this.data = data
  }

  public static async fromRequest(data: any) {
    const result = (await this.validateRequest(data, this.allProperties)) as IMangaListOptions

    return new this({
      onlyLatest: result.onlyLatest,
      userId: result.userId
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(data: any, properties: string[], strict: boolean = true): Promise<Partial<IMangaListOptions>> {
    // Validate properties provided by the request
    const validatedProperties = await this.propertiesSchema.validate(properties)

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.dataSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})
    const coercedData: Partial<IMangaListOptions> = {}

    // coerce data types
    if (validatedData.onlyLatest) {
      coercedData.onlyLatest = decodeBoolean(validatedData.onlyLatest)
    } else {
      coercedData.onlyLatest = true
    }

    return {
      ...validatedData as any,
      ...coercedData
    }
  }

  public getObject(): IMangaListOptions {
    return {
      ...this.data
    }
  }
}

export {
  MangaListOptions,
  IMangaListOptions,
}
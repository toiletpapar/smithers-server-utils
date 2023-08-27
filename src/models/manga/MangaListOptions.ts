import { object, string, array, number } from 'yup'
import { decodeBoolean } from '../../utils/decodeQuery';

interface IMangaListOptions {
  onlyLatest: boolean;
  userId: number;
  projectImage?: boolean;
}

class MangaListOptions {
  private data: IMangaListOptions;
  private static requestSchema = object({
    onlyLatest: string().oneOf(['true', 'false']).optional(),
    userId: number().required(),
    projectImage: string().oneOf(['true', 'false']).optional(),
  }).noUnknown().defined("Data must be defined")

  static allRequestProperties: (keyof IMangaListOptions)[] = ['onlyLatest', 'userId', 'projectImage']
  private static getPropertiesRequestSchema(validProperties: (keyof IMangaListOptions)[]) {
    return array().of(string().oneOf(validProperties).defined()).defined("Properties must be defined").min(1, "Properties must contain elements").strict(true)
  }

  public constructor(data: IMangaListOptions) {
    this.data = data
  }

  public static async fromRequest(data: any, strict: boolean = true) {
    const result = (await this.validateRequest(data, this.allRequestProperties, strict)) as IMangaListOptions

    return new this({
      onlyLatest: result.onlyLatest,
      userId: result.userId,
      projectImage: result.projectImage
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(
    data: any,  // Data from the request
    properties: any, // Properties from the request
    strict: boolean = true,
    validProperties: (keyof IMangaListOptions)[] = this.allRequestProperties // Properties you accept from the request
  ): Promise<Partial<IMangaListOptions>> {
    // Validate properties provided by the request
    const validatedProperties = await this.getPropertiesRequestSchema(validProperties).validate(properties, {abortEarly: false})

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.requestSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})
    const coercedData: Partial<IMangaListOptions> = {}

    // coerce data types
    if (validatedData.onlyLatest) {
      coercedData.onlyLatest = decodeBoolean(validatedData.onlyLatest)
    } else {
      coercedData.onlyLatest = true
    }

    if (validatedData.projectImage) {
      coercedData.projectImage = decodeBoolean(validatedData.projectImage)
    } else {
      coercedData.projectImage = false
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
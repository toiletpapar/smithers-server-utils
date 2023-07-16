import { object, number, array, string } from 'yup'

interface IMangaUpdateListOptions {
  userId: number;
}

class MangaUpdateListOptions {
  private data: IMangaUpdateListOptions;
  static allProperties: (keyof IMangaUpdateListOptions)[] = ['userId']
  private static propertiesSchema = array().of(string().oneOf(this.allProperties).defined()).defined().strict(true)
  private static dataSchema = object({
    userId: number().required(),
  }).noUnknown().strict(true)

  public constructor(data: IMangaUpdateListOptions) {
    this.data = data
  }

  public static async fromRequest(data: any) {
    const result = (await this.validateRequest(data, this.allProperties)) as IMangaUpdateListOptions

    return new this({
      userId: result.userId
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(data: any, properties: string[], strict: boolean = true): Promise<Partial<IMangaUpdateListOptions>> {
    // Validate properties provided by the request
    const validatedProperties = await this.propertiesSchema.validate(properties)

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.dataSchema.pick(validatedProperties).strict(strict)
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
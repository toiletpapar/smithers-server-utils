import { object, string, array, number } from 'yup'

interface IMangaSourceSearchOptions {
  query: string;  // The manga to look for
  userId: number; // The person requesting the search
  limit: number;  // The maximum number of search results to return
  offset: number; // The number of search results to skip
}

class MangaSourceSearchOptions {
  private data: IMangaSourceSearchOptions;
  private static requestSchema = object({
    query: string().required(),
    userId: number().required(),
    limit: number().required(),
    offset: number().required()
  }).noUnknown().defined("Data must be defined")

  static allRequestProperties: (keyof IMangaSourceSearchOptions)[] = ['query', 'userId', 'limit', 'offset']
  private static getPropertiesRequestSchema(validProperties: (keyof IMangaSourceSearchOptions)[]) {
    return array().of(string().oneOf(validProperties).defined()).defined("Properties must be defined").min(1, "Properties must contain elements").strict(true)
  }

  public constructor(data: IMangaSourceSearchOptions) {
    this.data = data
  }

  public static async fromRequest(data: any, strict: boolean = true) {
    const result = (await this.validateRequest(data, this.allRequestProperties, strict)) as IMangaSourceSearchOptions

    return new this({
      query: result.query,
      userId: result.userId,
      limit: result.limit,
      offset: result.offset
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(
    data: any,  // Data from the request
    properties: any, // Properties from the request
    strict: boolean = true,
    validProperties: (keyof IMangaSourceSearchOptions)[] = this.allRequestProperties // Properties you accept from the request
  ): Promise<Partial<IMangaSourceSearchOptions>> {
    // Validate properties provided by the request
    const validatedProperties = await this.getPropertiesRequestSchema(validProperties).validate(properties, {abortEarly: false})

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.requestSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})
    const coercedData: Partial<IMangaSourceSearchOptions> = {}

    return {
      ...validatedData as any,
      ...coercedData
    }
  }

  public getObject(): IMangaSourceSearchOptions {
    return {
      ...this.data
    }
  }
}

export {
  MangaSourceSearchOptions,
  IMangaSourceSearchOptions,
}
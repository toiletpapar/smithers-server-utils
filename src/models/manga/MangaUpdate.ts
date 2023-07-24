import { object, string, boolean, number, array } from 'yup'
import { isISO8601 } from '../../utils/isISO8601'
import { SQLMangaUpdate } from '../../repositories/manga/MangaUpdateRepository';

interface IMangaUpdate {
  mangaUpdateId: number; // identifier, primary
  dateCreated: Date;
  crawlId: number; // the identifier of the crawler that produced the result, foreign
  crawledOn: Date; // the date this update was logged
  chapter: number; // number of the chapter
  chapterName: string | null; // name of the chapter
  isRead: boolean; // whether the user read the update, logged onClick
  readAt: string; // a link to read the chapter
}

class MangaUpdate {
  private data: IMangaUpdate;
  private static requestSchema = object({
    mangaUpdateId: number().required(),
    crawlId: number().required(),
    crawledOn: string().required().test('is-iso8601', 'Value must be in ISO8601 format', isISO8601),
    chapter: number().min(0).max(32767).integer().required(),
    chapterName: string().defined().nullable(),
    isRead: boolean().required(),
    readAt: string().url().required(),
    dateCreated: string().required().test('is-iso8601', 'Value must be in ISO8601 format', isISO8601),
  }).noUnknown().defined("Data must be defined")

  static allRequestProperties: (keyof IMangaUpdate)[] = ['mangaUpdateId', 'crawlId', 'crawledOn', 'chapter', 'chapterName', 'isRead', 'readAt', 'dateCreated']
  private static getPropertiesRequestSchema(validProperties: (keyof IMangaUpdate)[]) {
    return array().of(string().oneOf(validProperties).defined()).defined("Properties must be defined").min(1, "Properties must contain elements").strict(true)
  }

  public constructor(data: IMangaUpdate) {
    this.data = data
  }

  public static fromSQL(data: SQLMangaUpdate) {
    return new this({
      mangaUpdateId: data.manga_update_id,
      crawlId: data.crawl_target_id,
      crawledOn: data.crawled_on,
      chapter: data.chapter,
      chapterName: data.chapter_name,
      isRead: data.is_read,
      readAt: data.read_at,
      dateCreated: data.date_created
    })
  }

  public static async fromRequest(data: any, strict: boolean = true) {
    const result = (await this.validateRequest(data, this.allRequestProperties, strict)) as IMangaUpdate

    return new this({
      mangaUpdateId: result.mangaUpdateId,
      crawlId: result.crawlId,
      crawledOn: result.crawledOn,
      chapter: result.chapter,
      chapterName: result.chapterName,
      isRead: result.isRead,
      readAt: result.readAt,
      dateCreated: result.dateCreated
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(
    data: any,  // Data from the request
    properties: any, // Properties from the request
    strict: boolean = true,
    validProperties: (keyof IMangaUpdate)[] = this.allRequestProperties // Properties you accept from the request
  ): Promise<Partial<IMangaUpdate>> {
    // Validate properties provided by the request
    const validatedProperties = await this.getPropertiesRequestSchema(validProperties).validate(properties, {abortEarly: false})

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.requestSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})
    const coercedData: Partial<IMangaUpdate> = {}

    // coerce data types
    if (validatedData.crawledOn) {
      coercedData.crawledOn = new Date(validatedData.crawledOn)
    }

    if (validatedData.dateCreated) {
      coercedData.dateCreated = new Date(validatedData.dateCreated)
    }

    return {
      ...validatedData as any,
      ...coercedData
    }
  }

  public getObject(): IMangaUpdate {
    return {
      ...this.data
    }
  }

  public serialize() {
    return {
      ...this.data,
      crawledOn: this.data.crawledOn.toISOString(),
      dateCreated: this.data.dateCreated.toISOString()
    }
  }
}

export {
  MangaUpdate,
  IMangaUpdate,
}
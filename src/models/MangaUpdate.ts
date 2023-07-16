import { object, string, boolean, number, array } from 'yup'
import { isISO8601 } from '../utils/isISO8601'
import { SQLMangaUpdate } from '../repositories/MangaUpdateRepository';

interface IMangaUpdate {
  mangaUpdateId: number; // identifier, primary
  crawlId: number; // the identifier of the crawler that produced the result, foreign
  crawledOn: Date; // the date this update was logged
  chapter: number; // number of the chapter
  chapterName: string | null; // name of the chapter
  isRead: boolean; // whether the user read the update, logged onClick
  readAt: string; // a link to read the chapter
}

class MangaUpdate {
  private data: IMangaUpdate;
  static allProperties: (keyof IMangaUpdate)[] = ['mangaUpdateId', 'crawlId', 'crawledOn', 'chapter', 'chapterName', 'isRead', 'readAt']
  private static propertiesSchema = array().of(string().oneOf(this.allProperties).defined()).defined().strict(true)
  private static dataSchema = object({
    mangaUpdateId: number().required(),
    crawlId: number().required(),
    crawledOn: string().required().test('is-iso8601', 'Value must be in ISO8601 format', isISO8601),
    chapter: number().min(0).max(32767).integer().required(),
    chapterName: string().defined().nullable(),
    isRead: boolean().required(),
    readAt: string().url().required()
  }).noUnknown()

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
    })
  }

  public static async fromRequest(data: any) {
    const result = (await this.validateRequest(data, this.allProperties)) as IMangaUpdate

    return new this({
      mangaUpdateId: result.mangaUpdateId,
      crawlId: result.crawlId,
      crawledOn: result.crawledOn,
      chapter: result.chapter,
      chapterName: result.chapterName,
      isRead: result.isRead,
      readAt: result.readAt,
    })
  }

  // Validates the provided data against the properties specified, returning a coerced partial object
  public static async validateRequest(data: any, properties: string[], strict: boolean = true): Promise<Partial<IMangaUpdate>> {
    // Validate properties provided by the request
    const validatedProperties = await this.propertiesSchema.validate(properties)

    // Validate the data against the specified properties, erroring on any unidentified properties
    const validationSchema = this.dataSchema.pick(validatedProperties).strict(strict)
    const validatedData = await validationSchema.validate(data, {abortEarly: false})
    const coercedData: Partial<IMangaUpdate> = {}

    // coerce data types
    if (validatedData.crawledOn) {
      coercedData.crawledOn = new Date(validatedData.crawledOn)
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
      crawledOn: this.data.crawledOn.toISOString()
    }
  }
}

export {
  MangaUpdate,
  IMangaUpdate,
}
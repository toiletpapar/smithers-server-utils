import { ImageTypes } from "../crawlers/CrawlTarget";

interface IImage {
  format: ImageTypes;
  data: Buffer;
}

class Image {
  private data: IImage;

  constructor (data: IImage) {
    this.data = data
  }

  public getObject(): IImage {
    return {
      ...this.data
    }
  }
}

export {
  Image,
}
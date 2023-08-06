enum ImageTypes {
  png = 'png',
  jpeg = 'jpeg'
}

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
  IImage,
  ImageTypes
}
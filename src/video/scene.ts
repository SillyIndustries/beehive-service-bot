import Element from './elements/abstract.js';
import { ElementMap } from './elements/serialization.js';

export default class Scene extends Element {
  public elements: Element[] = [];

  constructor(
    public startFrame: number,
    public endFrame: number
  ) {
    super();
  }

  public async render(frame: number, width: number, height: number) {
    for (const el of this.elements) {
      await el.render(frame, width, height);
    }
  }

  public async update(dt: number, t: number, frame: number, width: number, height: number) {
    this.elements.forEach(el => el.update(dt, t, frame, width, height));
  }

  public serialize(): Buffer {
    // Serialize start and end frames
    const startFrameBuf = Buffer.alloc(4);
    startFrameBuf.writeUInt32BE(this.startFrame, 0);

    const endFrameBuf = Buffer.alloc(4);
    endFrameBuf.writeUInt32BE(this.endFrame, 0);

    // Serialize elements with sizes
    const elementBuffers = this.elements.map(el => {
      const buf = el.serialize();
      const sizeBuf = Buffer.alloc(4);
      sizeBuf.writeUInt32BE(buf.length, 0);
      return Buffer.concat([sizeBuf, buf]);
    });

    return Buffer.concat([startFrameBuf, endFrameBuf, ...elementBuffers]);
  }

  public deserialize(data: Buffer): this {
    this.startFrame = data.readUInt32BE(0);
    this.endFrame = data.readUInt32BE(4);

    this.elements = [];

    let offset = 8;
    while (offset < data.length) {
      const size = data.readUInt32BE(offset);
      offset += 4;

      const elementData = data.subarray(offset, offset + size);
      offset += size;

      const elementType = elementData.readUInt8(0) as keyof typeof ElementMap;
      if (!(elementType in ElementMap)) {
        throw new Error(`Unknown element type: ${elementType}`);
      }

      const ElementClass = ElementMap[elementType] as any;
      const element = ElementClass.deserialize(elementData.subarray(1));
      this.elements.push(element);
    }

    return this;
  }
}

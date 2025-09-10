import sharp from 'sharp';

import Element from './abstract.js';
import { ElementType } from './serialization.js';

export default class ImageElement extends Element {
  constructor(
    public src: string,
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public startFrame: number = 0,
    public endFrame: number = Infinity
  ) {
    super(startFrame, endFrame);
  }

  public async render(frame: number, canvasWidth: number, canvasHeight: number): Promise<Buffer | undefined> {
    if (frame < this.startFrame || frame > this.endFrame) return;

    const escapedSrc = this.src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const svg = `
      <svg width="${canvasWidth}" height="${canvasHeight}">
        <image href="${escapedSrc}" x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" />
      </svg>
    `;

    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  public update() {}

  public serialize(): Buffer {
    const srcBuffer = Buffer.from(this.src, 'utf-8');

    const buffer = Buffer.alloc(
      1 +
      4 + srcBuffer.length +
      4 +
      4 +
      4 +
      4 +
      4 +
      4
    );

    let offset = 0;
    buffer.writeUInt8(ElementType.IMAGE, offset);
    offset += 1;

    buffer.writeUInt32BE(srcBuffer.length, offset);
    offset += 4;
    srcBuffer.copy(buffer, offset);
    offset += srcBuffer.length;

    buffer.writeFloatBE(this.x, offset);
    offset += 4;

    buffer.writeFloatBE(this.y, offset);
    offset += 4;

    buffer.writeFloatBE(this.width, offset);
    offset += 4;

    buffer.writeFloatBE(this.height, offset);
    offset += 4;

    buffer.writeUInt32BE(this.startFrame, offset);
    offset += 4;

    buffer.writeUInt32BE(this.endFrame, offset);

    return Buffer.concat([buffer, ...this.serializeAnimations()]);
  }

  public static deserialize(data: Buffer): ImageElement {
    let offset = 0;

    const srcLength = data.readUInt32BE(offset);
    offset += 4;
    const src = data.toString('utf-8', offset, offset + srcLength);
    offset += srcLength;

    const x = data.readFloatBE(offset);
    offset += 4;

    const y = data.readFloatBE(offset);
    offset += 4;

    const width = data.readFloatBE(offset);
    offset += 4;

    const height = data.readFloatBE(offset);
    offset += 4;

    const startFrame = data.readUInt32BE(offset);
    offset += 4;

    const endFrame = data.readUInt32BE(offset);

    const element = new ImageElement(src, x, y, width, height, startFrame, endFrame);
    return element.deserializeAnimations(data.subarray(offset));
  }
}

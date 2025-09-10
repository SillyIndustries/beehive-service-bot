import sharp from 'sharp';

import Element from './abstract.js';
import { ElementType } from './serialization.js';

export default class TextElement extends Element {
  constructor(
    public text: string,
    public fontSize: number,
    public color: string,
    public x: number,
    public y: number,
    startFrame: number,
    endFrame: number
  ) {
    super(startFrame, endFrame);
  }

  public async render(frame: number, width: number, height: number): Promise<Buffer | undefined> {
    if (frame < this.startFrame || frame > this.endFrame) return;

    const escapedText = this.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const svg = `
      <svg width="${width}" height="${height}">
        <text x="${this.x}" y="${this.y}" font-size="${this.fontSize}" fill="${this.color}">
          ${escapedText}
        </text>
      </svg>
    `;

    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  public update() {}

  public serialize(): Buffer {
    const textBuffer = Buffer.from(this.text, 'utf-8');
    const colorBuffer = Buffer.from(this.color, 'utf-8');

    const buffer = Buffer.alloc(
      1 +
      4 + textBuffer.length +
      4 + colorBuffer.length +
      4 +
      4 +
      4 +
      4 +
      4
    );

    let offset = 0;
    buffer.writeUInt8(ElementType.TEXT, offset);
    offset += 1;

    buffer.writeUInt32BE(textBuffer.length, offset);
    offset += 4;
    textBuffer.copy(buffer, offset);
    offset += textBuffer.length;

    buffer.writeUInt32BE(colorBuffer.length, offset);
    offset += 4;
    colorBuffer.copy(buffer, offset);
    offset += colorBuffer.length;

    buffer.writeUInt32BE(this.fontSize, offset);
    offset += 4;

    buffer.writeFloatBE(this.x, offset);
    offset += 4;

    buffer.writeFloatBE(this.y, offset);
    offset += 4;

    buffer.writeUInt32BE(this.startFrame, offset);
    offset += 4;

    buffer.writeUInt32BE(this.endFrame, offset);

    return Buffer.concat([buffer, ...this.serializeAnimations()]);
  }

  public static deserialize(data: Buffer): TextElement {
    let offset = 0;

    const textLength = data.readUInt32BE(offset);
    offset += 4;
    const text = data.toString('utf-8', offset, offset + textLength);
    offset += textLength;

    const colorLength = data.readUInt32BE(offset);
    offset += 4;
    const color = data.toString('utf-8', offset, offset + colorLength);
    offset += colorLength;

    const fontSize = data.readUInt32BE(offset);
    offset += 4;

    const x = data.readFloatBE(offset);
    offset += 4;

    const y = data.readFloatBE(offset);
    offset += 4;

    const startFrame = data.readUInt32BE(offset);
    offset += 4;

    const endFrame = data.readUInt32BE(offset);

    const element = new TextElement(text, fontSize, color, x, y, startFrame, endFrame);
    return element.deserializeAnimations(data.subarray(offset));
  }
}

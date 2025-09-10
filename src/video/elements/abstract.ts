import Serializable from '../abstract.js';
import Animation from '../animation.js';

export default abstract class Element extends Serializable {
  public animations: Animation[] = [];

  constructor(public startFrame: number = 0, public endFrame: number = Infinity) {
    super();
  }

  abstract render(frame: number, width: number, height: number): void | Buffer | Promise<Buffer | void>;
  abstract update(dt: number, t: number, frame: number, width: number, height: number): void;

  public serializeAnimations() {
    return this.animations.map(anim => {
      const serialized = anim.serialize();
      const sizeBuf = Buffer.alloc(4);
      sizeBuf.writeUInt32BE(serialized.length, 0);
      return Buffer.concat([sizeBuf, serialized]);
    });
  }

  public deserializeAnimations(data: Buffer) {
    this.animations = [];
    let offset = 0;

    while (offset < data.length) {
      const size = data.readUInt32BE(offset);
      offset += 4;

      const animData = data.subarray(offset, offset + size);
      offset += size;

      const animation = Animation.deserialize(animData, this);
      this.animations.push(animation);
    }

    return this;
  }
}
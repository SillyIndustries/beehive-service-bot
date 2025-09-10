import Element from './elements/abstract.js';
import Serializable from './abstract.js';

interface AnimationKeyframe {
  offset: number; // 0 - 1
  easing: Easing;
  properties: Record<string, any>;
}

export enum Easing {
  LINEAR,
  EASE_IN,
  EASE_OUT,
  EASE_IN_OUT,
  BOUNCE,
  ELASTIC
}

export default class Animation extends Serializable {
  constructor(
    private element: Element,
    public frames: AnimationKeyframe[],
    public startFrame: number,
    public endFrame: number
  ) {
    super();
  }

  private doEasing(easing: Easing, t: number): number {
    switch (easing) {
      case Easing.EASE_IN:
        return t * t;
      case Easing.EASE_OUT:
        return t * (2 - t);
      case Easing.EASE_IN_OUT:
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case Easing.BOUNCE:
        if (t < 1 / 2.75)
          return 7.5625 * t * t
        else if (t < 2 / 2.75)
          return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
        else if (t < 2.5 / 2.75)
          return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
        else
          return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
      case Easing.ELASTIC:
        return t === 0
          ? 0
          : t === 1
            ? 1
            : -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.075) * (2 * Math.PI) / 0.3);
      default:
        return t;
    }
  }

  public apply(frame: number) {
    frame = Math.max(this.startFrame, Math.min(frame, this.endFrame));

    const progress = (frame - this.startFrame) / (this.endFrame - this.startFrame);
    let prevKeyframe: AnimationKeyframe | null = null;
    let nextKeyframe: AnimationKeyframe | null = null;

    for (let i = 0; i < this.frames.length; i++) {
      if (this.frames[i].offset <= progress) {
        prevKeyframe = this.frames[i];
      }

      if (this.frames[i].offset > progress) {
        nextKeyframe = this.frames[i];
        break;
      }
    }

    if (!prevKeyframe || !nextKeyframe) return;

    const localProgress = (progress - prevKeyframe.offset) / (nextKeyframe.offset - prevKeyframe.offset);

    for (const prop in prevKeyframe.properties) {
      if (prop in nextKeyframe.properties) {
        const startValue = prevKeyframe.properties[prop];
        const endValue = nextKeyframe.properties[prop];
        const value = startValue + (endValue - startValue) * this.doEasing(nextKeyframe.easing, localProgress);
        (this.element as any)[prop] = value;
      }
    }
  }

  public serialize(): Buffer {
    const keyframeBuffers = this.frames.map(frame => {
      const props = Object.entries(frame.properties);
      const propsBuffer = Buffer.concat(props.map(([key, value]) => {
        const keyBuf = Buffer.from(key, 'utf-8');
        const valueBuf = Buffer.from(JSON.stringify(value), 'utf-8');

        const keyLenBuf = Buffer.alloc(4);
        keyLenBuf.writeUInt32BE(keyBuf.length, 0);

        const valueLenBuf = Buffer.alloc(4);
        valueLenBuf.writeUInt32BE(valueBuf.length, 0);

        return Buffer.concat([keyLenBuf, keyBuf, valueLenBuf, valueBuf]);
      }));

      const offsetBuf = Buffer.alloc(4);
      offsetBuf.writeFloatBE(frame.offset, 0);

      const easingBuf = Buffer.alloc(1);
      easingBuf.writeUInt8(frame.easing, 0);

      const propCountBuf = Buffer.alloc(4);
      propCountBuf.writeUInt32BE(props.length, 0);

      return Buffer.concat([offsetBuf, easingBuf, propCountBuf, propsBuffer]);
    });

    const startBuf = Buffer.alloc(4);
    startBuf.writeUInt32BE(this.startFrame, 0);

    const endBuf = Buffer.alloc(4);
    endBuf.writeUInt32BE(this.endFrame, 0);

    const frameCountBuf = Buffer.alloc(4);
    frameCountBuf.writeUInt32BE(this.frames.length, 0);

    return Buffer.concat([startBuf, endBuf, frameCountBuf, ...keyframeBuffers]);
  }

  static deserialize(data: Buffer, element: Element): Animation {
    let offset = 0;

    const startFrame = data.readUInt32BE(offset); offset += 4;
    const endFrame = data.readUInt32BE(offset); offset += 4;

    const keyframeCount = data.readUInt32BE(offset); offset += 4;
    const frames: AnimationKeyframe[] = [];

    for (let i = 0; i < keyframeCount; i++) {
      const frameOffset = data.readFloatBE(offset); offset += 4;
      const easing = data.readUInt8(offset) as Easing; offset += 1;

      const propCount = data.readUInt32BE(offset); offset += 4;
      const properties: Record<string, any> = {};

      for (let j = 0; j < propCount; j++) {
        const keyLen = data.readUInt32BE(offset); offset += 4;
        const key = data.toString('utf-8', offset, offset + keyLen); offset += keyLen;

        const valueLen = data.readUInt32BE(offset); offset += 4;
        const valueStr = data.toString('utf-8', offset, offset + valueLen); offset += valueLen;

        properties[key] = JSON.parse(valueStr);
      }

      frames.push({ offset: frameOffset, easing, properties });
    }

    return new Animation(element, frames, startFrame, endFrame);
  }
}
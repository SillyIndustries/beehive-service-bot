export default abstract class Serializable {
  abstract serialize(): Buffer;
  static deserialize(data: Buffer, ...any: any[]): Serializable {
    throw new Error('Deserialize method not implemented');
  }
}
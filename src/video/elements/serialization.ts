import Element from './abstract.js';
import ImageElement from './image.js';
import TextElement from './text.js';

export const enum ElementType {
  TEXT,
  IMAGE
}

export function getType(elem: Element): number {
  const elementClass = (elem.constructor as any);
  const elementType = Object.entries(ElementMap).find(([_, cls]) => cls === elementClass)?.[0];

  if (!elementType) throw new Error('Element type not found in ElementMap');

  return +elementType;
}

export const ElementMap: Record<number, new (...any: any[]) => Element> = {}
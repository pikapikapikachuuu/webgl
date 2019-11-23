import { BufferInfo } from './pikagl'
import PikaGL from './pikagl'

abstract class Primitive {
  protected pgl: PikaGL

  constructor (pgl: PikaGL) {
    this.pgl = pgl
  }

  private augmentTypedArray (typedArray: any, numComponents: number) {
    const isArrayBuffer = (a: any) => a && a.buffer && a.buffer instanceof ArrayBuffer
    let cursor = 0
    typedArray.push = (...args: any[]) => {
      for (let i = 0; i < args.length; i++) {
        const value = args[i]
        if (value instanceof Array || isArrayBuffer(value)) {
          for (let j = 0; j < value.length; j++) {
            typedArray[cursor++] = value[j]
          }
        } else {
          typedArray[cursor++] = value
        }
      }
    }
    typedArray.reset = (index: number) => {
      cursor = index || 0
    }
    typedArray.numComponents = numComponents
    Object.defineProperty(typedArray, 'numElements', {
      get: () => {
        return typedArray.length / typedArray.numComponents | 0
      }
    })
    return typedArray
  }

  protected createAugmentedTypedArray (numComponents: number, numElements: number, type?: any) {
    const Type = type || Float32Array
    return this.augmentTypedArray(new Type(numComponents * numElements), numComponents)
  }

  protected abstract createVertices (...args: any) : Record<string, any>

  public abstract createBufferInfo (...args: any) : BufferInfo
}

export class Cube extends Primitive {
  protected _size: number
  protected _bufferInfo: BufferInfo

  constructor (pgl: PikaGL, size: number) {
    super(pgl)
    this._size = size
    const arrays = this.createVertices(size)
    this._bufferInfo = this.createBufferInfo(arrays)
  }

  get Size (): number {
    return this._size
  }

  get bufferInfo (): BufferInfo {
    return this._bufferInfo
  }

  createVertices (size: number) {
    size = size || 1
    const k = size / 2

    const cornerVertices = [
      [-k, -k, -k],
      [+k, -k, -k],
      [-k, +k, -k],
      [+k, +k, -k],
      [-k, -k, +k],
      [+k, -k, +k],
      [-k, +k, +k],
      [+k, +k, +k]
    ]

    const faceNormals = [
      [+1, +0, +0],
      [-1, +0, +0],
      [+0, +1, +0],
      [+0, -1, +0],
      [+0, +0, +1],
      [+0, +0, -1]
    ]

    const uvCoords = [
      [1, 0],
      [0, 0],
      [0, 1],
      [1, 1]
    ]

    const numVertices = 6 * 4
    const positions = this.createAugmentedTypedArray(3, numVertices)
    const normals = this.createAugmentedTypedArray(3, numVertices)
    const texcoords = this.createAugmentedTypedArray(2, numVertices)
    const indices = this.createAugmentedTypedArray(3, 6 * 2, Uint16Array)

    const CUBE_FACE_INDICES = [
      [3, 7, 5, 1], // right
      [6, 2, 0, 4], // left
      [6, 7, 3, 2], // ??
      [0, 1, 5, 4], // ??
      [7, 6, 4, 5], // front
      [2, 3, 1, 0] // back
    ]

    for (let f = 0; f < 6; ++f) {
      const faceIndices = CUBE_FACE_INDICES[f]
      for (let v = 0; v < 4; ++v) {
        const position = cornerVertices[faceIndices[v]]
        const normal = faceNormals[f]
        const uv = uvCoords[v]
        positions.push(position)
        normals.push(normal)
        texcoords.push(uv)
      }

      const offset = 4 * f
      indices.push(offset + 0, offset + 1, offset + 2)
      indices.push(offset + 0, offset + 2, offset + 3)
    }

    return {
      position: positions,
      normal: normals,
      texcoord: texcoords,
      indices: indices
    }
  }

  createBufferInfo (arrays: Record<string, any>) {
    return this.pgl.createBufferInfo(arrays)
  }
}

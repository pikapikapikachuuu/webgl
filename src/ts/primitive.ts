import { BufferInfo } from './pikagl'
import PikaGL from './pikagl'

import * as m4 from '../3rd/m4'

function applyFuncToV3Array (array, matrix, fn) {
  const len = array.length
  const tmp = new Float32Array(3)
  for (let i = 0; i < len; i += 3) {
    fn(matrix, [array[i], array[i + 1], array[i + 2]], tmp)
    array[i] = tmp[0]
    array[i + 1] = tmp[1]
    array[i + 2] = tmp[2]
  }
}

function transformNormal (mi, v, dst) {
  dst = dst || new Float32Array(3)
  const v0 = v[0]
  const v1 = v[1]
  const v2 = v[2]

  dst[0] = v0 * mi[0 * 4 + 0] + v1 * mi[0 * 4 + 1] + v2 * mi[0 * 4 + 2]
  dst[1] = v0 * mi[1 * 4 + 0] + v1 * mi[1 * 4 + 1] + v2 * mi[1 * 4 + 2]
  dst[2] = v0 * mi[2 * 4 + 0] + v1 * mi[2 * 4 + 1] + v2 * mi[2 * 4 + 2]

  return dst
}

function reorientVertices (arrays, matrix) {
  Object.keys(arrays).forEach((name) => {
    const array = arrays[name]
    if (name.indexOf('pos') >= 0) {
      applyFuncToV3Array(array, matrix, m4.transformPoint)
    } else if (name.indexOf('tan') >= 0 || name.indexOf('binorm') >= 0) {
      applyFuncToV3Array(array, matrix, m4.transformDirection)
    } else if (name.indexOf('norm') >= 0) {
      applyFuncToV3Array(array, m4.inverse(matrix), transformNormal)
    }
  })
  return arrays
}

abstract class Primitive {
  protected pgl: PikaGL
  protected _bufferInfo: BufferInfo

  constructor (pgl: PikaGL) {
    this.pgl = pgl
  }

  get bufferInfo (): BufferInfo {
    return this._bufferInfo
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

  public createBufferInfo (arrays: Record<string, any>) {
    return this.pgl.createBufferInfo(arrays)
  }
}

export class Cube extends Primitive {
  private _size: number

  constructor (pgl: PikaGL, size: number) {
    super(pgl)
    this._size = size
    const arrays = this.createVertices(size)
    this._bufferInfo = this.createBufferInfo(arrays)
  }

  get size () {
    return this._size
  }

  createVertices (size: number) {
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
}

interface PlaneSize {
  width: number,
  depth: number,
  subdivisionsWidth: number,
  subdivisionsDepth: number,
  matrix: m4.Matrix4
}

export class Plane extends Primitive {
  private _planeSize: PlaneSize

  constructor (pgl: PikaGL, planeSize: PlaneSize) {
    super(pgl)
    this._planeSize = planeSize
    const arrays = this.createVertices(planeSize)
    this._bufferInfo = this.createBufferInfo(arrays)
  }

  get planeSize () {
    return this._planeSize
  }

  createVertices (planeSize: PlaneSize) {
    const { width, depth, subdivisionsWidth, subdivisionsDepth, matrix } = planeSize
    const numVertices = (subdivisionsWidth + 1) * (subdivisionsDepth + 1)
    const positions = this.createAugmentedTypedArray(3, numVertices)
    const normals = this.createAugmentedTypedArray(3, numVertices)
    const texcoords = this.createAugmentedTypedArray(2, numVertices)

    for (let z = 0; z <= subdivisionsDepth; z++) {
      for (let x = 0; x <= subdivisionsWidth; x++) {
        const u = x / subdivisionsWidth
        const v = z / subdivisionsDepth
        positions.push(
          width * u - width * 0.5,
          0,
          depth * v - depth * 0.5)
        normals.push(0, 1, 0)
        texcoords.push(u, v)
      }
    }

    const numVertsAcross = subdivisionsWidth + 1
    const indices = this.createAugmentedTypedArray(
      3, subdivisionsWidth * subdivisionsDepth * 2, Uint16Array)

    for (let z = 0; z < subdivisionsDepth; z++) {
      for (let x = 0; x < subdivisionsWidth; x++) {
      // Make triangle 1 of quad.
        indices.push(
          (z + 0) * numVertsAcross + x,
          (z + 1) * numVertsAcross + x,
          (z + 0) * numVertsAcross + x + 1)

        // Make triangle 2 of quad.
        indices.push(
          (z + 1) * numVertsAcross + x,
          (z + 1) * numVertsAcross + x + 1,
          (z + 0) * numVertsAcross + x + 1)
      }
    }

    const arrays = reorientVertices({
      position: positions,
      normal: normals,
      texcoord: texcoords,
      indices: indices
    }, matrix)
    return arrays
  }
}

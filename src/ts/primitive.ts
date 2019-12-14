/* eslint-disable no-useless-constructor */
import { BufferInfo } from './pikagl'
import PikaGL from './pikagl'

import * as m4 from '../3rd/m4'

interface PrimitiveSize {}

interface verticeArrays {
  position: ArrayBuffer
  normal: ArrayBuffer,
  texcoord: ArrayBuffer,
  indices: ArrayBuffer
}

abstract class Primitive {
  protected pgl: PikaGL
  protected _bufferInfo: BufferInfo
  protected _size: PrimitiveSize

  constructor (pgl: PikaGL, size: PrimitiveSize) {
    this.pgl = pgl
    this._size = size
    const arrays = this.createVertices(size)
    this._bufferInfo = this.createBufferInfo(arrays)
  }

  get size (): PrimitiveSize {
    return this._size
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

  public abstract createVertices (size: PrimitiveSize) : verticeArrays

  public createBufferInfo (arrays: verticeArrays) {
    return this.pgl.createBufferInfo(arrays)
  }
}

interface CubeSize extends PrimitiveSize {
  side: number
}

export class Cube extends Primitive {
  constructor (pgl: PikaGL, size: CubeSize) {
    super(pgl, size)
  }

  createVertices (size: CubeSize) {
    const { side } = size
    const s = side / 2

    const cornerVertices = [
      [-s, -s, -s],
      [+s, -s, -s],
      [-s, +s, -s],
      [+s, +s, -s],
      [-s, -s, +s],
      [+s, -s, +s],
      [-s, +s, +s],
      [+s, +s, +s]
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
      [3, 7, 5, 1],
      [6, 2, 0, 4],
      [6, 7, 3, 2],
      [0, 1, 5, 4],
      [7, 6, 4, 5],
      [2, 3, 1, 0]
    ]

    for (let f = 0; f < 6; f++) {
      const faceIndices = CUBE_FACE_INDICES[f]
      for (let v = 0; v < 4; v++) {
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

interface SphereSize extends PrimitiveSize {
  radius: number,
  subdivisionsAxis: number,
  subdivisionsHeight: number
}

export class Sphere extends Primitive {
  private _sphereSize: SphereSize

  constructor (pgl: PikaGL, size: SphereSize) {
    super(pgl, size)
  }

  get sphereSize () {
    return this._sphereSize
  }

  createVertices (size: SphereSize) {
    const { radius, subdivisionsAxis, subdivisionsHeight } = size

    const latRange = Math.PI
    const longRange = (Math.PI * 2)

    const numVertices = (subdivisionsAxis + 1) * (subdivisionsHeight + 1)
    const positions = this.createAugmentedTypedArray(3, numVertices)
    const normals = this.createAugmentedTypedArray(3, numVertices)
    const texCoords = this.createAugmentedTypedArray(2, numVertices)

    for (let y = 0; y <= subdivisionsHeight; y++) {
      for (let x = 0; x <= subdivisionsAxis; x++) {
        const u = x / subdivisionsAxis
        const v = y / subdivisionsHeight
        const theta = longRange * u
        const phi = latRange * v
        const sinTheta = Math.sin(theta)
        const cosTheta = Math.cos(theta)
        const sinPhi = Math.sin(phi)
        const cosPhi = Math.cos(phi)
        const ux = cosTheta * sinPhi
        const uy = cosPhi
        const uz = sinTheta * sinPhi
        positions.push(radius * ux, radius * uy, radius * uz)
        normals.push(ux, uy, uz)
        texCoords.push(1 - u, v)
      }
    }

    const numVertsAround = subdivisionsAxis + 1
    const indices = this.createAugmentedTypedArray(3, subdivisionsAxis * subdivisionsHeight * 2, Uint16Array)
    for (let x = 0; x < subdivisionsAxis; x++) {
      for (let y = 0; y < subdivisionsHeight; y++) {
        indices.push(
          (y + 0) * numVertsAround + x,
          (y + 0) * numVertsAround + x + 1,
          (y + 1) * numVertsAround + x)

        indices.push(
          (y + 1) * numVertsAround + x,
          (y + 0) * numVertsAround + x + 1,
          (y + 1) * numVertsAround + x + 1)
      }
    }

    return {
      position: positions,
      normal: normals,
      texcoord: texCoords,
      indices: indices
    }
  }
}

interface TruncatedConeSize {
  bottomRadius: number,
  topRadius: number,
  height: number,
  radialSubdivisions: number,
  verticalSubdivisions: number,
}

export class TruncatedCone extends Primitive {
  constructor (pgl: PikaGL, size: TruncatedConeSize) {
    super(pgl, size)
  }

  createVertices (size: TruncatedConeSize) {
    const { bottomRadius, topRadius, height, radialSubdivisions, verticalSubdivisions } = size

    const extra = 2 + 2

    const numVertices = (radialSubdivisions + 1) * (verticalSubdivisions + 1 + extra)
    const positions = this.createAugmentedTypedArray(3, numVertices)
    const normals = this.createAugmentedTypedArray(3, numVertices)
    const texCoords = this.createAugmentedTypedArray(2, numVertices)
    const indices = this.createAugmentedTypedArray(3, radialSubdivisions * (verticalSubdivisions + extra) * 2, Uint16Array)

    const vertsAroundEdge = radialSubdivisions + 1

    const slant = Math.atan2(bottomRadius - topRadius, height)
    const cosSlant = Math.cos(slant)
    const sinSlant = Math.sin(slant)

    const start = -2
    const end = verticalSubdivisions + 2

    for (let y = start; y <= end; y++) {
      let v = y / verticalSubdivisions
      let u = height * v
      let ringRadius
      if (y < 0) {
        u = 0
        v = 1
        ringRadius = bottomRadius
      } else if (y > verticalSubdivisions) {
        u = height
        v = 1
        ringRadius = topRadius
      } else {
        ringRadius = bottomRadius + (topRadius - bottomRadius) * (y / verticalSubdivisions)
      }
      if (y === -2 || y === verticalSubdivisions + 2) {
        ringRadius = 0
        v = 0
      }
      u -= height / 2
      for (let i = 0; i < vertsAroundEdge; i++) {
        const sin = Math.sin(i * Math.PI * 2 / radialSubdivisions)
        const cos = Math.cos(i * Math.PI * 2 / radialSubdivisions)
        positions.push(sin * ringRadius, u, cos * ringRadius)
        normals.push(
          (y < 0 || y > verticalSubdivisions) ? 0 : (sin * cosSlant),
          (y < 0) ? -1 : (y > verticalSubdivisions ? 1 : sinSlant),
          (y < 0 || y > verticalSubdivisions) ? 0 : (cos * cosSlant))
        texCoords.push((i / radialSubdivisions), 1 - v)
      }
    }

    for (let y = 0; y < verticalSubdivisions + extra; ++y) {
      for (let i = 0; i < radialSubdivisions; i++) {
        indices.push(vertsAroundEdge * (y + 0) + 0 + i,
          vertsAroundEdge * (y + 0) + 1 + i,
          vertsAroundEdge * (y + 1) + 1 + i)
        indices.push(vertsAroundEdge * (y + 0) + 0 + i,
          vertsAroundEdge * (y + 1) + 1 + i,
          vertsAroundEdge * (y + 1) + 0 + i)
      }
    }

    return {
      position: positions,
      normal: normals,
      texcoord: texCoords,
      indices: indices
    }
  }
}

interface CylinderSize extends PrimitiveSize {
  radius: number,
  height: number,
  radialSubdivisions: number,
  verticalSubdivisions: number,
}

export class Cylinder extends TruncatedCone {
  constructor (pgl: PikaGL, size: CylinderSize) {
    const truncatedSize: TruncatedConeSize = {
      bottomRadius: size.radius,
      topRadius: size.radius,
      height: size.height,
      radialSubdivisions: size.radialSubdivisions,
      verticalSubdivisions: size.verticalSubdivisions
    }
    super(pgl, truncatedSize)
  }
}

interface RegularPrismSize extends PrimitiveSize {
  numSide: number,
  width: number,
  height: number,
  verticalSubdivisions: number
}

export class RegularPrism extends Cylinder {
  constructor (pgl: PikaGL, size: RegularPrismSize) {
    const cylinderSize: CylinderSize = {
      radius: size.width,
      height: size.height,
      radialSubdivisions: size.numSide,
      verticalSubdivisions: size.verticalSubdivisions
    }
    super(pgl, cylinderSize)
  }
}

interface PlaneSize extends PrimitiveSize {
  width: number,
  depth: number,
  subdivisionsWidth: number,
  subdivisionsDepth: number,
  matrix: m4.Matrix4
}

export class Plane extends Primitive {
  constructor (pgl: PikaGL, size: PlaneSize) {
    super(pgl, size)
  }

  private reorientVertices (arrays: verticeArrays, matrix: m4.Matrix4) {
    const applyFuncToV3Array = (array, matrix, fn) => {
      const len = array.length
      const tmp = new Float32Array(3)
      for (let i = 0; i < len; i += 3) {
        fn(matrix, [array[i], array[i + 1], array[i + 2]], tmp)
        array[i] = tmp[0]
        array[i + 1] = tmp[1]
        array[i + 2] = tmp[2]
      }
    }

    const transformNormal = (mi, v, dst) => {
      dst = dst || new Float32Array(3)
      const v0 = v[0]
      const v1 = v[1]
      const v2 = v[2]

      dst[0] = v0 * mi[0 * 4 + 0] + v1 * mi[0 * 4 + 1] + v2 * mi[0 * 4 + 2]
      dst[1] = v0 * mi[1 * 4 + 0] + v1 * mi[1 * 4 + 1] + v2 * mi[1 * 4 + 2]
      dst[2] = v0 * mi[2 * 4 + 0] + v1 * mi[2 * 4 + 1] + v2 * mi[2 * 4 + 2]

      return dst
    }

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

  createVertices (size: PlaneSize) {
    const { width, depth, subdivisionsWidth, subdivisionsDepth, matrix } = size

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

    return this.reorientVertices({
      position: positions,
      normal: normals,
      texcoord: texcoords,
      indices: indices
    }, matrix)
  }
}

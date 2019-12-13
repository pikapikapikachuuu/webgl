// Smarter WebGL - PkaGL! ☆★☆★☆★☆

interface ProgramOptions {
  attribLocations?: any,
  transformFeedbackVaryings?: string[],
  transformFeedbackMode?: number
}

interface ProgramInfo {
  program: WebGLProgram,
  uniformSetters: any,
  attribSetters: any
}

export interface BufferInfo {
  numElements: number,
  elementType?: number,
  indices?: WebGLBuffer,
  attribs?: any
}

interface VertexArrayInfo {
  numElements: number,
  elementType?: number,
  vertexArrayObject?:	WebGLVertexArrayObject
}

interface DrawObject {
  active?: boolean,
  type?: number,
  programInfo?: ProgramInfo,
  bufferInfo?: BufferInfo,
  vertexArrayInfo?: VertexArrayInfo,
  uniforms?: any,
  offset?: number,
  count?: number,
  instanceCount?: number
}

interface Defaults {
  attribPrefix?: string,
  textureColor?: ArrayBuffer,
  crossOrigin?: string,
  addExtensionsToContext?: boolean
}

function copyExistingProperties (src: Record<string, any>, dst: Record<string, any>) {
  Object.keys(dst).forEach((key) => {
    if (dst.hasOwnProperty(key) && src.hasOwnProperty(key) && key !== 'textureColor') {
      dst[key] = src[key]
    }
  })
}

function createMapping (src: Record<string, any>, prefix: string) {
  const mapping = {}
  const allButIndices = (name) => name !== 'indices'
  Object.keys(src).filter(allButIndices).forEach((key) => {
    mapping[prefix + key] = key
  })
  return mapping
}

function getNormalizationForTypedArray (typedArray) {
  if (typedArray instanceof Int8Array) return true
  if (typedArray instanceof Uint8Array) return true
  return false
}

function guessNumComponentsFromName (name: string) {
  let numComponents
  if (name.indexOf('coord') >= 0) {
    numComponents = 2
  } else if (name.indexOf('color') >= 0) {
    numComponents = 4
  } else {
    numComponents = 3
  }
  return numComponents
}

function augmentTypedArray (typedArray: any, numComponents: number) {
  let cursor = 0
  typedArray.push = function () {
    for (let i = 0; i < arguments.length; i++) {
      const value = arguments[i]
      if (value instanceof Array || (value.buffer && value.buffer instanceof ArrayBuffer)) {
        for (let jj = 0; jj < value.length; ++jj) {
          typedArray[cursor++] = value[jj]
        }
      } else {
        typedArray[cursor++] = value
      }
    }
  }
  typedArray.reset = function (index = 0) {
    cursor = index
  }
  typedArray.numComponents = numComponents
  Object.defineProperty(typedArray, 'numElements', {
    get: function () {
      return this.length / this.numComponents | 0
    }
  })
  return typedArray
}

function createAugmentedTypedArray (numComponents: number, numElements: number, Type = Float32Array) {
  return augmentTypedArray(new Type(numComponents * numElements), numComponents)
}

function isArrayBuffer (a: any) {
  return a.buffer && a.buffer instanceof ArrayBuffer
}

function makeTypedArray (array: any, name: string) {
  if (isArrayBuffer(array)) {
    return array
  }

  if (array.data && isArrayBuffer(array.data)) {
    return array.data
  }

  if (Array.isArray(array)) {
    array = {
      data: array
    }
  }

  if (!array.numComponents) {
    array.numComponents = guessNumComponentsFromName(name)
  }

  let type = array.type
  if (!type) {
    if (name === 'indices') {
      type = Uint16Array
    }
  }
  const typedArray = createAugmentedTypedArray(array.numComponents, array.data.length / array.numComponents | 0, type)
  typedArray.push(array.data)
  return typedArray
}

function getNumElementsFromNonIndexedArrays (arrays: Record<string, any>) {
  const key = Object.keys(arrays)[0]
  const array = arrays[key]
  if (isArrayBuffer(array)) {
    return array.numElements
  } else {
    return array.data.length / array.numComponents
  }
}

export default class PikaGL {
  private gl: WebGL2RenderingContext
  private defaults: Defaults

  constructor (gl: WebGL2RenderingContext) {
    this.gl = gl
    this.defaults = {
      addExtensionsToContext: true,
      attribPrefix: '',
      textureColor: new Uint8Array([128, 192, 255, 255]),
      crossOrigin: undefined
    }
  }

  public setDefaults (newDefaults: Defaults) {
    // TODO
    copyExistingProperties(newDefaults, this.defaults)
    if (newDefaults.textureColor) {
      const color = newDefaults.textureColor
      this.defaults.textureColor = new Uint8Array([color[0] * 255, color[1] * 255, color[2] * 255, color[3] * 255])
    }
  }

  public loadShader (shaderSource: string, shaderType: number): WebGLShader {
    const shader = this.gl.createShader(shaderType)

    const spaceReg = /^[ \t]*\n/
    if (spaceReg.test(shaderSource)) {
      shaderSource = shaderSource.replace(spaceReg, '')
    }

    this.gl.shaderSource(shader, shaderSource)
    this.gl.compileShader(shader)
    const compiled = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)
    if (!compiled) {
      this.gl.deleteShader(shader)
      return null
    }

    return shader
  }

  public createProgram (shaders: WebGLShader[], options?: ProgramOptions) {
    const program = this.gl.createProgram()

    shaders.forEach(shader => this.gl.attachShader(program, shader))

    if (options) {
      if (options.attribLocations) {
        Object.keys(options.attribLocations).forEach(function (attrib) {
          this.gl.bindAttribLocation(program, options.attribLocations[attrib], attrib)
        })
      }
      const varyings = options.transformFeedbackVaryings
      if (varyings) {
        this.gl.transformFeedbackVaryings(program, varyings, options.transformFeedbackMode || this.gl.SEPARATE_ATTRIBS)
      }
    }

    this.gl.linkProgram(program)
    const linked = this.gl.getProgramParameter(program, this.gl.LINK_STATUS)
    if (!linked) {
      this.gl.deleteProgram(program)
      shaders.forEach(shader => this.gl.deleteShader(shader))
      return null
    }

    return program
  }

  public createUniformSetters (program: WebGLProgram) {
    let textureUnit = 0
    const createUniformSetter = (program: WebGLProgram, uniformInfo) => {
      const location = this.gl.getUniformLocation(program, uniformInfo.name)
      const type = uniformInfo.type
      const isArray = (uniformInfo.size > 1 && uniformInfo.name.substr(-3) === '[0]')
      if (type === this.gl.FLOAT && isArray) {
        return (v) => {
          this.gl.uniform1fv(location, v)
        }
      }
      if (type === this.gl.FLOAT) {
        return (v) => {
          this.gl.uniform1f(location, v)
        }
      }
      if (type === this.gl.FLOAT_VEC2) {
        return (v) => {
          this.gl.uniform2fv(location, v)
        }
      }
      if (type === this.gl.FLOAT_VEC3) {
        return (v) => {
          this.gl.uniform3fv(location, v)
        }
      }
      if (type === this.gl.FLOAT_VEC4) {
        return (v) => {
          this.gl.uniform4fv(location, v)
        }
      }
      if (type === this.gl.INT && isArray) {
        return (v) => {
          this.gl.uniform1iv(location, v)
        }
      }
      if (type === this.gl.INT) {
        return (v) => {
          this.gl.uniform1i(location, v)
        }
      }
      if (type === this.gl.INT_VEC2) {
        return (v) => {
          this.gl.uniform2iv(location, v)
        }
      }
      if (type === this.gl.INT_VEC3) {
        return (v) => {
          this.gl.uniform3iv(location, v)
        }
      }
      if (type === this.gl.INT_VEC4) {
        return (v) => {
          this.gl.uniform4iv(location, v)
        }
      }
      if (type === this.gl.BOOL) {
        return (v) => {
          this.gl.uniform1iv(location, v)
        }
      }
      if (type === this.gl.BOOL_VEC2) {
        return (v) => {
          this.gl.uniform2iv(location, v)
        }
      }
      if (type === this.gl.BOOL_VEC3) {
        return (v) => {
          this.gl.uniform3iv(location, v)
        }
      }
      if (type === this.gl.BOOL_VEC4) {
        return (v) => {
          this.gl.uniform4iv(location, v)
        }
      }
      if (type === this.gl.FLOAT_MAT2) {
        return (v) => {
          this.gl.uniformMatrix2fv(location, false, v)
        }
      }
      if (type === this.gl.FLOAT_MAT3) {
        return (v) => {
          this.gl.uniformMatrix3fv(location, false, v)
        }
      }
      if (type === this.gl.FLOAT_MAT4) {
        return (v) => {
          this.gl.uniformMatrix4fv(location, false, v)
        }
      }

      const getBindPointForSamplerType = (type) => {
        if (type === this.gl.SAMPLER_2D) return this.gl.TEXTURE_2D
        if (type === this.gl.SAMPLER_CUBE) return this.gl.TEXTURE_CUBE_MAP
        return undefined
      }
      if ((type === this.gl.SAMPLER_2D || type === this.gl.SAMPLER_CUBE) && isArray) {
        const units = []
        for (let i = 0; i < uniformInfo.size; i++) {
          units.push(textureUnit++)
        }
        return (textures) => {
          this.gl.uniform1iv(location, units)
          textures.forEach((texture, index) => {
            this.gl.activeTexture(this.gl.TEXTURE0 + units[index])
            this.gl.bindTexture(getBindPointForSamplerType(type), texture)
          })
        }
      }
      if (type === this.gl.SAMPLER_2D || type === this.gl.SAMPLER_CUBE) {
        return (texture) => {
          // textureUnit++
          // FIXME
          this.gl.uniform1i(location, textureUnit)
          this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit)
          this.gl.bindTexture(getBindPointForSamplerType(type), texture)
        }
      }
    }

    const uniformSetters = {}
    const numUniforms = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS)

    for (let i = 0; i < numUniforms; i++) {
      const uniformInfo = this.gl.getActiveUniform(program, i)
      if (!uniformInfo) {
        break
      }
      let name = uniformInfo.name
      if (name.substr(-3) === '[0]') {
        name = name.substr(0, name.length - 3)
      }
      const setter = createUniformSetter(program, uniformInfo)
      uniformSetters[name] = setter
    }
    return uniformSetters
  }

  public createAttributeSetters (program: WebGLProgram) {
    const attribSetters = {}

    const createAttribSetter = (index) => {
      return (b) => {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, b.buffer)
        this.gl.enableVertexAttribArray(index)
        this.gl.vertexAttribPointer(
          index, b.numComponents || b.size, b.type || this.gl.FLOAT, b.normalize || false, b.stride || 0, b.offset || 0)
      }
    }

    const numAttribs = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES)
    for (let i = 0; i < numAttribs; i++) {
      const attribInfo = this.gl.getActiveAttrib(program, i)
      if (!attribInfo) {
        break
      }
      const index = this.gl.getAttribLocation(program, attribInfo.name)
      attribSetters[attribInfo.name] = createAttribSetter(index)
    }

    return attribSetters
  }

  public createProgramInfo (program: WebGLProgram): ProgramInfo {
    return {
      program: program,
      uniformSetters: this.createUniformSetters(program),
      attribSetters: this.createAttributeSetters(program)
    }
  }

  private createBufferFromTypedArray (array: any, type = this.gl.ARRAY_BUFFER, drawType = this.gl.STATIC_DRAW) : WebGLBuffer {
    const buffer = this.gl.createBuffer()
    this.gl.bindBuffer(type, buffer)
    this.gl.bufferData(type, array, drawType)
    return buffer
  }

  private getGLTypeForTypedArray (typedArray: ArrayBuffer) {
    if (typedArray instanceof Int8Array) return this.gl.BYTE
    if (typedArray instanceof Uint8Array) return this.gl.UNSIGNED_BYTE
    if (typedArray instanceof Int16Array) return this.gl.SHORT
    if (typedArray instanceof Uint16Array) return this.gl.UNSIGNED_SHORT
    if (typedArray instanceof Int32Array) return this.gl.INT
    if (typedArray instanceof Uint32Array) return this.gl.UNSIGNED_INT
    if (typedArray instanceof Float32Array) return this.gl.FLOAT
  }

  public createAttributes (arrays: Record<string, any>, attribPrefix = this.defaults.attribPrefix) {
    const mapping = createMapping(arrays, attribPrefix)
    const attributes = {}
    Object.keys(mapping).forEach((attribName) => {
      const bufferName = mapping[attribName]
      const origArray = arrays[bufferName]
      const array = makeTypedArray(origArray, bufferName)
      attributes[attribName] = {
        buffer: this.createBufferFromTypedArray(array),
        numComponents: origArray.numComponents || array.numComponents || guessNumComponentsFromName(bufferName),
        type: this.getGLTypeForTypedArray(array),
        normalize: getNormalizationForTypedArray(array)
      }
    })
    return attributes
  }

  public createBufferInfo (arrays: Record<string, any>): BufferInfo {
    const bufferInfo = <BufferInfo>{
      attribs: this.createAttributes(arrays)
    }
    let indices = arrays.indices
    if (indices) {
      indices = makeTypedArray(indices, 'indices')
      bufferInfo.indices = this.createBufferFromTypedArray(indices, this.gl.ELEMENT_ARRAY_BUFFER)
      bufferInfo.numElements = indices.length
    } else {
      bufferInfo.numElements = getNumElementsFromNonIndexedArrays(arrays)
    }

    return bufferInfo
  }

  private setAttributes (setters: Record<string, Function>, buffers: BufferInfo | VertexArrayInfo) {
    for (const name in buffers) {
      const setter = setters[name]
      if (setter) {
        setter(buffers[name])
      }
    }
  }

  public setBuffersAndAttributes (programInfo: ProgramInfo, buffers: BufferInfo | VertexArrayInfo) {
    if ((<VertexArrayInfo>buffers).vertexArrayObject) {
      this.gl.bindVertexArray((<VertexArrayInfo>buffers).vertexArrayObject)
    } else {
      this.setAttributes(programInfo.attribSetters || programInfo, (<BufferInfo>buffers).attribs)
      if ((<BufferInfo>buffers).indices) {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, (<BufferInfo>buffers).indices)
      }
    }
  }

  public setUniforms (setters: ProgramInfo | Record<string, Function>, values: Record<string, any>) {
    const actualSetters = setters.uniformSetters || setters
    const numArgs = arguments.length
    for (let aNdx = 1; aNdx < numArgs; aNdx++) {
      const values = arguments[aNdx]
      if (Array.isArray(values)) {
        const numValues = values.length
        for (let i = 0; i < numValues; i++) {
          this.setUniforms(actualSetters, values[i])
        }
      } else {
        for (const name in values) {
          const setter = actualSetters[name]
          if (setter) {
            setter(values[name])
          }
        }
      }
    }
  }

  public drawBufferInfo (bufferInfo: BufferInfo | VertexArrayInfo, type?: number, count?: number, offset?: number, instanceCount?: number) {
    type = type === undefined ? this.gl.TRIANGLES : type
    const indices = (<BufferInfo>bufferInfo).indices
    const elementType = bufferInfo.elementType
    const numElements = count === undefined ? bufferInfo.numElements : count
    offset = offset === undefined ? 0 : offset
    if (elementType || indices) {
      if (instanceCount !== undefined) {
        this.gl.drawElementsInstanced(type, numElements, elementType === undefined ? this.gl.UNSIGNED_SHORT : bufferInfo.elementType, offset, instanceCount)
      } else {
        this.gl.drawElements(type, numElements, elementType === undefined ? this.gl.UNSIGNED_SHORT : bufferInfo.elementType, offset)
      }
    } else {
      if (instanceCount !== undefined) {
        this.gl.drawArraysInstanced(type, offset, numElements, instanceCount)
      } else {
        this.gl.drawArrays(type, offset, numElements)
      }
    }
  }

  public drawObjects (objects: DrawObject[]) {
    let lastUsedProgramInfo = null
    let lastUsedBufferInfo = null

    objects.forEach((object) => {
      if (object.active === false) {
        return
      }

      const programInfo = object.programInfo
      const bufferInfo = object.vertexArrayInfo || object.bufferInfo
      let bindBuffers = false
      const type = object.type === undefined ? this.gl.TRIANGLES : object.type

      if (programInfo !== lastUsedProgramInfo) {
        lastUsedProgramInfo = programInfo
        this.gl.useProgram(programInfo.program)
        bindBuffers = true
      }

      if (bindBuffers || bufferInfo !== lastUsedBufferInfo) {
        if (lastUsedBufferInfo && lastUsedBufferInfo.vertexArrayObject && !(<VertexArrayInfo>bufferInfo).vertexArrayObject) {
          this.gl.bindVertexArray(null)
        }
        lastUsedBufferInfo = bufferInfo
        this.setBuffersAndAttributes(programInfo, bufferInfo)
      }

      this.setUniforms(programInfo, object.uniforms)

      this.drawBufferInfo(bufferInfo, type, object.count, object.offset, object.instanceCount)
    })

    if (lastUsedBufferInfo && lastUsedBufferInfo.vertexArrayObject) {
      this.gl.bindVertexArray(null)
    }
  }

  public resizeCanvasToDisplaySize (canvas: HTMLCanvasElement, multiplier = 1) {
    multiplier = Math.max(0, multiplier)
    const width = canvas.clientWidth * multiplier | 0
    const height = canvas.clientHeight * multiplier | 0
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
  }
}

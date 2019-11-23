// Smarter WebGL - PkaGL! ☆★☆★☆★☆

interface ProgramOptions {
  attribLocations?: any,
  transformFeedbackVaryings?: string[],
  transformFeedbackMode?: number
}

interface ProgramInfo {
  program: WebGLProgram,
  uniformSetters: any,
  attribSetters: any,
  uniformBlockSpec: any,
  transformFeedbackInfo: any
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
  textureColor?: number[],
  crossOrigin?: string,
  addExtensionsToContext?: boolean
}

import * as twgl from 'twgl.js'

export default class PikaGL {
  private gl: WebGL2RenderingContext

  constructor (gl: WebGL2RenderingContext) {
    this.gl = gl
  }

  static m4 = twgl.m4

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

  public createProgramInfo (program: WebGLProgram): ProgramInfo {
    return {
      program: program,
      uniformSetters: twgl.createUniformSetters(this.gl, program),
      attribSetters: twgl.createAttributeSetters(this.gl, program),
      uniformBlockSpec: twgl.createUniformBlockSpecFromProgram(this.gl, program),
      transformFeedbackInfo: twgl.createTransformFeedbackInfo(this.gl, program)
    }
  }

  public createBufferInfo (arrays: Record<string, any>): BufferInfo {
    return twgl.createBufferInfoFromArrays(this.gl, arrays)
  }

  public createTexture (options: Record<string, any>) : WebGLTexture {
    return twgl.createTexture(this.gl, options)
  }

  public setDefaults (defaults: Defaults) {
    return twgl.setDefaults(defaults)
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

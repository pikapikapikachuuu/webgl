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

interface BufferInfo {
  numElements: number,
  elementType?: number,
  indices?: WebGLBuffer,
  attribs?: any
}

import * as twgl from 'twgl.js'

export default class PikaGL {
  private gl: WebGL2RenderingContext

  constructor (gl: WebGL2RenderingContext) {
    this.gl = gl
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

  public createProgramInfo (program: WebGLProgram): ProgramInfo {
    return {
      program: program,
      uniformSetters: twgl.createUniformSetters(this.gl, program),
      attribSetters: twgl.createAttributeSetters(this.gl, program),
      uniformBlockSpec: twgl.createUniformBlockSpecFromProgram(this.gl, program),
      transformFeedbackInfo: twgl.createTransformFeedbackInfo(this.gl, program)
    }
  }

  public createBufferInfo (arrays: any): BufferInfo {
    return twgl.createBufferInfoFromArrays(this.gl, arrays)
  }

  private setAttributes (setters: any, buffers: any) {
    for (const name in buffers) {
      const setter = setters[name]
      if (setter) {
        setter(buffers[name])
      }
    }
  }

  public setBuffersAndAttributes (programInfo: ProgramInfo, buffers: any) {
    if (buffers.vertexArrayObject) {
      this.gl.bindVertexArray(buffers.vertexArrayObject)
    } else {
      this.setAttributes(programInfo.attribSetters || programInfo, buffers.attribs)
      if (buffers.indices) {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffers.indices)
      }
    }
  }

  public setUniforms (setters: any, values: any) {
    const actualSetters = setters.uniformSetters || setters
    const numArgs = arguments.length
    for (let aNdx = 1; aNdx < numArgs; ++aNdx) {
      const values = arguments[aNdx]
      if (Array.isArray(values)) {
        const numValues = values.length
        for (let ii = 0; ii < numValues; ++ii) {
          this.setUniforms(actualSetters, values[ii])
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

  public drawBufferInfo (bufferInfo: any, type?: number, count?: number, offset?: number, instanceCount?: number) {
    type = type === undefined ? this.gl.TRIANGLES : type
    const indices = bufferInfo.indices
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
}

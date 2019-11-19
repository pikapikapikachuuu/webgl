import * as twgl from 'twgl.js'

function loadShader (gl: WebGLRenderingContext, shaderSource: string, shaderType: number): WebGLShader {
  const shader = gl.createShader(shaderType)

  const spaceReg = /^[ \t]*\n/
  if (spaceReg.test(shaderSource)) {
    shaderSource = shaderSource.replace(spaceReg, '')
  }

  gl.shaderSource(shader, shaderSource)
  gl.compileShader(shader)
  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (!compiled) {
    gl.deleteShader(shader)
    return null
  }

  return shader
}

interface ProgramOptions{
  attribLocations?: any,
  transformFeedbackVaryings?: string[],
  transformFeedbackMode?: number
}

function createProgram (gl: WebGL2RenderingContext, shaders: WebGLShader[], options?: ProgramOptions) {
  const program = gl.createProgram()

  shaders.forEach(shader => gl.attachShader(program, shader))

  if (options) {
    if (options.attribLocations) {
      Object.keys(options.attribLocations).forEach(function (attrib) {
        gl.bindAttribLocation(program, options.attribLocations[attrib], attrib)
      })
    }
    const varyings = options.transformFeedbackVaryings
    if (varyings) {
      gl.transformFeedbackVaryings(program, varyings, options.transformFeedbackMode || gl.SEPARATE_ATTRIBS)
    }
  }

  gl.linkProgram(program)
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (!linked) {
    gl.deleteProgram(program)
    shaders.forEach(shader => gl.deleteShader(shader))
    return null
  }

  return program
}

interface ProgramInfo {
  program: WebGLProgram,
  uniformSetters: any,
  attribSetters: any,
  uniformBlockSpec: any,
  transformFeedbackInfo: any
}

function createProgramInfo (gl: WebGL2RenderingContext, program: WebGLProgram): ProgramInfo {
  return {
    program: program,
    uniformSetters: twgl.createUniformSetters(gl, program),
    attribSetters: twgl.createAttributeSetters(gl, program),
    uniformBlockSpec: twgl.createUniformBlockSpecFromProgram(gl, program),
    transformFeedbackInfo: twgl.createTransformFeedbackInfo(gl, program)
  }
}

interface BufferInfo {
  numElements: number,
  elementType?: number,
  indices?: WebGLBuffer,
  attribs?: any
}

function createBufferInfo (gl: WebGLRenderingContext, arrays: any): BufferInfo {
  return twgl.createBufferInfoFromArrays(gl, arrays)
}

function setAttributes (setters: any, buffers: any) {
  for (const name in buffers) {
    const setter = setters[name]
    if (setter) {
      setter(buffers[name])
    }
  }
}

function setBuffersAndAttributes (gl: WebGL2RenderingContext, programInfo: ProgramInfo, buffers: any) {
  if (buffers.vertexArrayObject) {
    gl.bindVertexArray(buffers.vertexArrayObject)
  } else {
    setAttributes(programInfo.attribSetters || programInfo, buffers.attribs)
    if (buffers.indices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices)
    }
  }
}

function setUniforms (setters: any, values: any) {
  const actualSetters = setters.uniformSetters || setters
  const numArgs = arguments.length
  for (let aNdx = 1; aNdx < numArgs; ++aNdx) {
    const values = arguments[aNdx]
    if (Array.isArray(values)) {
      const numValues = values.length
      for (let ii = 0; ii < numValues; ++ii) {
        setUniforms(actualSetters, values[ii])
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

export {
  loadShader,
  createProgram,
  createProgramInfo,
  createBufferInfo,
  setBuffersAndAttributes,
  setUniforms
}

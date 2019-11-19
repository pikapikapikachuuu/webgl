import * as twgl from 'twgl.js'

interface BufferInfo {
  numElements: number,
  elementType?: number,
  indices?: WebGLBuffer,
  attribs?: any
}

function createBufferInfo (gl: WebGLRenderingContext, arrays: any): BufferInfo {
  return null
}

export {
  createBufferInfo
}

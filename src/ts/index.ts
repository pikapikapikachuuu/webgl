import '../style/index.css'

import * as glLib from './lib'

const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas')
const gl: WebGL2RenderingContext = <WebGL2RenderingContext>canvas.getContext('webgl2')

import fragmentGLSL from '../shaders/fragment.glsl'
const fragmentShader = glLib.loadShader(gl, fragmentGLSL, gl.FRAGMENT_SHADER)
import vertexGLSL from '../shaders/vertex.glsl'
const vertexShader = glLib.loadShader(gl, vertexGLSL, gl.VERTEX_SHADER)

const program = glLib.createProgram(gl, [fragmentShader, vertexShader])
const programInfo = glLib.createProgramInfo(gl, program)

const arrays = {
  position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]
}
const bufferInfo = glLib.createBufferInfo(gl, arrays)

function render (time) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  const uniforms = {
    time: time * 0.001,
    resolution: [gl.canvas.width, gl.canvas.height]
  }

  gl.useProgram(programInfo.program)
  glLib.setBuffersAndAttributes(gl, programInfo, bufferInfo)
  glLib.setUniforms(programInfo, uniforms)
  glLib.drawBufferInfo(gl, bufferInfo)

  window.requestAnimationFrame(render)
}
window.requestAnimationFrame(render)

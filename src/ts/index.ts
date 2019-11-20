import '../style/index.css'

import PikaGL from './pikagl'

const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas')
const gl: WebGL2RenderingContext = <WebGL2RenderingContext>canvas.getContext('webgl2')
const pgl = new PikaGL(gl)

import fragmentGLSL from '../shaders/fragment.glsl'
const fragmentShader = pgl.loadShader(fragmentGLSL, gl.FRAGMENT_SHADER)
import vertexGLSL from '../shaders/vertex.glsl'
const vertexShader = pgl.loadShader(vertexGLSL, gl.VERTEX_SHADER)

const program = pgl.createProgram([fragmentShader, vertexShader])
const programInfo = pgl.createProgramInfo(program)

const arrays = {
  position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]
}
const bufferInfo = pgl.createBufferInfo(arrays)

function render (time) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  const uniforms = {
    time: time * 0.001,
    resolution: [gl.canvas.width, gl.canvas.height]
  }

  gl.useProgram(programInfo.program)
  pgl.setBuffersAndAttributes(programInfo, bufferInfo)
  pgl.setUniforms(programInfo, uniforms)
  pgl.drawBufferInfo(bufferInfo)

  window.requestAnimationFrame(render)
}
window.requestAnimationFrame(render)

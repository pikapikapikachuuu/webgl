/* eslint-disable camelcase */
import '../style/index.css'

import PikaGL from './pikagl'
import { Cube } from './primitive'
import * as chroma from 'chroma-js'

const m4 = PikaGL.m4
const rand = (min: number, max: number) => min + Math.random() * (max - min)

// initialize
const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas')
const gl: WebGL2RenderingContext = <WebGL2RenderingContext>canvas.getContext('webgl2')
const pgl = new PikaGL(gl)
pgl.setDefaults({ attribPrefix: 'a_' })

// shaders & program
import fragmentGLSL from '../shaders/fragment.glsl'
const fragmentShader = pgl.loadShader(fragmentGLSL, gl.FRAGMENT_SHADER)
import vertexGLSL from '../shaders/vertex.glsl'
const vertexShader = pgl.loadShader(vertexGLSL, gl.VERTEX_SHADER)
const program = pgl.createProgram([fragmentShader, vertexShader])
const programInfo = pgl.createProgramInfo(program)

// primitives
const cube = new Cube(pgl, 2)
const shapes = [
  cube.bufferInfo
]

// Shared values
const lightWorldPosition = [1, 8, -10]
const lightColor = [1, 1, 1, 1]
const camera = m4.identity()
const view = m4.identity()
const viewProjection = m4.identity()

const tex = pgl.createTexture({
  min: gl.NEAREST,
  mag: gl.NEAREST,
  src: [
    255, 255, 255, 255,
    192, 192, 192, 255,
    192, 192, 192, 255,
    255, 255, 255, 255
  ]
})

const objects = []
const objectsToDraw = []
const numObjects = 100
const baseHue = rand(0, 360)
for (let i = 0; i < numObjects; i++) {
  const uniforms = {
    u_lightWorldPos: lightWorldPosition,
    u_lightColor: lightColor,
    u_diffuseMult: chroma.hsv((baseHue + rand(0, 60)) % 360, 0.4, 0.8).gl(),
    u_specular: [1, 1, 1, 1],
    u_shininess: 50,
    u_specularFactor: 1,
    u_diffuse: tex,
    u_viewInverse: camera,
    u_world: m4.identity(),
    u_worldInverseTranspose: m4.identity(),
    u_worldViewProjection: m4.identity()
  }
  objectsToDraw.push({
    programInfo: programInfo,
    bufferInfo: shapes[i % shapes.length],
    uniforms: uniforms
  })
  objects.push({
    translation: [rand(-10, 10), rand(-10, 10), rand(-10, 10)],
    ySpeed: rand(0.1, 0.3),
    zSpeed: rand(0.1, 0.3),
    uniforms: uniforms
  })
}

// draw loop
const render = (time: number) => {
  time *= 0.001
  pgl.resizeCanvasToDisplaySize(canvas)
  gl.viewport(0, 0, canvas.width, canvas.height)

  gl.enable(gl.DEPTH_TEST)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  const projection = m4.perspective(30 * Math.PI / 180, canvas.clientWidth / canvas.clientHeight, 0.5, 100)
  const eye = [1, 4, -20]
  const target = [0, 0, 0]
  const up = [0, 1, 0]

  m4.lookAt(eye, target, up, camera)
  m4.inverse(camera, view)
  m4.multiply(projection, view, viewProjection)

  objects.forEach((object) => {
    const uni = object.uniforms
    const world = uni.u_world
    m4.identity(world)
    m4.rotateY(world, time * object.ySpeed, world)
    m4.rotateZ(world, time * object.zSpeed, world)
    m4.translate(world, object.translation, world)
    m4.rotateX(world, time, world)
    m4.transpose(m4.inverse(world, uni.u_worldInverseTranspose), uni.u_worldInverseTranspose)
    m4.multiply(viewProjection, uni.u_world, uni.u_worldViewProjection)
  })

  pgl.drawObjects(objectsToDraw)

  window.requestAnimationFrame(render)
}
window.requestAnimationFrame(render)

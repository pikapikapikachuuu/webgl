/* eslint-disable camelcase */
import '../style/index.css'

import PikaGL, { BufferInfo } from './pikagl'
import TextureMaker from './texture'
import { Cube, Plane, Sphere, TruncatedCone, Cylinder, RegularPrism } from './primitive'
import * as chroma from 'chroma-js'
import * as m4 from '../3rd/m4'

const rand = (min: number, max: number) => min + Math.random() * (max - min)

// initialize
const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas')
const gl: WebGL2RenderingContext = <WebGL2RenderingContext>canvas.getContext('webgl2')
const pgl = new PikaGL(gl)
pgl.setDefaults({ attribPrefix: 'a_' })

// shaders & program
import shapeFragmentGLSL from '../shaders/shape-fragment.glsl'
const shapeFragmentShader = pgl.loadShader(shapeFragmentGLSL, gl.FRAGMENT_SHADER)
import shapeVertexGLSL from '../shaders/shape-vertex.glsl'
const shapeVertexShader = pgl.loadShader(shapeVertexGLSL, gl.VERTEX_SHADER)
const shapeProgram = pgl.createProgram([shapeFragmentShader, shapeVertexShader])
const shapeProgramInfo = pgl.createProgramInfo(shapeProgram)

import textFragmentGLSL from '../shaders/text-fragment.glsl'
const textFragmentShader = pgl.loadShader(textFragmentGLSL, gl.FRAGMENT_SHADER)
import textVertexGLSL from '../shaders/text-vertex.glsl'
const textVertexShader = pgl.loadShader(textVertexGLSL, gl.VERTEX_SHADER)
const textProgram = pgl.createProgram([textFragmentShader, textVertexShader])
const textProgramInfo = pgl.createProgramInfo(textProgram)

const shapeBufferInfos = [
  new Cube(pgl, { side: 2 }).bufferInfo,
  new Sphere(pgl, { radius: 1, subdivisionsAxis: 32, subdivisionsHeight: 32 }).bufferInfo,
  new Cylinder(pgl, { radius: 1, height: 2, radialSubdivisions: 32, verticalSubdivisions: 2 }).bufferInfo,
  new RegularPrism(pgl, { numSide: 3, width: 1, height: 2, verticalSubdivisions: 1 }).bufferInfo,
  new RegularPrism(pgl, { numSide: 5, width: 1, height: 1, verticalSubdivisions: 5 }).bufferInfo,
  new TruncatedCone(pgl, { bottomRadius: 1, topRadius: 2, height: 2, radialSubdivisions: 32, verticalSubdivisions: 12 }).bufferInfo
]

const textBufferInfo = new Plane(pgl, {
  width: 1,
  depth: 1,
  subdivisionsWidth: 1,
  subdivisionsDepth: 1,
  matrix: m4.xRotation(Math.PI * 0.5)
}).bufferInfo

// Shared values
const lightWorldPosition = [1, 8, -10]
const lightColor = [1, 1, 1, 1]
const camera = m4.identity()
const view = m4.identity()
const viewProjection = m4.identity()

const textureMaker = new TextureMaker(gl)
const shapeTextures = [
  textureMaker.makeCheckerTexture(),
  textureMaker.makeCircleTexture(),
  textureMaker.makeStripeTexture()
]
const textTextures = [
  '我是汉字',
  '巧了我也是'
].map((name) => textureMaker.makeTextTexture(name))

const numObjects = 66
const baseHue = rand(0, 360)

const shapeObjects = []
const shapeObjectsToDraw = []
for (let i = 0; i < numObjects; i++) {
  const uniforms = {
    u_lightWorldPos: lightWorldPosition,
    u_lightColor: lightColor,
    u_diffuseMult: chroma.hsv((baseHue + rand(0, 20)) % 360, 0.4, 0.8).gl(),
    u_specular: [1, 1, 1, 1],
    u_shininess: 50,
    u_specularFactor: 1,
    u_diffuse: shapeTextures[i % shapeTextures.length],
    u_viewInverse: camera,
    u_world: m4.identity(),
    u_worldInverseTranspose: m4.identity(),
    u_worldViewProjection: m4.identity()
  }
  shapeObjectsToDraw.push({
    programInfo: shapeProgramInfo,
    bufferInfo: shapeBufferInfos[i % shapeBufferInfos.length],
    uniforms: uniforms
  })
  shapeObjects.push({
    xTrans: rand(-10, 10),
    yTrans: rand(-10, 10),
    zTrans: rand(-10, 10),
    ySpeed: rand(0.1, 0.3),
    zSpeed: rand(0.1, 0.3),
    uniforms: uniforms
  })
}

const textObjects = []
const textObjectsToDraw = []
for (let i = 0; i < numObjects; i++) {
  const textTexture = textTextures[i % textTextures.length]
  const uniforms = {
    u_texture: textTexture,
    u_worldViewProjection: m4.identity(),
    u_color: chroma.hsv((baseHue + rand(0, 60)) % 360, 1, 1).gl()
  }
  textObjectsToDraw.push({
    programInfo: textProgramInfo,
    bufferInfo: textBufferInfo,
    uniforms: uniforms
  })
  textObjects.push({
    xTrans: rand(-10, 10),
    yTrans: rand(-10, 10),
    zTrans: rand(-10, 10),
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
  gl.disable(gl.BLEND)
  gl.depthMask(true)

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  const projection = m4.perspective(30 * Math.PI / 180, canvas.clientWidth / canvas.clientHeight, 0.5, 100)
  const eye = [1, 4, -20]
  const target = [0, 0, 0]
  const up = [0, 1, 0]

  m4.lookAt(eye, target, up, camera)
  m4.inverse(camera, view)
  m4.multiply(projection, view, viewProjection)

  shapeObjects.forEach((object) => {
    const uni = object.uniforms
    const world = uni.u_world
    m4.identity(world)
    m4.yRotate(world, time * object.ySpeed, world)
    m4.zRotate(world, time * object.zSpeed, world)
    m4.translate(world, object.xTrans, object.yTrans, object.zTrans, world)
    m4.xRotate(world, time, world)
    m4.transpose(m4.inverse(world, uni.u_worldInverseTranspose), uni.u_worldInverseTranspose)
    m4.multiply(viewProjection, uni.u_world, uni.u_worldViewProjection)
  })

  pgl.drawObjects(shapeObjectsToDraw)

  // setup for text
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.depthMask(false)

  textObjects.forEach((object) => {
    const uni = object.uniforms
    const world = m4.identity()
    m4.identity(world)
    m4.yRotate(world, time * object.ySpeed, world)
    m4.zRotate(world, time * object.zSpeed, world)
    m4.translate(world, object.xTrans, object.yTrans, object.zTrans, world)
    m4.xRotate(world, time, world)
    m4.multiply(view, world, world)

    m4.multiply(projection, world, uni.u_worldViewProjection)
  })

  pgl.drawObjects(textObjectsToDraw)

  window.requestAnimationFrame(render)
}
window.requestAnimationFrame(render)

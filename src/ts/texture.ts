interface BicolorTextureOptions {
  width?: number,
  height?: number,
  color1?: string | CanvasGradient | CanvasPattern,
  color2?: string | CanvasGradient | CanvasPattern
}

export default class TextureMaker {
  private ctx: CanvasRenderingContext2D
  private gl: WebGLRenderingContext

  constructor (ctx: CanvasRenderingContext2D, gl: WebGLRenderingContext) {
    this.ctx = ctx
    this.gl = gl
  }

  protected setCanvasSize (width: number, height: number) {
    this.ctx.canvas.width = width
    this.ctx.canvas.height = height
  }

  private makeTexture () {
    const texture = this.gl.createTexture()
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.ctx.canvas)
    this.gl.generateMipmap(this.gl.TEXTURE_2D)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
    return texture
  }

  public makeStripeTexture (options?: BicolorTextureOptions) {
    options = options || {}
    const width = options.width || 2
    const height = options.height || 2
    const color1 = options.color1 || 'white'
    const color2 = options.color2 || 'black'

    this.setCanvasSize(width, height)

    this.ctx.fillStyle = color1 || 'white'
    this.ctx.fillRect(0, 0, width, height)
    this.ctx.fillStyle = color2 || 'black'
    this.ctx.fillRect(0, 0, width, height / 2)

    return this.makeTexture()
  }

  public makeCheckerTexture (options?: BicolorTextureOptions) {
    options = options || {}
    const width = options.width || 2
    const height = options.height || 2
    const color1 = options.color1 || 'white'
    const color2 = options.color2 || 'black'

    this.setCanvasSize(width, height)

    this.ctx.fillStyle = color1 || 'white'
    this.ctx.fillRect(0, 0, width, height)
    this.ctx.fillStyle = color2 || 'black'
    this.ctx.fillRect(0, 0, width / 2, height / 2)
    this.ctx.fillRect(width / 2, height / 2, width / 2, height / 2)

    return this.makeTexture()
  }

  public makeCircleTexture (options?: BicolorTextureOptions) {
    options = options || {}
    const width = options.width || 128
    const height = options.height || 128
    const color1 = options.color1 || 'white'
    const color2 = options.color2 || 'black'

    this.setCanvasSize(width, height)

    this.ctx.fillStyle = color1 || 'white'
    this.ctx.fillRect(0, 0, width, height)
    this.ctx.fillStyle = color2 || 'black'
    this.ctx.save()
    this.ctx.translate(width / 2, height / 2)
    this.ctx.beginPath()
    this.ctx.arc(0, 0, width / 2 - 1, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.fillStyle = color1 || 'white'
    this.ctx.beginPath()
    this.ctx.arc(0, 0, width / 4 - 1, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.restore()

    return this.makeTexture()
  }
}

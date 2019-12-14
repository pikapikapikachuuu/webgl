interface BasicTextureOptions {
  width?: number,
  height?: number
}

interface BicolorTextureOptions extends BasicTextureOptions {
  color1?: string | CanvasGradient | CanvasPattern,
  color2?: string | CanvasGradient | CanvasPattern
}

interface TextTextureOptions extends BasicTextureOptions {
  font?: string
}

export default class TextureMaker {
  private ctx: OffscreenCanvasRenderingContext2D
  private gl: WebGLRenderingContext

  constructor (gl: WebGLRenderingContext) {
    // eslint-disable-next-line no-undef
    this.ctx = (new OffscreenCanvas(256, 256)).getContext('2d')
    this.gl = gl
  }

  protected setCanvas (width: number, height: number) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
    // this.ctx.beginPath()
    this.ctx.canvas.width = width
    this.ctx.canvas.height = height
  }

  private makeTexture (): WebGLTexture {
    const texture = this.gl.createTexture()
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.ctx.canvas)
    this.gl.generateMipmap(this.gl.TEXTURE_2D)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
    return texture
  }

  public makeStripeTexture (options?: BicolorTextureOptions): WebGLTexture {
    options = options || {}
    const width = options.width || 2
    const height = options.height || 2
    const color1 = options.color1 || 'white'
    const color2 = options.color2 || 'gray'

    this.setCanvas(width, height)

    this.ctx.fillStyle = color1
    this.ctx.fillRect(0, 0, width, height)
    this.ctx.fillStyle = color2
    this.ctx.fillRect(0, 0, width, height / 2)

    return this.makeTexture()
  }

  public makeCheckerTexture (options?: BicolorTextureOptions): WebGLTexture {
    options = options || {}
    const width = options.width || 2
    const height = options.height || 2
    const color1 = options.color1 || 'white'
    const color2 = options.color2 || 'gray'

    this.setCanvas(width, height)

    this.ctx.fillStyle = color1
    this.ctx.fillRect(0, 0, width, height)
    this.ctx.fillStyle = color2
    this.ctx.fillRect(0, 0, width / 2, height / 2)
    this.ctx.fillRect(width / 2, height / 2, width / 2, height / 2)

    return this.makeTexture()
  }

  public makeCircleTexture (options?: BicolorTextureOptions): WebGLTexture {
    options = options || {}
    const width = options.width || 128
    const height = options.height || 128
    const color1 = options.color1 || 'white'
    const color2 = options.color2 || 'gray'

    this.setCanvas(width, height)

    this.ctx.fillStyle = color1
    this.ctx.fillRect(0, 0, width, height)
    this.ctx.fillStyle = color2
    this.ctx.save()
    this.ctx.translate(width / 2, height / 2)
    this.ctx.beginPath()
    this.ctx.arc(0, 0, width / 2 - 1, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.fillStyle = color1
    this.ctx.beginPath()
    this.ctx.arc(0, 0, width / 4 - 1, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.restore()

    return this.makeTexture()
  }

  public makeTextTexture (text: string, options?: TextTextureOptions): WebGLTexture {
    options = options || {}
    const width = options.width || 128
    const height = options.height || 32
    const font = options.font || '28px 宋体'

    this.setCanvas(width, height)

    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillStyle = 'white'
    this.ctx.font = font
    this.ctx.fillText(text, width / 2, height / 2)

    const texture = this.gl.createTexture()
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
    this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.ctx.canvas)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    return texture
  }
}

function drawBufferInfo (gl: WebGL2RenderingContext, bufferInfo: any, type?: number, count?: number, offset?: number, instanceCount?: number) {
  type = type === undefined ? gl.TRIANGLES : type
  const indices = bufferInfo.indices
  const elementType = bufferInfo.elementType
  const numElements = count === undefined ? bufferInfo.numElements : count
  offset = offset === undefined ? 0 : offset
  if (elementType || indices) {
    if (instanceCount !== undefined) {
      gl.drawElementsInstanced(type, numElements, elementType === undefined ? gl.UNSIGNED_SHORT : bufferInfo.elementType, offset, instanceCount)
    } else {
      gl.drawElements(type, numElements, elementType === undefined ? gl.UNSIGNED_SHORT : bufferInfo.elementType, offset)
    }
  } else {
    if (instanceCount !== undefined) {
      gl.drawArraysInstanced(type, offset, numElements, instanceCount)
    } else {
      gl.drawArrays(type, offset, numElements)
    }
  }
}

export {
  drawBufferInfo
}

import '../dat.gui.min'
import isMobile from './isMobile';

const ga = () => {};

export default function startGUI(config, updateKeywords, initFramebuffers, splatStack) {
  var gui = new dat.GUI({ width: 300 })
  gui.add(config, 'DYE_RESOLUTION', {
    'high': 1024,
    'medium': 512,
    'low': 256,
    'very low': 128
  }).name('quality').onFinishChange(initFramebuffers)
  gui.add(config, 'SIM_RESOLUTION', {
    '32': 32,
    '64': 64,
    '128': 128,
    '256': 256
  }).name('sim resolution').onFinishChange(initFramebuffers)
  gui.add(config, 'DENSITY_DISSIPATION', 0, 4.0).name('density diffusion')
  gui.add(config, 'VELOCITY_DISSIPATION', 0, 4.0).name('velocity diffusion')
  gui.add(config, 'PRESSURE', 0.0, 1.0).name('pressure')
  gui.add(config, 'CURL', 0, 50).name('vorticity').step(1)
  gui.add(config, 'SPLAT_RADIUS', 0.01, 1.0).name('splat radius')
  gui.add(config, 'SHADING').name('shading').onFinishChange(updateKeywords)
  gui.add(config, 'COLORFUL').name('colorful')
  gui.add(config, 'PAUSED').name('paused').listen()

  gui.add({
    fun: () => {
      splatStack.push(parseInt(Math.random() * 20) + 5)
    }
  }, 'fun').name('Random splats')

  let bloomFolder = gui.addFolder('Bloom')
  bloomFolder.add(config, 'BLOOM').name('enabled').onFinishChange(updateKeywords)
  bloomFolder.add(config, 'BLOOM_INTENSITY', 0.1, 2.0).name('intensity')
  bloomFolder.add(config, 'BLOOM_THRESHOLD', 0.0, 1.0).name('threshold')

  let sunraysFolder = gui.addFolder('Sunrays')
  sunraysFolder.add(config, 'SUNRAYS').name('enabled').onFinishChange(updateKeywords)
  sunraysFolder.add(config, 'SUNRAYS_WEIGHT', 0.3, 1.0).name('weight')

  let uniqueColor = gui.addFolder('Unique Color')
  uniqueColor.add(config, 'UNIQUE_COLOR').name('enabled').onFinishChange(updateKeywords)
  uniqueColor.addColor(config, 'COLOR').name('color')


  let captureFolder = gui.addFolder('Capture')
  captureFolder.addColor(config, 'BACK_COLOR').name('background color')
  captureFolder.add(config, 'TRANSPARENT').name('transparent')
  captureFolder.add({ fun: captureScreenshot }, 'fun').name('take screenshot')

  if (isMobile())
    gui.close()
}

function captureScreenshot() {
  let res = getResolution(config.CAPTURE_RESOLUTION)
  let target = createFBO(res.width, res.height, ext.formatRGBA.internalFormat, ext.formatRGBA.format, ext.halfFloatTexType, gl.NEAREST)
  render(target)

  let texture = framebufferToTexture(target)
  texture = normalizeTexture(texture, target.width, target.height)

  let captureCanvas = textureToCanvas(texture, target.width, target.height)
  let datauri = captureCanvas.toDataURL()
  downloadURI('fluid.png', datauri)
  URL.revokeObjectURL(datauri)
}

function framebufferToTexture(target) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
  let length = target.width * target.height * 4
  let texture = new Float32Array(length)
  gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.FLOAT, texture)
  return texture
}

function normalizeTexture(texture, width, height) {
  let result = new Uint8Array(texture.length)
  let id = 0
  for (let i = height - 1; i >= 0; i--) {
    for (let j = 0; j < width; j++) {
      let nid = i * width * 4 + j * 4
      result[nid + 0] = clamp01(texture[id + 0]) * 255
      result[nid + 1] = clamp01(texture[id + 1]) * 255
      result[nid + 2] = clamp01(texture[id + 2]) * 255
      result[nid + 3] = clamp01(texture[id + 3]) * 255
      id += 4
    }
  }
  return result
}

function clamp01(input) {
  return Math.min(Math.max(input, 0), 1)
}

function textureToCanvas(texture, width, height) {
  let captureCanvas = document.createElement('canvas')
  let ctx = captureCanvas.getContext('2d')
  captureCanvas.width = width
  captureCanvas.height = height

  let imageData = ctx.createImageData(width, height)
  imageData.data.set(texture)
  ctx.putImageData(imageData, 0, 0)

  return captureCanvas
}

function downloadURI(filename, uri) {
  let link = document.createElement('a')
  link.download = filename
  link.href = uri
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
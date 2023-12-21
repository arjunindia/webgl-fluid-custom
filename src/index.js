'use strict'

import './dat.gui.min'
import isMobile from './utils/isMobile'
import getWebGLContext from './utils/webglContext'
import pointerPrototype from './utils/pointers';

import {
  checkerboardShaderT,
  checkerboardShaderN,
  colorShaderExport,
  clearShaderExport,
  copyShaderExport,
  blurShaderExport,
  blurVertex,
  baseVertex,
  displayShaderExport,
  bloomPrefilterShaderExport,
  bloomBlurShaderExport,
  bloomFinalShaderExport,
  sunraysMaskShaderExport,
  sunraysShaderExport,
  splatShaderExport,
  advectionShaderExport,
  divergenceShaderExport,
  curlShaderExport,
  vorticityShaderExport,
  pressureShaderExport,
  gradientSubstractShaderExport,
} from './shaders';
import startGUI from './utils/startGUI';



export default function (el, config) {
  const canvas = el
  resizeCanvas()

  config = {
    IMMEDIATE: true,
    TRIGGER: 'hover',
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 1,
    VELOCITY_DISSIPATION: 0.2,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLORFUL: true,
    UNIQUE_COLOR: false,
    COLOR: { r: 0.5, g: 1, b: 1 },
    COLOR_UPDATE_SPEED: 10,
    PAUSED: false,
    BACK_COLOR: { r: 0, g: 0, b: 0 },
    TRANSPARENT: true,
    BLOOM: true,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.6,
    BLOOM_SOFT_KNEE: 0.7,
    SUNRAYS: false,
    SUNRAYS_RESOLUTION: 196,
    SUNRAYS_WEIGHT: 1.0,
    GUI: true,
    ...config,
  }

  let pointers = []
  let splatStack = []
  let bloomFramebuffers = []
  let customColor = config.COLOR || {}
 
    if((config.COLOR && config.UNIQUE_COLOR)) {
      let c = config.COLOR
      c.r /= 255
      c.g /= 255
      c.b /= 255
      customColor = c
    }


  pointers.push(new pointerPrototype())

  const { gl, ext } = getWebGLContext(canvas)

  if (isMobile()) {
    config.DYE_RESOLUTION = 512
  }
  if (!ext.supportLinearFiltering) {
    config.DYE_RESOLUTION = 512
    config.SHADING = false
    config.BLOOM = false
    config.SUNRAYS = false
  }


  if(config.GUI){
    startGUI(config, updateKeywords, initFramebuffers, splatStack)
  }

  class Material {
    constructor(vertexShader, fragmentShaderSource) {
      this.vertexShader = vertexShader
      this.fragmentShaderSource = fragmentShaderSource
      this.programs = []
      this.activeProgram = null
      this.uniforms = []
    }

    setKeywords(keywords) {
      let hash = 0
      for (let i = 0; i < keywords.length; i++)
        hash += hashCode(keywords[i])

      let program = this.programs[hash]
      if (program == null) {
        let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords)
        program = createProgram(this.vertexShader, fragmentShader)
        this.programs[hash] = program
      }

      if (program == this.activeProgram) return

      this.uniforms = getUniforms(program)
      this.activeProgram = program
    }

    bind() {
      gl.useProgram(this.activeProgram)
    }
  }

  class Program {
    constructor(vertexShader, fragmentShader) {
      this.uniforms = {}
      this.program = createProgram(vertexShader, fragmentShader)
      this.uniforms = getUniforms(this.program)
    }

    bind() {
      gl.useProgram(this.program)
    }
  }

  function createProgram(vertexShader, fragmentShader) {
    let program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw gl.getProgramInfoLog(program)

    return program
  }

  function getUniforms(program) {
    let uniforms = []
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < uniformCount; i++) {
      let uniformName = gl.getActiveUniform(program, i).name
      uniforms[uniformName] = gl.getUniformLocation(program, uniformName)
    }
    return uniforms
  }

  function compileShader(type, source, keywords) {
    source = addKeywords(source, keywords)

    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw gl.getShaderInfoLog(shader)

    return shader
  }

  function addKeywords(source, keywords) {
    if (keywords == null) return source
    let keywordsString = ''
    keywords.forEach(keyword => {
      keywordsString += '#define ' + keyword + '\n'
    })
    return keywordsString + source
  }

  const baseVertexShader = compileShader(gl.VERTEX_SHADER, baseVertex)
  const blurVertexShader = compileShader(gl.VERTEX_SHADER, blurVertex)
  const blurShader = compileShader(gl.FRAGMENT_SHADER, blurShaderExport)
  const copyShader = compileShader(gl.FRAGMENT_SHADER, copyShaderExport)
  const clearShader = compileShader(gl.FRAGMENT_SHADER, clearShaderExport)
  const colorShader = compileShader(gl.FRAGMENT_SHADER, colorShaderExport)
  const checkerboardShader = compileShader(gl.FRAGMENT_SHADER, config.TRANSPARENT ? checkerboardShaderT : checkerboardShaderN)
  const displayShaderSource = displayShaderExport
  const bloomPrefilterShader = compileShader(gl.FRAGMENT_SHADER, bloomPrefilterShaderExport)
  const bloomBlurShader = compileShader(gl.FRAGMENT_SHADER, bloomBlurShaderExport)
  const bloomFinalShader = compileShader(gl.FRAGMENT_SHADER, bloomFinalShaderExport)
  const sunraysMaskShader = compileShader(gl.FRAGMENT_SHADER, sunraysMaskShaderExport)
  const sunraysShader = compileShader(gl.FRAGMENT_SHADER, sunraysShaderExport )
  const splatShader = compileShader(gl.FRAGMENT_SHADER, splatShaderExport)
  const advectionShader = compileShader(gl.FRAGMENT_SHADER, advectionShaderExport,
    ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']
  )
  const divergenceShader = compileShader(gl.FRAGMENT_SHADER, divergenceShaderExport )
  const curlShader = compileShader(gl.FRAGMENT_SHADER, curlShaderExport)
  const vorticityShader = compileShader(gl.FRAGMENT_SHADER, vorticityShaderExport)
  const pressureShader = compileShader(gl.FRAGMENT_SHADER, pressureShaderExport)
  const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER,gradientSubstractShaderExport)

  const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)

    return (destination) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
    }
  })()

  let dye
  let velocity
  let divergence
  let curl
  let pressure
  let bloom
  let sunrays
  let sunraysTemp

  let ditheringTexture = createTextureAsync()

  const blurProgram = new Program(blurVertexShader, blurShader)
  const copyProgram = new Program(baseVertexShader, copyShader)
  const clearProgram = new Program(baseVertexShader, clearShader)
  const colorProgram = new Program(baseVertexShader, colorShader)
  const checkerboardProgram = new Program(baseVertexShader, checkerboardShader)
  const bloomPrefilterProgram = new Program(baseVertexShader, bloomPrefilterShader)
  const bloomBlurProgram = new Program(baseVertexShader, bloomBlurShader)
  const bloomFinalProgram = new Program(baseVertexShader, bloomFinalShader)
  const sunraysMaskProgram = new Program(baseVertexShader, sunraysMaskShader)
  const sunraysProgram = new Program(baseVertexShader, sunraysShader)
  const splatProgram = new Program(baseVertexShader, splatShader)
  const advectionProgram = new Program(baseVertexShader, advectionShader)
  const divergenceProgram = new Program(baseVertexShader, divergenceShader)
  const curlProgram = new Program(baseVertexShader, curlShader)
  const vorticityProgram = new Program(baseVertexShader, vorticityShader)
  const pressureProgram = new Program(baseVertexShader, pressureShader)
  const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader)
  const displayMaterial = new Material(baseVertexShader, displayShaderSource)

  function initFramebuffers() {
    let simRes = getResolution(config.SIM_RESOLUTION)
    let dyeRes = getResolution(config.DYE_RESOLUTION)

    const texType = ext.halfFloatTexType
    const rgba = ext.formatRGBA
    const rg = ext.formatRG
    const r = ext.formatR
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST

    if (dye == null)
      dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering)
    else
      dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering)

    if (velocity == null)
      velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering)
    else
      velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering)

    divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)
    curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)
    pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)

    initBloomFramebuffers()
    initSunraysFramebuffers()
  }

  function initBloomFramebuffers() {
    let res = getResolution(config.BLOOM_RESOLUTION)

    const texType = ext.halfFloatTexType
    const rgba = ext.formatRGBA
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST

    bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering)

    bloomFramebuffers.length = 0
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
      let width = res.width >> (i + 1)
      let height = res.height >> (i + 1)

      if (width < 2 || height < 2) break

      let fbo = createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering)
      bloomFramebuffers.push(fbo)
    }
  }

  function initSunraysFramebuffers() {
    let res = getResolution(config.SUNRAYS_RESOLUTION)

    const texType = ext.halfFloatTexType
    const r = ext.formatR
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST

    sunrays = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering)
    sunraysTemp = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering)
  }

  function createFBO(w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0)
    let texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)

    let fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    gl.viewport(0, 0, w, h)
    gl.clear(gl.COLOR_BUFFER_BIT)

    let texelSizeX = 1.0 / w
    let texelSizeY = 1.0 / h

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach(id) {
        gl.activeTexture(gl.TEXTURE0 + id)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        return id
      }
    }
  }

  function createDoubleFBO(w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param)
    let fbo2 = createFBO(w, h, internalFormat, format, type, param)

    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1
      },
      set read(value) {
        fbo1 = value
      },
      get write() {
        return fbo2
      },
      set write(value) {
        fbo2 = value
      },
      swap() {
        let temp = fbo1
        fbo1 = fbo2
        fbo2 = temp
      }
    }
  }

  function resizeFBO(target, w, h, internalFormat, format, type, param) {
    let newFBO = createFBO(w, h, internalFormat, format, type, param)
    copyProgram.bind()
    gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0))
    blit(newFBO.fbo)
    return newFBO
  }

  function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
    if (target.width == w && target.height == h)
      return target
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param)
    target.write = createFBO(w, h, internalFormat, format, type, param)
    target.width = w
    target.height = h
    target.texelSizeX = 1.0 / w
    target.texelSizeY = 1.0 / h
    return target
  }

  function createTextureAsync(url) {
    let texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255]))

    let obj = {
      texture,
      width: 1,
      height: 1,
      attach(id) {
        gl.activeTexture(gl.TEXTURE0 + id)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        return id
      }
    }

    let image = new Image()
    image.onload = () => {
      obj.width = image.width
      obj.height = image.height
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
    }
    image.src = url

    return obj
  }

  function updateKeywords() {
    let displayKeywords = []
    if (config.SHADING) displayKeywords.push('SHADING')
    if (config.BLOOM) displayKeywords.push('BLOOM')
    if (config.SUNRAYS) displayKeywords.push('SUNRAYS')
    displayMaterial.setKeywords(displayKeywords)
  }

  updateKeywords()
  initFramebuffers()
  config.IMMEDIATE && multipleSplats(parseInt(Math.random() * 20) + 5)

  let lastUpdateTime = Date.now()
  let colorUpdateTimer = 0.0
  update()

  function update() {
    const dt = calcDeltaTime()
    if (resizeCanvas())
      initFramebuffers()
    updateColors(dt)
    applyInputs()
    if (!config.PAUSED)
      step(dt)
    render(null)
    requestAnimationFrame(update)
  }

  function calcDeltaTime() {
    let now = Date.now()
    let dt = (now - lastUpdateTime) / 1000
    dt = Math.min(dt, 0.016666)
    lastUpdateTime = now
    return dt
  }

  function resizeCanvas() {
    let width = scaleByPixelRatio(canvas.clientWidth)
    let height = scaleByPixelRatio(canvas.clientHeight)
    if ((canvas.width != width || canvas.height != height) && (Math.floor(width)>=0 && Math.floor(height)>=0)) {
      canvas.width = Math.floor(width)
      canvas.height = Math.floor(height)
      return true
    }
    return false
  }

  function updateColors(dt) {
    if (!config.COLORFUL) return

    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED
    if (colorUpdateTimer >= 1 && !config.UNIQUE_COLOR) {
      colorUpdateTimer = wrap(colorUpdateTimer, 0, 1)
      pointers.forEach(p => {
        p.color = generateColor()
      })
    }
  }

  function applyInputs() {
    if (splatStack.length > 0)
      multipleSplats(splatStack.pop())

    pointers.forEach(p => {
      if (p.moved) {
        p.moved = false
        splatPointer(p)
      }
    })
  }

  function step(dt) {
    gl.disable(gl.BLEND)
    gl.viewport(0, 0, velocity.width, velocity.height)

    curlProgram.bind()
    gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0))
    blit(curl.fbo)

    vorticityProgram.bind()
    gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0))
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1))
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL)
    gl.uniform1f(vorticityProgram.uniforms.dt, dt)
    blit(velocity.write.fbo)
    velocity.swap()

    divergenceProgram.bind()
    gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0))
    blit(divergence.fbo)

    clearProgram.bind()
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0))
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE)
    blit(pressure.write.fbo)
    pressure.swap()

    pressureProgram.bind()
    gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0))
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1))
      blit(pressure.write.fbo)
      pressure.swap()
    }

    gradienSubtractProgram.bind()
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0))
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1))
    blit(velocity.write.fbo)
    velocity.swap()

    advectionProgram.bind()
    gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    if (!ext.supportLinearFiltering)
      gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY)
    let velocityId = velocity.read.attach(0)
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId)
    gl.uniform1i(advectionProgram.uniforms.uSource, velocityId)
    gl.uniform1f(advectionProgram.uniforms.dt, dt)
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION)
    blit(velocity.write.fbo)
    velocity.swap()

    gl.viewport(0, 0, dye.width, dye.height)

    if (!ext.supportLinearFiltering)
      gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY)
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0))
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1))
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION)
    blit(dye.write.fbo)
    dye.swap()
  }

  function render(target) {
    if (config.BLOOM)
      applyBloom(dye.read, bloom)
    if (config.SUNRAYS) {
      applySunrays(dye.read, dye.write, sunrays)
      blur(sunrays, sunraysTemp, 1)
    }

    if (target == null || !config.TRANSPARENT) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.enable(gl.BLEND)
    } else {
      gl.disable(gl.BLEND)
    }

    let width = target == null ? gl.drawingBufferWidth : target.width
    let height = target == null ? gl.drawingBufferHeight : target.height
    gl.viewport(0, 0, width, height)

    let fbo = target == null ? null : target.fbo
    if (!config.TRANSPARENT)
      drawColor(fbo, normalizeColor(config.BACK_COLOR))
    if (target == null && config.TRANSPARENT)
      drawCheckerboard(fbo)
    drawDisplay(fbo, width, height)
  }

  function drawColor(fbo, color) {
    colorProgram.bind()
    gl.uniform4f(colorProgram.uniforms.color, color.r, color.g, color.b, 1)
    blit(fbo)
  }

  function drawCheckerboard(fbo) {
    checkerboardProgram.bind()
    gl.uniform1f(checkerboardProgram.uniforms.aspectRatio, canvas.width / canvas.height)
    blit(fbo)
  }

  function drawDisplay(fbo, width, height) {
    displayMaterial.bind()
    if (config.SHADING)
      gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height)
    gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0))
    if (config.BLOOM) {
      gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1))
      gl.uniform1i(displayMaterial.uniforms.uDithering, ditheringTexture.attach(2))
      let scale = getTextureScale(ditheringTexture, width, height)
      gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y)
    }
    if (config.SUNRAYS)
      gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays.attach(3))
    blit(fbo)
  }

  function applyBloom(source, destination) {
    if (bloomFramebuffers.length < 2)
      return

    let last = destination

    gl.disable(gl.BLEND)
    bloomPrefilterProgram.bind()
    let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001
    let curve0 = config.BLOOM_THRESHOLD - knee
    let curve1 = knee * 2
    let curve2 = 0.25 / knee
    gl.uniform3f(bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2)
    gl.uniform1f(bloomPrefilterProgram.uniforms.threshold, config.BLOOM_THRESHOLD)
    gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0))
    gl.viewport(0, 0, last.width, last.height)
    blit(last.fbo)

    bloomBlurProgram.bind()
    for (let i = 0; i < bloomFramebuffers.length; i++) {
      let dest = bloomFramebuffers[i]
      gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY)
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0))
      gl.viewport(0, 0, dest.width, dest.height)
      blit(dest.fbo)
      last = dest
    }

    gl.blendFunc(gl.ONE, gl.ONE)
    gl.enable(gl.BLEND)

    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
      let baseTex = bloomFramebuffers[i]
      gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY)
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0))
      gl.viewport(0, 0, baseTex.width, baseTex.height)
      blit(baseTex.fbo)
      last = baseTex
    }

    gl.disable(gl.BLEND)
    bloomFinalProgram.bind()
    gl.uniform2f(bloomFinalProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY)
    gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0))
    gl.uniform1f(bloomFinalProgram.uniforms.intensity, config.BLOOM_INTENSITY)
    gl.viewport(0, 0, destination.width, destination.height)
    blit(destination.fbo)
  }

  function applySunrays(source, mask, destination) {
    gl.disable(gl.BLEND)
    sunraysMaskProgram.bind()
    gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, source.attach(0))
    gl.viewport(0, 0, mask.width, mask.height)
    blit(mask.fbo)

    sunraysProgram.bind()
    gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT)
    gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0))
    gl.viewport(0, 0, destination.width, destination.height)
    blit(destination.fbo)
  }

  function blur(target, temp, iterations) {
    blurProgram.bind()
    for (let i = 0; i < iterations; i++) {
      gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0)
      gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0))
      blit(temp.fbo)

      gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY)
      gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0))
      blit(target.fbo)
    }
  }

  function splatPointer(pointer) {
    let dx = pointer.deltaX * config.SPLAT_FORCE
    let dy = pointer.deltaY * config.SPLAT_FORCE
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color)
  }

  function multipleSplats(amount) {
    for (let i = 0; i < amount; i++) {
      const color = generateColor()
      color.r *= config.UNIQUE_COLOR && config.COLOR ? 1 : 10.0
      color.g *= config.UNIQUE_COLOR && config.COLOR ? 1 : 10.0
      color.b *= config.UNIQUE_COLOR && config.COLOR ? 1 : 10.0
      const x = Math.random()
      const y = Math.random()
      const dx = 1000 * (Math.random() - 0.5)
      const dy = 1000 * (Math.random() - 0.5)
      splat(x, y, dx, dy, color)
    }
  }

  function splat(x, y, dx, dy, color) {
    gl.viewport(0, 0, velocity.width, velocity.height)
    splatProgram.bind()
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0))
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height)
    gl.uniform2f(splatProgram.uniforms.point, x, y)
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0)
    gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0))
    blit(velocity.write.fbo)
    velocity.swap()

    gl.viewport(0, 0, dye.width, dye.height)
    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0))
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b)
    blit(dye.write.fbo)
    dye.swap()
  }

  function correctRadius(radius) {
    let aspectRatio = canvas.width / canvas.height
    if (aspectRatio > 1)
      radius *= aspectRatio
    return radius
  }

  if(config.TRIGGER === "hover"){
    canvas.addEventListener('mouseenter', e => {
      let posX = scaleByPixelRatio(e.offsetX)
      let posY = scaleByPixelRatio(e.offsetY)
      let pointer = pointers.find(p => p.id == -1)
      if (pointer == null)
        pointer = new pointerPrototype()
        updatePointerDownData(pointer, -1, posX, posY)
    })
  }

  if(config.TRIGGER === "click"){
    canvas.addEventListener('mousedown', e => {
      let posX = scaleByPixelRatio(e.offsetX)
      let posY = scaleByPixelRatio(e.offsetY)
      let pointer = pointers.find(p => p.id == -1)
      if (pointer == null)
        pointer = new pointerPrototype()
      updatePointerDownData(pointer, -1, posX, posY)
    })
  }

  
  setTimeout(() => {
    canvas.addEventListener('mousemove', e => {
      let posX = scaleByPixelRatio(e.offsetX)
      let posY = scaleByPixelRatio(e.offsetY)
      updatePointerMoveData(pointers[0], posX, posY)
    })
  }, 500)


  window.addEventListener('mouseup', () => {
    updatePointerUpData(pointers[0])
  })

  canvas.addEventListener('touchstart', e => {
    e.preventDefault()
    const touches = e.targetTouches
    while (touches.length >= pointers.length)
      pointers.push(new pointerPrototype())
    for (let i = 0; i < touches.length; i++) {
      let posX = scaleByPixelRatio(touches[i].pageX)
      let posY = scaleByPixelRatio(touches[i].pageY)
      updatePointerDownData(pointers[i + 1], touches[i].identifier, posX, posY)
    }
  })

  canvas.addEventListener('touchmove', e => {
    e.preventDefault()
    const touches = e.targetTouches
    for (let i = 0; i < touches.length; i++) {
      let posX = scaleByPixelRatio(touches[i].pageX)
      let posY = scaleByPixelRatio(touches[i].pageY)
      updatePointerMoveData(pointers[i + 1], posX, posY)
    }
  }, false)

  window.addEventListener('touchend', e => {
    const touches = e.changedTouches
    for (let i = 0; i < touches.length; i++) {
      let pointer = pointers.find(p => p.id == touches[i].identifier)
      updatePointerUpData(pointer)
    }
  })

  if(config.GUI){
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyP')
        config.PAUSED = !config.PAUSED
      if (e.key === ' ')
        splatStack.push(parseInt(Math.random() * 20) + 5)
    })
  }

  function updatePointerDownData(pointer, id, posX, posY) {
    pointer.id = id
    pointer.down = true
    pointer.moved = false
    pointer.texcoordX = posX / canvas.width
    pointer.texcoordY = 1.0 - posY / canvas.height
    pointer.prevTexcoordX = pointer.texcoordX
    pointer.prevTexcoordY = pointer.texcoordY
    pointer.deltaX = 0
    pointer.deltaY = 0
    pointer.color = generateColor()
  }

  function updatePointerMoveData(pointer, posX, posY) {
    if (config.TRIGGER === 'click') {
      pointer.moved = pointer.down
    }
    pointer.prevTexcoordX = pointer.texcoordX
    pointer.prevTexcoordY = pointer.texcoordY
    pointer.texcoordX = posX / canvas.width
    pointer.texcoordY = 1.0 - posY / canvas.height
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX)
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY)
    if (config.TRIGGER === 'hover') {
      pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0
    }
  }

  function updatePointerUpData(pointer) {
    pointer.down = false
  }

  function correctDeltaX(delta) {
    let aspectRatio = canvas.width / canvas.height
    if (aspectRatio < 1) delta *= aspectRatio
    return delta
  }

  function correctDeltaY(delta) {
    let aspectRatio = canvas.width / canvas.height
    if (aspectRatio > 1) delta /= aspectRatio
    return delta
  }

  function generateColor() {
    if(config.COLOR && config.UNIQUE_COLOR) {
      return customColor
    }else {
      let c = HSVtoRGB(Math.random(), 1.0, 1.0)
      c.r *= 0.15
      c.g *= 0.15
      c.b *= 0.15
      return c
    }
  }

  function HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t
    i = Math.floor(h * 6)
    f = h * 6 - i
    p = v * (1 - s)
    q = v * (1 - f * s)
    t = v * (1 - (1 - f) * s)

    switch (i % 6) {
      case 0:
        r = v, g = t, b = p
        break
      case 1:
        r = q, g = v, b = p
        break
      case 2:
        r = p, g = v, b = t
        break
      case 3:
        r = p, g = q, b = v
        break
      case 4:
        r = t, g = p, b = v
        break
      case 5:
        r = v, g = p, b = q
        break
    }

    return {
      r,
      g,
      b
    }
  }

  function normalizeColor(input) {
    let output = {
      r: input.r / 255,
      g: input.g / 255,
      b: input.b / 255
    }
    return output
  }

  function wrap(value, min, max) {
    let range = max - min
    if (range == 0) return min
    return (value - min) % range + min
  }

  function getResolution(resolution) {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight
    if (aspectRatio < 1)
      aspectRatio = 1.0 / aspectRatio

    let min = Math.round(resolution)
    let max = Math.round(resolution * aspectRatio)

    if (gl.drawingBufferWidth > gl.drawingBufferHeight)
      return { width: max, height: min }
    else
      return { width: min, height: max }
  }

  function getTextureScale(texture, width, height) {
    return {
      x: width / texture.width,
      y: height / texture.height
    }
  }

  function scaleByPixelRatio(input) {
    let pixelRatio = window.devicePixelRatio || 1
    return Math.floor(input * pixelRatio)
  }

  function hashCode(s) {
    if (s.length == 0) return 0
    let hash = 0
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i)
      hash |= 0 // Convert to 32bit integer
    }
    return hash
  }
}

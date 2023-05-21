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
} from '../shaders';

export class Material {
  constructor(gl, vertexShader, fragmentShaderSource) {
    this.vertexShader = vertexShader
    this.fragmentShaderSource = fragmentShaderSource
    this.programs = []
    this.activeProgram = null
    this.uniforms = []
    this.gl = gl
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

export class Program {
  constructor(vertexShader, fragmentShader) {
    this.uniforms = {}
    this.program = createProgram(vertexShader, fragmentShader)
    this.uniforms = getUniforms(this.program)
  }

  bind() {
    gl.useProgram(this.program)
  }
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

function createProgram(vertexShader, fragmentShader) {
  let program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw gl.getProgramInfoLog(program)

  return program
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

function hashCode(s) {
  if (s.length == 0) return 0
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }
  return hash
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


export default { Material, Program };
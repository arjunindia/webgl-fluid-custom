export class Program {
  constructor(gl,vertexShader, fragmentShader) {
    this.uniforms = {}
    this.program = createProgram(vertexShader, fragmentShader)
    this.uniforms = getUniforms(this.program)
    this.gl = gl
  }

  bind() {
    gl.useProgram(this.program)
  }
}

export function createProgram(vertexShader, fragmentShader) {
  let program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw gl.getProgramInfoLog(program)

  return program
}

export default {Program, createProgram};
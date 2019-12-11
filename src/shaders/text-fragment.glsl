precision mediump float;

varying vec2 v_texcoord;
uniform sampler2D u_texture;
uniform vec4 u_color;

void main() {
  vec4 color = texture2D(u_texture, v_texcoord) * u_color;
  if (color.a < 0.1) {
    discard;
  }
  gl_FragColor = color;
}

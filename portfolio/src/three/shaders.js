// Custom vertex/fragment pairs for the three card materials (front,
// back, edge). The front reads a project texture in "cover" mode and
// overlays a Balatro-style reflective streak derived from the view
// vector reflected across the surface normal — no static highlight
// texture, it's computed per-pixel. The back renders a procedural
// diagonal tile pattern (a nod to the roof tiles of home) instead of a
// painted texture. The edge is a simple view-dependent gradient.

export const cardVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const streakFunction = /* glsl */ `
  float streak(vec3 normal, vec3 viewDir, vec2 uv, float time) {
    vec3 reflected = reflect(-viewDir, normal);
    float sweepA = dot(reflected.xy, vec2(0.7, 0.7)) + uv.x + uv.y;
    float sweepB = dot(reflected.xy, vec2(0.7, -0.7)) + uv.x - uv.y + 0.35;
    float a = smoothstep(0.92, 1.0, fract(sweepA * 0.6));
    float b = smoothstep(0.94, 1.0, fract(sweepB * 0.6));
    return clamp(a + b * 0.6, 0.0, 1.0);
  }
`;

export const cardFrontFragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 cardAspect;
  uniform vec2 textureAspect;
  uniform float hover;
  uniform vec3 accentColor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  ${streakFunction}

  vec2 coverUv(vec2 uv, vec2 cardSize, vec2 texSize) {
    float cardR = cardSize.x / cardSize.y;
    float texR = texSize.x / texSize.y;
    vec2 scale = cardR > texR ? vec2(1.0, texR / cardR) : vec2(cardR / texR, 1.0);
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    vec2 uv = coverUv(vUv, cardAspect, textureAspect);
    vec3 base = texture2D(map, clamp(uv, 0.0, 1.0)).rgb;

    float s = streak(vNormal, vViewDir, vUv, 0.0);
    vec3 streakColor = mix(vec3(1.0), accentColor, 0.35);
    vec3 color = base + streakColor * s * (0.35 + hover * 0.4);

    float rim = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), 3.0);
    color += accentColor * rim * 0.25;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const cardBackFragmentShader = /* glsl */ `
  uniform vec3 baseColor;
  uniform vec3 accentColor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  ${streakFunction}

  // Distance-field roof-tile lattice: overlapping diagonal rows of
  // rounded lozenges, faked as a normal-mapped-looking relief purely
  // from grid math (no texture asset).
  float tilePattern(vec2 uv) {
    vec2 grid = uv * vec2(9.0, 14.0);
    grid.x += floor(grid.y) * 0.5;
    vec2 cell = fract(grid) - 0.5;
    float d = length(cell * vec2(1.0, 1.35));
    float tile = smoothstep(0.42, 0.36, d);
    float seam = smoothstep(0.46, 0.44, d) - smoothstep(0.5, 0.48, d);
    return tile * 0.85 + seam * 0.5;
  }

  void main() {
    float relief = tilePattern(vUv);
    vec3 color = mix(baseColor * 0.7, baseColor * 1.15, relief);

    float s = streak(vNormal, vViewDir, vUv, 0.0);
    color += accentColor * s * 0.2;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const cardEdgeFragmentShader = /* glsl */ `
  uniform vec3 accentColor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float facing = clamp(dot(vNormal, vViewDir), -1.0, 1.0);
    float glow = smoothstep(-0.2, 1.0, facing);
    vec3 color = mix(vec3(0.05, 0.06, 0.08), accentColor, glow * 0.55);
    gl_FragColor = vec4(color, 1.0);
  }
`;

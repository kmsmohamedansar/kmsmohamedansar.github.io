// Each star carries two resting positions — a tight spiral-galaxy
// formation and a dispersed scatter formation — baked in as vertex
// attributes at build time. uMorph (0..1, driven by scroll progress)
// blends between them per-vertex, so "the galaxy pulls apart into open
// space as you scroll" costs one mix() per star, not a rebuilt buffer.

export const starVertexShader = /* glsl */ `
  attribute vec3 spiralPosition;
  attribute vec3 scatterPosition;
  attribute float phase;
  attribute float sizeScale;
  attribute float tint;

  uniform float uMorph;
  uniform float uTime;
  uniform float uPixelRatio;

  varying float vTwinkle;
  varying float vTint;
  varying float vFade;

  vec3 rotateY(vec3 p, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
  }

  void main() {
    // The spiral half keeps a slow independent spin (a living galaxy,
    // not a frozen poster) while the scattered half drifts far more
    // slowly — both fold into the same rotateY so there's one
    // continuous motion, not a hard cut when uMorph crosses over.
    vec3 spun = rotateY(spiralPosition, uTime * 0.015 * (1.0 - spiralPosition.y * 0.0));
    vec3 driftScatter = rotateY(scatterPosition, uTime * 0.004);
    vec3 pos = mix(spun, driftScatter, uMorph);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float dist = -mvPosition.z;
    gl_PointSize = sizeScale * uPixelRatio * (5.0 / max(dist, 1.0));

    vTwinkle = 0.55 + 0.45 * sin(uTime * 0.6 + phase);
    vTint = tint;
    // Stars fade in very slightly as they scatter so the field never
    // reads as visually louder once dispersed than it did tight —
    // point count is constant, only spread changes.
    vFade = mix(1.0, 0.82, uMorph);
  }
`;

export const starFragmentShader = /* glsl */ `
  uniform vec3 uColorWhite;
  uniform vec3 uColorAccent;

  varying float vTwinkle;
  varying float vTint;
  varying float vFade;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d);
    if (alpha <= 0.001) discard;

    vec3 color = mix(uColorWhite, uColorAccent, vTint);
    gl_FragColor = vec4(color, alpha * vTwinkle * vFade);
  }
`;

// Custom point-sprite shader for the background starfield. A plain
// THREE.PointsMaterial can't vary per-star opacity over time, which is
// what a twinkle needs — this pair adds a per-star phase/speed pair
// (so each star twinkles on its own clock, not in lockstep) and draws
// a sharp anti-aliased disc instead of a blurry gradient sprite, so
// stars read as points of light rather than soft dots even at their
// smaller sizes.

export const starVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aBrightness;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vBrightness;
  varying float vTwinkle;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // Perspective-correct sizing so distant stars are smaller, the
    // same 1/-z falloff a real point light source would have. Capped:
    // stars are sampled no closer than 40 world units from the origin,
    // but a camera that itself roams close to that inner shell (the
    // explorer's free orbit, unlike the backdrop's fixed scroll path)
    // can end up with a star nearly on the view axis at close to that
    // minimum distance — without a ceiling here that reads as a huge
    // out-of-place white disc instead of a point of light.
    gl_PointSize = min(aSize * uPixelRatio * (140.0 / max(-mvPosition.z, 1.0)), 18.0 * uPixelRatio);
    vBrightness = aBrightness;
    vTwinkle = 0.55 + 0.45 * sin(uTime * aSpeed + aPhase);
  }
`;

export const starFragmentShader = /* glsl */ `
  varying float vBrightness;
  varying float vTwinkle;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;
    // A tight solid core with a short anti-aliased edge instead of a
    // wide soft gradient — this is the fix for stars reading as fuzzy
    // "dots": most of the sprite's radius is now full opacity.
    float core = 1.0 - smoothstep(0.55, 1.0, d);
    if (core <= 0.0) discard;
    float alpha = core * vBrightness * vTwinkle;
    vec3 color = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 1.0, 1.0), vBrightness);
    gl_FragColor = vec4(color, alpha);
  }
`;

// The homepage water plane: a single origin sends out real waves —
// each one a raised, Gaussian-banded ring with a fine oscillation
// riding inside it, amplitude and band-width easing as it travels,
// and an angle-dependent wobble so the ring reads as uneven, natural
// water rather than a perfect circle. Height comes purely from this
// function, sampled at neighbor points to build a real surface
// normal (portable everywhere — no derivative-extension dependency),
// so the "wave" you see is actual displaced geometry lit like water,
// not a flat drawn line.
export const waterVertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uOrigin;
  uniform float uMaxR;
  uniform float uCyclePeriod;
  uniform float uStartOffsets[5];
  uniform float uSeeds[5];

  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  float rippleHeight(vec2 p) {
    vec2 d = p - uOrigin;
    float dist = length(d);
    float angle = atan(d.y, d.x);
    float total = 0.0;
    for (int i = 0; i < 5; i++) {
      float phase = mod(uTime + uStartOffsets[i], uCyclePeriod) / uCyclePeriod;
      float r = phase * uMaxR;
      float seed = uSeeds[i];
      float wobble = sin(angle * 4.0 + seed + uTime * 0.0003) * 4.5 * (1.0 - phase * 0.55)
                   + sin(angle * 7.0 - seed * 1.4 + uTime * 0.00022) * 2.2 * (1.0 - phase * 0.35)
                   + sin(angle * 13.0 + seed * 0.6) * 1.1;
      float ringDist = abs(dist - (r + wobble));
      float ringWidth = 12.0 + phase * 20.0;
      float band = exp(-(ringDist * ringDist) / (ringWidth * ringWidth));
      float amp = (1.0 - phase) * 6.5;
      total += amp * band;
    }
    return total;
  }

  void main() {
    vec3 pos = position;
    float eps = 1.5;
    float h = rippleHeight(pos.xy);
    float hL = rippleHeight(pos.xy - vec2(eps, 0.0));
    float hR = rippleHeight(pos.xy + vec2(eps, 0.0));
    float hD = rippleHeight(pos.xy - vec2(0.0, eps));
    float hU = rippleHeight(pos.xy + vec2(0.0, eps));
    vec3 tangentX = vec3(2.0 * eps, 0.0, hR - hL);
    vec3 tangentY = vec3(0.0, 2.0 * eps, hU - hD);
    vec3 objNormal = normalize(cross(tangentX, tangentY));

    pos.z += h;
    vHeight = h;
    vNormal = normalize(normalMatrix * objNormal);
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Lit like real water: a fixed key light for diffuse + a tight
// specular term that glints along each ripple's raised crest (the
// "light catching a wave" look), a height-driven tint from pale to a
// brighter cyan at the crest, and a slow sine-product caustic drift
// for the shifting-light feel of shallow water — everything mixed
// mostly back toward white so it stays light and bright, not saturated.
export const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uLightDir;
  uniform vec3 uColorLow;
  uniform vec3 uColorHigh;

  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 light = normalize(uLightDir);
    float diff = clamp(dot(n, light), 0.0, 1.0);
    vec3 halfDir = normalize(light + vec3(0.0, 0.0, 1.0));
    float spec = pow(clamp(dot(n, halfDir), 0.0, 1.0), 60.0);

    vec3 waterColor = mix(uColorLow, uColorHigh, clamp(vHeight * 0.09 + 0.5, 0.0, 1.0));
    vec3 tint = mix(vec3(1.0), waterColor, 0.22);

    float caustic = sin(vWorldPos.x * 0.012 + uTime * 0.00035) * sin(vWorldPos.y * 0.015 - uTime * 0.0003);
    caustic = smoothstep(0.3, 1.0, caustic) * 0.05;

    vec3 color = tint + vec3(0.03) * diff + vec3(0.4) * spec + vec3(caustic);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

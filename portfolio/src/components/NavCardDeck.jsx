import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { HERO_DECK } from "../data/content";
import { buildCardGeometry } from "../three/cardGeometry";
import { buildNavCardTexture } from "../three/cardTexture";
import { cardVertexShader, cardFrontFragmentShader, cardBackFragmentShader, cardEdgeFragmentShader } from "../three/shaders";

const CARD_W = 1.5;
const CARD_H = 2.1;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function goTo(hash) {
  window.location.hash = hash.replace(/^#/, "");
}

// Card textures are built synchronously (one canvas draw per card),
// but four of the five now paint a real picture onto that canvas —
// which means those images need to already be decoded before the
// texture build runs. Loading them all up front, before the scene is
// constructed, keeps buildNavCardTexture a plain synchronous function
// instead of threading async state through every card mesh.
function preloadCardImages(cards) {
  return Promise.all(
    cards.map(
      (card) =>
        new Promise((resolve) => {
          if (!card.image) {
            resolve(null);
            return;
          }
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = card.image;
        })
    )
  );
}

/**
 * The whole landing view: five procedurally-built cards (EMET, Now,
 * Before, Work, Contact), each its own destination. Same card-deck
 * machinery as a Balatro-style build — sampled rounded-rect geometry,
 * hand-written GLSL front/back/edge shaders, raycast hover tilt — but
 * clicking a card swaps the app's current view (via the URL hash)
 * instead of scrolling to it; there's no document scroll to speak of.
 */
export default function NavCardDeck() {
  const mountRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let supportsWebGL = false;
    try {
      const test = document.createElement("canvas");
      supportsWebGL = !!(test.getContext("webgl2") || test.getContext("webgl"));
    } catch {
      supportsWebGL = false;
    }
    if (reduced || !supportsWebGL) {
      setFailed(true);
      return;
    }

    let cancelled = false;
    let cleanup = () => {};

    preloadCardImages(HERO_DECK).then((images) => {
      if (cancelled) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const CAMERA_Z = 8.6;
      const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
      camera.position.set(0, 0.2, CAMERA_Z);
      camera.lookAt(0, 0, 0);

      const geometry = buildCardGeometry({ width: CARD_W, height: CARD_H, depth: 0.03, radius: 0.1 });
      const n = HERO_DECK.length;
      const mid = (n - 1) / 2;

      // The fan's horizontal spread has to fit inside whatever's
      // actually visible at this aspect ratio — on a narrow portrait
      // screen the frustum is much narrower than on desktop, so a fixed
      // spacing would push the outer cards (EMET, Contact) off-frame
      // entirely. 1.62 is the spacing that looks right on a desktop-wide
      // frustum; only pull it in when the available width would
      // otherwise clip the outer cards.
      const vFovHalfTan = Math.tan((camera.fov * Math.PI) / 360);
      const availableHalfWidth = CAMERA_Z * vFovHalfTan * camera.aspect;
      const spacing = Math.min(1.62, Math.max(0.62, availableHalfWidth / mid - CARD_W * 0.3));

      const cards = HERO_DECK.map((card, index) => {
        const texture = buildNavCardTexture(card, { accent: card.accent, image: images[index], imageFit: card.imageFit });
        const accent = new THREE.Color(card.accent);

        const frontMat = new THREE.ShaderMaterial({
          vertexShader: cardVertexShader,
          fragmentShader: cardFrontFragmentShader,
          uniforms: {
            map: { value: texture },
            cardAspect: { value: new THREE.Vector2(CARD_W, CARD_H) },
            textureAspect: { value: new THREE.Vector2(512, 716) },
            hover: { value: 0 },
            accentColor: { value: accent },
          },
        });
        const backMat = new THREE.ShaderMaterial({
          vertexShader: cardVertexShader,
          fragmentShader: cardBackFragmentShader,
          uniforms: { baseColor: { value: new THREE.Color("#151a20") }, accentColor: { value: accent } },
        });
        const edgeMat = new THREE.ShaderMaterial({
          vertexShader: cardVertexShader,
          fragmentShader: cardEdgeFragmentShader,
          uniforms: { accentColor: { value: accent } },
        });

        const mesh = new THREE.Mesh(geometry, [frontMat, backMat, edgeMat]);

        const offset = index - mid;
        const fanPosition = new THREE.Vector3(offset * spacing, -Math.abs(offset) * 0.32, -Math.abs(offset) * 0.55);
        const fanRotation = new THREE.Euler(0, 0, -offset * 0.1);
        const dealStart = new THREE.Vector3(0, -4.2, -2);

        mesh.position.copy(dealStart);
        mesh.rotation.set(0.5, 0, (Math.random() - 0.5) * 0.7);
        scene.add(mesh);

        return {
          mesh,
          card,
          index,
          frontMat,
          fanPosition,
          fanRotation,
          dealStart,
          dealDelay: index * 90,
          pulseStart: null,
          hoverAmount: 0,
          seed: Math.random() * 10,
        };
      });

      const raycaster = new THREE.Raycaster();
      const pointerNDC = new THREE.Vector2(0, 0);
      const pointerTarget = new THREE.Vector2(0, 0);
      let hoveredCard = null;
      let startTime = performance.now();
      let rafId;

      function onPointerMove(e) {
        const rect = container.getBoundingClientRect();
        pointerTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerTarget.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }

      function onClick() {
        if (hoveredCard) {
          hoveredCard.pulseStart = performance.now();
          goTo(hoveredCard.card.go);
        }
      }

      function resize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("click", onClick);

      function tick(now) {
        rafId = requestAnimationFrame(tick);
        const elapsed = now - startTime;
        const t = elapsed / 1000;

        pointerNDC.lerp(pointerTarget, 0.08);

        camera.position.x += (pointerNDC.x * 0.4 - camera.position.x) * 0.04;
        camera.position.y += (0.2 + pointerNDC.y * 0.22 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);

        // Hit-testing uses the raw pointer position, not the lerped one
        // below — pointerNDC is smoothed for the cosmetic camera
        // parallax/tilt and lags real cursor movement by design, which
        // is fine for a slow drift but means a quick move-then-click
        // (exactly what a click is) can raycast against where the
        // cursor recently *was* rather than where it now is, hovering
        // — and therefore selecting — the wrong card.
        raycaster.setFromCamera(pointerTarget, camera);
        const hits = raycaster.intersectObjects(cards.map((c) => c.mesh));
        const hit = hits[0]?.object;
        const nextHovered = cards.find((c) => c.mesh === hit) || null;
        if (nextHovered !== hoveredCard) {
          hoveredCard = nextHovered;
          container.style.cursor = hoveredCard ? "pointer" : "default";
        }

        for (const card of cards) {
          const dealProgress = Math.min(1, Math.max(0, (elapsed - card.dealDelay) / 700));
          const eased = easeOutCubic(dealProgress);

          const breathe = Math.sin(t * 0.8 + card.seed) * 0.025 + Math.cos(t * 0.55 + card.seed) * 0.018;
          const dealt = new THREE.Vector3().lerpVectors(card.dealStart, card.fanPosition, eased);
          dealt.y += breathe;
          card.mesh.position.lerp(dealt, dealProgress < 1 ? 1 : 0.14);

          const hoverLift = card === hoveredCard ? 0.16 : 0;
          card.mesh.userData.lift = card.mesh.userData.lift || 0;
          card.mesh.userData.lift += (hoverLift - card.mesh.userData.lift) * 0.18;
          card.mesh.position.y += card.mesh.userData.lift;

          const tiltX = card === hoveredCard ? -pointerNDC.y * 0.2 : 0;
          const tiltY = card === hoveredCard ? pointerNDC.x * 0.26 : 0;

          const qTarget = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              THREE.MathUtils.lerp(0.5 * (1 - eased), card.fanRotation.x + tiltX, dealProgress < 1 ? eased : 1),
              THREE.MathUtils.lerp(0, card.fanRotation.y + tiltY, eased),
              THREE.MathUtils.lerp(card.mesh.rotation.z, card.fanRotation.z, eased)
            )
          );
          card.mesh.quaternion.slerp(qTarget, dealProgress < 1 ? 1 : 0.16);

          let pulseScale = 1;
          if (card.pulseStart !== null) {
            const pt = (now - card.pulseStart) / 420;
            if (pt >= 1) {
              card.pulseStart = null;
            } else {
              pulseScale = 1 + Math.sin(pt * Math.PI) * 0.1;
            }
          }
          const targetScale = (dealProgress < 1 ? eased : 1) * pulseScale;
          const currentScale = card.mesh.scale.x;
          card.mesh.scale.setScalar(currentScale + (targetScale - currentScale) * (dealProgress < 1 ? 1 : 0.22));

          card.hoverAmount += ((card === hoveredCard ? 1 : 0) - card.hoverAmount) * 0.15;
          card.frontMat.uniforms.hover.value = card.hoverAmount;
        }

        renderer.render(scene, camera);
      }
      rafId = requestAnimationFrame(tick);
      setReady(true);

      cleanup = () => {
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("click", onClick);
        for (const card of cards) {
          card.frontMat.uniforms.map.value?.dispose();
          card.frontMat.dispose();
          card.mesh.material[1].dispose();
          card.mesh.material[2].dispose();
        }
        geometry.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      };
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div className="relative h-full w-full flex items-center justify-center">
      {!failed && (
        <>
          {/* The canvas deck is decorative to a screen reader, so the
              same five destinations exist as real links alongside it. */}
          <nav aria-label="Jump to section" className="sr-only">
            <ul>
              {HERO_DECK.map((card) => (
                <li key={card.id}>
                  <a href={card.go}>{card.title}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div ref={mountRef} className="h-full w-full" aria-hidden={!ready} />
        </>
      )}
      {failed && (
        <nav aria-label="Jump to section" className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {HERO_DECK.map((card) => (
            <a
              key={card.id}
              href={card.go}
              className="group block rounded-xl border border-white/10 hover:border-cyan/40 px-5 py-6 transition-colors"
            >
              <span className="font-mono text-[.62rem] uppercase tracking-[.14em] text-cyan/70">{card.kicker}</span>
              <p className="mt-2 font-display text-xl font-semibold text-[color:var(--ink-50)] group-hover:text-cyan transition-colors">
                {card.title}
              </p>
              <p className="mt-1 text-[.72rem] text-[color:var(--ink-400)]">{card.tagline}</p>
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}

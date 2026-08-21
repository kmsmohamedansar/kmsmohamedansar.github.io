import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowUpRight, X } from "lucide-react";
import { buildCardGeometry } from "../three/cardGeometry";
import { buildProjectTexture } from "../three/cardTexture";
import { cardVertexShader, cardFrontFragmentShader, cardBackFragmentShader, cardEdgeFragmentShader } from "../three/shaders";

const ACCENT = new THREE.Color("#22d3ee");
const CARD_W = 1.28;
const CARD_H = 1.8;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function fanTransform(index, total) {
  const spread = Math.min(total - 1, 8);
  const t = total > 1 ? index / (total - 1) : 0.5;
  const angle = (t - 0.5) * Math.min(0.85, spread * 0.11);
  const x = (t - 0.5) * Math.min(9.2, spread * 1.15);
  const y = -Math.abs(t - 0.5) * 0.9 + Math.sin(index * 1.7) * 0.04;
  return {
    position: new THREE.Vector3(x, y, -Math.abs(t - 0.5) * 0.4),
    rotation: new THREE.Euler(0, 0, -angle),
  };
}

/**
 * Balatro-inspired card-deck scene for the Work section: procedurally
 * built card meshes dealt out along Catmull-Rom paths, raycast hover
 * tilt, mouse parallax, and a click-to-focus detail view. Falls back to
 * nothing (caller renders the plain list instead) when WebGL is
 * unavailable or the user prefers reduced motion.
 */
export default function CardDeckScene({ projects, onFallback }) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [ready, setReady] = useState(false);

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
      onFallback?.();
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, 0.3, 7.4);
    camera.lookAt(0, 0, 0);

    const geometry = buildCardGeometry({ width: CARD_W, height: CARD_H, depth: 0.028, radius: 0.09 });

    const cards = projects.map((project, index) => {
      const texture = buildProjectTexture(project, { accent: project.warm ? "#f2c78a" : "#22d3ee" });
      const accent = project.warm ? new THREE.Color("#f2c78a") : ACCENT;

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
        uniforms: {
          baseColor: { value: new THREE.Color("#151a20") },
          accentColor: { value: accent },
        },
      });
      const edgeMat = new THREE.ShaderMaterial({
        vertexShader: cardVertexShader,
        fragmentShader: cardEdgeFragmentShader,
        uniforms: { accentColor: { value: accent } },
      });

      const mesh = new THREE.Mesh(geometry, [frontMat, backMat, edgeMat]);
      const fan = fanTransform(index, projects.length);
      const dealStart = new THREE.Vector3(0, -3.4, -1.5);

      mesh.position.copy(dealStart);
      mesh.rotation.set(0.4, 0, (Math.random() - 0.5) * 0.6);
      scene.add(mesh);

      return {
        mesh,
        project,
        index,
        frontMat,
        fanPosition: fan.position,
        fanRotation: fan.rotation,
        dealStart,
        dealDelay: index * 70,
        hoverAmount: 0,
        seed: Math.random() * 10,
      };
    });

    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2(0, 0);
    const pointerTarget = new THREE.Vector2(0, 0);
    let hoveredCard = null;
    let selectedCard = null;
    let startTime = performance.now();
    let rafId;

    function onPointerMove(e) {
      const rect = container.getBoundingClientRect();
      pointerTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerTarget.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onClick() {
      if (hoveredCard && !selectedCard) {
        selectedCard = hoveredCard;
        setSelected({ project: selectedCard.project, index: selectedCard.index });
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

      camera.position.x += (pointerNDC.x * 0.5 - camera.position.x) * 0.04;
      camera.position.y += (0.3 + pointerNDC.y * 0.28 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      raycaster.setFromCamera(pointerNDC, camera);
      if (!selectedCard) {
        const hits = raycaster.intersectObjects(cards.map((c) => c.mesh));
        const hit = hits[0]?.object;
        const nextHovered = cards.find((c) => c.mesh === hit) || null;
        if (nextHovered !== hoveredCard) {
          hoveredCard = nextHovered;
          container.style.cursor = hoveredCard ? "pointer" : "default";
        }
      }

      for (const card of cards) {
        const dealProgress = Math.min(1, Math.max(0, (elapsed - card.dealDelay) / 650));
        const eased = easeOutCubic(dealProgress);

        const isSelected = selectedCard === card;
        const isDimmed = selectedCard && !isSelected;

        let targetPos = card.fanPosition;
        let targetRot = card.fanRotation;
        let targetScale = 1;

        if (isSelected) {
          targetPos = new THREE.Vector3(-1.15, 0.1, 1.8);
          targetRot = new THREE.Euler(0, 0.32, 0);
          targetScale = 1.55;
        } else if (isDimmed) {
          targetPos = new THREE.Vector3(card.fanPosition.x * 1.6, card.fanPosition.y - 0.5, -2.2);
          targetRot = card.fanRotation;
          targetScale = 0.8;
        }

        const breathe = selectedCard
          ? 0
          : Math.sin(t * 0.9 + card.seed) * 0.02 + Math.cos(t * 0.6 + card.seed) * 0.015;

        const dealt = new THREE.Vector3().lerpVectors(card.dealStart, targetPos, eased);
        dealt.y += breathe;

        card.mesh.position.lerp(dealt, dealProgress < 1 ? 1 : 0.14);

        const hoverLift = card === hoveredCard && !selectedCard ? 0.14 : 0;
        card.mesh.position.y += (hoverLift - (card.mesh.userData.lift || 0)) * 0.2;
        card.mesh.userData.lift = card.mesh.userData.lift || 0;
        card.mesh.userData.lift += (hoverLift - card.mesh.userData.lift) * 0.18;

        const tiltX = card === hoveredCard && !selectedCard ? -pointerNDC.y * 0.22 : 0;
        const tiltY = card === hoveredCard && !selectedCard ? pointerNDC.x * 0.28 : 0;

        const qTarget = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            THREE.MathUtils.lerp(0.4 * (1 - eased), targetRot.x + tiltX, dealProgress < 1 ? eased : 1),
            THREE.MathUtils.lerp(0, targetRot.y + tiltY, eased),
            THREE.MathUtils.lerp(card.mesh.rotation.z, targetRot.z, eased)
          )
        );
        card.mesh.quaternion.slerp(qTarget, dealProgress < 1 ? 1 : 0.16);

        const scaleLerp = dealProgress < 1 ? eased : 0.14;
        const currentScale = card.mesh.scale.x;
        card.mesh.scale.setScalar(currentScale + (targetScale - currentScale) * scaleLerp);

        card.hoverAmount += ((card === hoveredCard && !selectedCard ? 1 : 0) - card.hoverAmount) * 0.15;
        card.frontMat.uniforms.hover.value = card.hoverAmount;
      }

      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(tick);

    stateRef.current = {
      clearSelection: () => {
        selectedCard = null;
        setSelected(null);
      },
    };
    setReady(true);

    return () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  return (
    <div className="relative">
      <div ref={mountRef} className="h-[440px] md:h-[560px] w-full" aria-hidden={!ready} />
      {selected && (
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="relative pointer-events-auto max-w-sm ml-auto mr-4 md:mr-10 bg-[color:var(--surface-1,rgba(10,12,15,.82))] backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <button
              onClick={() => stateRef.current?.clearSelection()}
              className="absolute top-3 right-3 text-slate-500 hover:text-cyan transition-colors"
              aria-label="Close project detail"
            >
              <X size={16} />
            </button>
            {selected.project.kicker && (
              <p className="font-mono text-[.65rem] uppercase tracking-[.14em] text-cyan mb-2">{selected.project.kicker}</p>
            )}
            <h3 className="font-display text-xl font-semibold text-[color:var(--ink-50)] mb-2">{selected.project.title}</h3>
            <p className="text-[.85rem] text-[color:var(--ink-400)] leading-relaxed mb-4">{selected.project.body}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {(selected.project.tags || []).map((tag) => (
                <span key={tag} className="font-mono text-[.62rem] uppercase tracking-wide text-slate-500 border border-white/10 rounded px-2 py-1">
                  {tag}
                </span>
              ))}
            </div>
            {selected.project.links?.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1.5 text-[.85rem] font-medium text-cyan hover:underline"
              >
                {link.label} <ArrowUpRight size={14} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

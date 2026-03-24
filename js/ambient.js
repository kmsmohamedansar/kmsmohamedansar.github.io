/**
 * Premium ambient canvas: grid + soft nodes + slow drift.
 * Respects prefers-reduced-motion; lighter on mobile.
 */
(function () {
  const canvas = document.getElementById("ambient-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  let w = 0;
  let h = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let nodes = [];
  let tick = 0;
  let mx = 0;
  let my = 0;
  let targetMx = 0;
  let targetMy = 0;

  const COLORS = {
    grid: "rgba(79, 209, 255, 0.035)",
    gridStrong: "rgba(79, 209, 255, 0.06)",
    node: "rgba(79, 209, 255, 0.25)",
    line: "rgba(124, 140, 255, 0.08)",
    glow: "rgba(61, 169, 252, 0.12)"
  };

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initNodes();
  }

  function initNodes() {
    const count = reduceMotion ? 0 : isMobile ? 10 : 22;
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 1.2 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function drawGrid() {
    const step = isMobile ? 56 : 48;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();

    // Accent cross at origin feel (slow shift)
    if (!reduceMotion) {
      const ox = (tick * 0.15) % step;
      ctx.strokeStyle = COLORS.gridStrong;
      ctx.beginPath();
      for (let x = -step + ox; x <= w + step; x += step * 3) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();
    }
  }

  function drawGlow() {
    const gx = mx * 0.08 + w * 0.72;
    const gy = my * 0.06 + h * 0.28;
    const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.45);
    grd.addColorStop(0, "rgba(61, 169, 252, 0.14)");
    grd.addColorStop(0.35, "rgba(124, 140, 255, 0.05)");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  }

  function drawNodes() {
    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    });

    const maxDist = isMobile ? 120 : 160;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.12;
          ctx.strokeStyle = `rgba(124, 140, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    nodes.forEach((n) => {
      const pulse = 0.65 + 0.35 * Math.sin(tick * 0.02 + n.phase);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.node;
      ctx.fill();
    });
  }

  function frame() {
    tick++;
    mx += (targetMx - mx) * 0.04;
    my += (targetMy - my) * 0.04;

    ctx.clearRect(0, 0, w, h);
    drawGlow();
    drawGrid();

    if (!reduceMotion && nodes.length) {
      drawNodes();
    }

    if (!reduceMotion) {
      requestAnimationFrame(frame);
    }
  }

  function staticFrame() {
    ctx.clearRect(0, 0, w, h);
    drawGlow();
    drawGrid();
  }

  window.addEventListener("resize", () => {
    resize();
    if (reduceMotion) staticFrame();
  });

  document.addEventListener(
    "mousemove",
    (e) => {
      targetMx = e.clientX - w / 2;
      targetMy = e.clientY - h / 2;
    },
    { passive: true }
  );

  resize();

  if (reduceMotion) {
    staticFrame();
  } else {
    requestAnimationFrame(frame);
  }
})();

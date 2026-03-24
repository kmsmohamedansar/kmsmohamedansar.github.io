/**
 * Telemetry-inspired ambient canvas: grid, flow curves, signal samples.
 * Abstract "race engineering UI", no literal racing imagery.
 * Respects prefers-reduced-motion; lighter on narrow viewports.
 */
(function () {
  const canvas = document.getElementById("ambient-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mqMobile = window.matchMedia("(max-width: 768px)");
  let isMobile = mqMobile.matches;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let tick = 0;
  let mx = 0;
  let my = 0;
  let targetMx = 0;
  let targetMy = 0;

  const COLORS = {
    grid: "rgba(20, 24, 32, 0.045)",
    gridAccent: "rgba(74, 111, 138, 0.07)",
    trace: "rgba(20, 24, 32, 0.07)",
    traceBlue: "rgba(74, 111, 138, 0.08)",
    sample: "rgba(74, 111, 138, 0.28)",
    sampleCore: "rgba(255, 255, 255, 0.75)",
    connect: "rgba(74, 111, 138, 0.05)"
  };

  /** @type {{ pts: {x:number,y:number}[], len: number }[]} */
  let paths = [];
  /** @type {{ pathIndex: number, t: number, speed: number }[]} */
  let samples = [];

  function buildPaths() {
    paths = [];
    const pad = Math.min(w, h) * 0.08;
    const W = w - pad * 2;
    const H = h - pad * 2;
    const baseX = pad;
    const baseY = pad;

    const curves = [
      [
        { x: baseX + W * 0.02, y: baseY + H * 0.72 },
        { x: baseX + W * 0.22, y: baseY + H * 0.35 },
        { x: baseX + W * 0.48, y: baseY + H * 0.55 },
        { x: baseX + W * 0.78, y: baseY + H * 0.22 },
        { x: baseX + W * 0.96, y: baseY + H * 0.48 }
      ],
      [
        { x: baseX + W * 0.08, y: baseY + H * 0.18 },
        { x: baseX + W * 0.35, y: baseY + H * 0.42 },
        { x: baseX + W * 0.62, y: baseY + H * 0.28 },
        { x: baseX + W * 0.88, y: baseY + H * 0.65 }
      ],
      [
        { x: baseX + W * 0.95, y: baseY + H * 0.12 },
        { x: baseX + W * 0.7, y: baseY + H * 0.38 },
        { x: baseX + W * 0.45, y: baseY + H * 0.82 },
        { x: baseX + W * 0.15, y: baseY + H * 0.58 }
      ]
    ];

    if (isMobile) curves.splice(1, 1);

    curves.forEach((ctrl) => {
      const pts = [];
      const segs = ctrl.length - 1;
      const stepsPerSeg = isMobile ? 14 : 22;
      for (let s = 0; s < segs; s++) {
        const p0 = ctrl[s];
        const p1 = ctrl[s + 1];
        const midx = (p0.x + p1.x) / 2 + (s % 2 === 0 ? 1 : -1) * W * 0.022;
        const midy = (p0.y + p1.y) / 2;
        for (let i = 0; i <= stepsPerSeg; i++) {
          const t = i / stepsPerSeg;
          const ox = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * midx + t * t * p1.x;
          const oy = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * midy + t * t * p1.y;
          pts.push({ x: ox, y: oy });
        }
      }
      let len = 0;
      for (let i = 1; i < pts.length; i++) {
        len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      }
      paths.push({ pts, len });
    });
  }

  function pointOnPath(path, t) {
    const { pts, len } = path;
    if (!pts.length) return { x: 0, y: 0 };
    const target = ((t % 1) + 1) % 1) * len;
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (acc + seg >= target) {
        const u = seg > 0 ? (target - acc) / seg : 0;
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
      acc += seg;
    }
    return pts[pts.length - 1];
  }

  function initSamples() {
    samples = [];
    if (reduceMotion || !paths.length) return;
    const count = isMobile ? 5 : 11;
    for (let i = 0; i < count; i++) {
      samples.push({
        pathIndex: i % paths.length,
        t: Math.random(),
        speed: 0.00015 + Math.random() * 0.00022
      });
    }
  }

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildPaths();
    initSamples();
  }

  function drawGrid() {
    const step = isMobile ? 64 : 52;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const off = (tick * 0.12) % step;
    for (let x = -step + off; x <= w + step; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();

    if (!reduceMotion) {
      ctx.strokeStyle = COLORS.gridAccent;
      ctx.beginPath();
      for (let x = off + step * 2; x <= w; x += step * 4) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();
    }
  }

  function drawGlow() {
    const gx = w * 0.52 + targetMx * 0.04;
    const gy = h * 0.28 + targetMy * 0.035;
    const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.48);
    grd.addColorStop(0, "rgba(255, 255, 255, 0.5)");
    grd.addColorStop(0.22, "rgba(240, 241, 239, 0.2)");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  }

  function drawPaths(staticOnly) {
    paths.forEach((path, idx) => {
      const { pts } = path;
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = idx % 2 === 0 ? COLORS.trace : COLORS.traceBlue;
      ctx.lineWidth = idx === 0 ? 1.1 : 0.9;
      if (!staticOnly && !reduceMotion) {
        ctx.setLineDash([4 + idx * 2, 12 + idx * 3]);
        ctx.lineDashOffset = -(tick * (0.35 + idx * 0.15));
      } else {
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });
  }

  function drawSamples() {
    if (reduceMotion || !samples.length) return;
    const positions = [];
    samples.forEach((s) => {
      const path = paths[s.pathIndex];
      if (!path) return;
      s.t = (s.t + s.speed) % 1;
      positions.push(pointOnPath(path, s.t));
    });

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist < (isMobile ? 100 : 140)) {
          const alpha = (1 - dist / (isMobile ? 100 : 140)) * 0.05;
          ctx.strokeStyle = `rgba(74, 111, 138, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    positions.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.sample;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.9, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.sampleCore;
      ctx.fill();
    });
  }

  function frame() {
    tick++;
    mx += (targetMx - mx) * 0.035;
    my += (targetMy - my) * 0.035;

    ctx.clearRect(0, 0, w, h);
    drawGlow();
    drawGrid();
    drawPaths(false);
    drawSamples();

    if (!reduceMotion) {
      requestAnimationFrame(frame);
    }
  }

  function staticFrame() {
    ctx.clearRect(0, 0, w, h);
    drawGlow();
    drawGrid();
    drawPaths(true);
  }

  function onResize() {
    isMobile = mqMobile.matches;
    resize();
    if (reduceMotion) staticFrame();
  }

  window.addEventListener("resize", onResize);

  mqMobile.addEventListener?.("change", (e) => {
    isMobile = e.matches;
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

import { useAnimatedCanvas } from "../lib/useAnimatedCanvas";

/* ============================================================
   EMET — classic terminal rain: falling green glyph columns over
   near-black, the "first IBM computer" mood the CRT chassis already
   leans into. EMET is the one view that stays a full takeover
   outside the continuous-scroll experience, so it keeps its own
   dedicated backdrop instead of the shared starfield.
   ============================================================ */
const MATRIX_GLYPHS = "アイウエオカキクケコサシスセソ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function setupMatrix(width, height) {
  const fontSize = 15;
  const cols = Math.ceil(width / fontSize);
  return {
    fontSize,
    drops: Array.from({ length: cols }, () => Math.random() * -height),
  };
}

function renderMatrix(ctx, width, height, t, state, reduced) {
  const { fontSize, drops } = state;
  if (reduced) {
    ctx.fillStyle = "#04120a";
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = "rgba(4, 18, 10, 0.14)";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
  for (let i = 0; i < drops.length; i++) {
    const x = i * fontSize;
    const y = drops[i];
    const glyph = MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
    ctx.fillStyle = Math.random() > 0.94 ? "rgba(210,255,225,0.9)" : "rgba(52,211,153,0.75)";
    ctx.fillText(glyph, x, y);
    if (!reduced) {
      drops[i] += fontSize * (0.55 + Math.random() * 0.35);
      if (y > height && Math.random() > 0.975) drops[i] = Math.random() * -height * 0.4;
    }
  }
}

export function MatrixBackground() {
  const canvasRef = useAnimatedCanvas(setupMatrix, renderMatrix);
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#04120a]">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

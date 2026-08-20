import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Wraps a CTA in a magnetic pull — the button drifts toward the
 * cursor within its bounds and springs back on leave. `as` picks the
 * rendered element/motion-component so it still works as a link.
 */
export default function MagneticButton({ children, className = "", as: As = motion.a, strength = 0.35, ...props }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spring = { stiffness: 220, damping: 18, mass: 0.4 };
  const springX = useSpring(x, spring);
  const springY = useSpring(y, spring);

  function onMouseMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left - rect.width / 2) * strength);
    y.set((e.clientY - rect.top - rect.height / 2) * strength);
  }
  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <As
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ x: springX, y: springY }}
      className={`magnetic ${className}`}
      {...props}
    >
      {children}
    </As>
  );
}

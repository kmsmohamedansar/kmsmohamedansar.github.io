import { useRef } from "react";
import { ArrowLeft } from "lucide-react";
import InfinityLoop from "./InfinityLoop";

/* The infinity loop that used to open the site, now on a page of its own.
   It's a WebGL shader: thousands of points held in a loop shape. Move the
   pointer over it and they swirl. */
export default function InfinityPage() {
  // The loop scatters as its scroll container scrolls. This page never
  // scrolls, so it stays whole.
  const still = useRef(null);
  return (
    <div className="relative h-full min-h-[100dvh] overflow-hidden bg-[#0b1426]">
      <div ref={still} className="absolute inset-0">
        <InfinityLoop scrollContainerRef={still} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 sm:p-8 bg-gradient-to-t from-[#050911]/85 to-transparent">
        <div className="pointer-events-auto mx-auto max-w-[1180px]">
          <p className="font-mono text-xs uppercase tracking-[.18em] text-[#b9a8ff]">Built with AI · WebGL shader</p>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-semibold text-white">An infinity made of stars</h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[color:var(--ink-200)]">
            Thousands of points, drawn on the graphics card, held in an infinity loop. Move your pointer across it and they
            swirl, then drift back. It used to open this site; now the same dots gather into my name instead.
          </p>
          <a
            href="#ai"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/10"
          >
            <ArrowLeft size={15} /> Back to the site
          </a>
        </div>
      </div>
    </div>
  );
}

export function shouldObserveCompanionInput({ dismissed, reducedMotion, routeHidden, started }) {
  return started && !dismissed && !reducedMotion && !routeHidden;
}

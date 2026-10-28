export function createMotionCueTracker(emit) {
  let moving = false;
  return {
    start() {
      if (moving) return;
      moving = true;
      emit("roll");
    },
    stop() {
      if (!moving) return;
      moving = false;
      emit("arrive");
    },
    reset() {
      moving = false;
    },
  };
}

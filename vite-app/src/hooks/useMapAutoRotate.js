/**
 * useMapAutoRotate.js — Auto-rotate the Mapbox globe until user interaction.
 *
 * Nudges the map center longitude each frame via requestAnimationFrame.
 * Stops on mousedown / touchstart / wheel, resumes after idle timeout.
 */

import { useEffect, useRef, useCallback } from "react";

export default function useMapAutoRotate(mapRef, { speed = 0.01, enabled = true } = {}) {
  const rafId = useRef(null);
  const rotating = useRef(enabled);
  const idleTimer = useRef(null);

  const startRotation = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const rotate = () => {
      if (!rotating.current) return;
      const center = map.getCenter();
      center.lng += speed;
      map.setCenter(center);
      rafId.current = requestAnimationFrame(rotate);
    };
    rafId.current = requestAnimationFrame(rotate);
  }, [mapRef, speed]);

  const stopRotation = useCallback(() => {
    rotating.current = false;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const pauseAndResumeAfter = useCallback(
    (ms = 8000) => {
      stopRotation();
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        rotating.current = true;
        startRotation();
      }, ms);
    },
    [stopRotation, startRotation]
  );

  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || !enabled) return;

    rotating.current = true;
    startRotation();

    const onInteract = () => pauseAndResumeAfter(8000);
    map.on("mousedown", onInteract);
    map.on("touchstart", onInteract);
    map.on("wheel", onInteract);

    return () => {
      stopRotation();
      clearTimeout(idleTimer.current);
      map.off("mousedown", onInteract);
      map.off("touchstart", onInteract);
      map.off("wheel", onInteract);
    };
  }, [mapRef, enabled, startRotation, stopRotation, pauseAndResumeAfter]);

  return { stopRotation, startRotation: () => { rotating.current = true; startRotation(); } };
}

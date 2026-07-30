import React, { useEffect, useMemo, useState } from "react";
import { Polyline, type LatLng } from "react-native-maps";
import { withAlpha } from "../../core/theme";
const ROUTE_STEPS = 60;

// Travelling light along the route. Kept in its own leaf component so the
// ticking state never reaches the map, the bottom sheet or the trip panel,
// and so it stops entirely while the pin is being dragged.
function RouteCometBase({
  points,
  accent,
  glow,
  paused,
}: {
  points: LatLng[];
  accent: string;
  glow: string;
  paused: boolean;
}) {
  const [tick, setTick] = useState(0);
  const length = points.length;
  useEffect(() => {
    if (length < 2 || paused) return;
    setTick(0);
    const timer = setInterval(
      () => setTick((value) => (value + 1) % ROUTE_STEPS),
      90,
    );
    return () => clearInterval(timer);
  }, [length, paused]);
  const comet = useMemo(() => {
    if (points.length < 2) return [];
    const span = Math.max(2, Math.round(points.length * 0.16));
    const head = Math.round((tick / ROUTE_STEPS) * (points.length + span));
    const start = Math.max(0, head - span);
    const end = Math.min(points.length, head);
    return end - start > 1 ? points.slice(start, end) : [];
  }, [points, tick]);
  if (comet.length < 2) return null;
  return (
    <>
      <Polyline
        coordinates={comet}
        strokeColor={withAlpha(accent, 0.35)}
        strokeWidth={13}
        lineCap="round"
        lineJoin="round"
      />
      <Polyline
        coordinates={comet}
        strokeColor={withAlpha(glow, 0.9)}
        strokeWidth={4}
        lineCap="round"
        lineJoin="round"
      />
    </>
  );
}
export const RouteComet = React.memo(RouteCometBase);

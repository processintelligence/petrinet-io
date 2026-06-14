/**
 * Soundness property.
 *
 * A workflow net is sound if:
 *   1. For every reachable marking, the final place is eventually reachable.
 *   2. When the final place is marked, no other place is marked.
 *   3. There are no dead transitions.
 *
 * Structural preconditions checked here:
 *   - Exactly one source place (no incoming arcs) acting as the initial place.
 *   - Exactly one sink place (no outgoing arcs) acting as the final place.
 *   - Every node lies on a path from source to sink.
 *
 * Replace the `compute` body with your full reachability-based algorithm.
 */

export const id = 'soundness';
export const label = 'Soundness';

/**
 * @param {object} net - { places, transitions, arcs, initialMarking }
 * @returns {{ value: boolean, display: string }}
 */
export function compute(net) {
  const { places, transitions, arcs } = net;

  if (places.length === 0 || transitions.length === 0) {
    return { value: false, display: 'No' };
  }

  const incomingArcs = new Set(arcs.map((a) => a.target));
  const outgoingArcs = new Set(arcs.map((a) => a.source));

  const sourcePlaces = places.filter((p) => !incomingArcs.has(p.id));
  const sinkPlaces   = places.filter((p) => !outgoingArcs.has(p.id));

  // Soundness requires exactly one source and one sink place
  if (sourcePlaces.length !== 1 || sinkPlaces.length !== 1) {
    return { value: false, display: 'No' };
  }

  const sourceId = sourcePlaces[0].id;
  const sinkId   = sinkPlaces[0].id;

  // Check every node lies on a path from source to sink
  const forwardReachable  = reachableFrom(sourceId, arcs);
  const backwardReachable = reachableFrom(sinkId, arcs, true);

  const allNodeIds = [
    ...places.map((p) => p.id),
    ...transitions.map((t) => t.id),
  ];

  const allOnPath = allNodeIds.every(
    (id) => forwardReachable.has(id) && backwardReachable.has(id)
  );

  return {
    value: allOnPath,
    display: allOnPath ? 'Yes' : 'No',
  };
}

/** BFS over arcs, optionally reversed. */
function reachableFrom(startId, arcs, reverse = false) {
  const adj = {};
  for (const arc of arcs) {
    const from = reverse ? arc.target : arc.source;
    const to   = reverse ? arc.source : arc.target;
    (adj[from] ||= []).push(to);
  }

  const visited = new Set([startId]);
  const queue   = [startId];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const next of adj[cur] || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}
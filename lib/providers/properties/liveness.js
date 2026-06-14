/**
 * Liveness property.
 *
 * A Petri net is live if for every reachable marking and every transition t,
 * there exists a reachable marking from which t can fire.
 *
 * This is a structural approximation: a net is potentially live if every
 * transition is reachable from the initial marking via the flow relation.
 * Replace the `compute` body with your exact algorithm.
 */

export const id = 'liveness';
export const label = 'Liveness';

/**
 * @param {object} net - { places, transitions, arcs, initialMarking }
 * @returns {{ value: boolean, display: string }}
 */
export function compute(net) {
  const { places, transitions, arcs, initialMarking } = net;

  if (transitions.length === 0) {
    return { value: false, display: 'No' };
  }

  // Build adjacency: place -> transitions it enables (has outgoing arc to)
  const placeToTransitions = {};
  const transitionToPlaces = {};

  for (const arc of arcs) {
    if (arc.sourceType === 'place') {
      (placeToTransitions[arc.source] ||= []).push(arc.target);
    } else {
      (transitionToPlaces[arc.source] ||= []).push(arc.target);
    }
  }

  // BFS from initially marked places to find reachable transitions
  const markedPlaceIds = new Set(
    places
      .filter((p) => (initialMarking[p.id] || 0) > 0)
      .map((p) => p.id)
  );

  const visited = new Set(markedPlaceIds);
  const queue = [...markedPlaceIds];
  const reachableTransitions = new Set();

  while (queue.length > 0) {
    const placeId = queue.shift();
    for (const tId of placeToTransitions[placeId] || []) {
      reachableTransitions.add(tId);
      for (const pId of transitionToPlaces[tId] || []) {
        if (!visited.has(pId)) {
          visited.add(pId);
          queue.push(pId);
        }
      }
    }
  }

  const allReachable = transitions.every((t) => reachableTransitions.has(t.id));
  return {
    value: allReachable,
    display: allReachable ? 'Yes' : 'No',
  };
}
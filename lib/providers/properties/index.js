/**
 * Registry of all Petri net properties.
 * To add a new property: create its file and import it here.
 */

import * as liveness  from './liveness';
import * as soundness from './soundness';

export const properties = [
  liveness,
  soundness,
];
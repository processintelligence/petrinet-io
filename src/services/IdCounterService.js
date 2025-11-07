export default class IdCounterService {
  constructor() {
    this.placeCounter = 1;
    this.transitionCounter = 1;
  }

  getNextPlaceId() {
    return `p${this.placeCounter++}`;
  }

  getNextTransitionId() {
    return `t${this.transitionCounter++}`;
  }

  // Get next ID based on type
  getNextId(type) {
    if(type) {
      if(type === 'petri:place') {
        return this.getNextPlaceId();
      } else if(type === 'petri:transition' || type === 'petri:empty_transition') {
        return this.getNextTransitionId();
      } else {
        return undefined;
      }
    }
  }
}


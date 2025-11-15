export default class IdCounterService {
  static $inject = ["elementRegistry"];
  constructor(elementRegistry) {
    this.elementRegistry = elementRegistry;
    this.placeCounter = 1;
    this.transitionCounter = 1;
    this.labelsVisible = true;
  }

  getNextPlaceId() {
    const elements = this.elementRegistry.getAll();
    const places = elements.filter(el => el.type === "petri:place");

    const existingIds = new Set(
      places
            .map(el => el.id)
            .map(id => {
                const num = parseInt(id.substring(1));
                return isNaN(num) ? null : num;
            })
            .filter(num => num !== null)
    );

    let candidate = 1; 
    while (existingIds.has(candidate)){
      candidate++;
    }

    // Update counter to be at least as high as the candidate (for future increments)
    if (candidate >= this.placeCounter) {
      this.placeCounter = candidate + 1;
    }
  
    return `p${candidate}`;
}

getNextTransitionId() {
  const elements = this.elementRegistry.getAll();
  const transitions = elements.filter(el => 
      el.type === 'petri:transition' || el.type === 'petri:empty_transition'
  );
  
  // Extract all existing transition IDs and parse their numbers
  const existingIds = new Set(
      transitions
          .map(el => el.id)
          .filter(id => id.startsWith('t'))
          .map(id => {
              const num = parseInt(id.substring(1));
              return isNaN(num) ? null : num;
          })
          .filter(num => num !== null)
  );
  
  // Find the lowest available number starting from 1
  let candidate = 1;
  while (existingIds.has(candidate)) {
      candidate++;
  }
  
  // Update counter to be at least as high as the candidate (for future increments)
  if (candidate >= this.transitionCounter) {
      this.transitionCounter = candidate + 1;
  }
  
  return `t${candidate}`;
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

  toggleLabels() {
    this.labelsVisible = !this.labelsVisible;
  }
}


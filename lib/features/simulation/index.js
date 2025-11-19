import SimulationService from './simulation.js';
import SimulationUiBehavior from './SimulationUiBehavior.js';

export default {
  __init__: [ 'simulationService', 'simulationUiBehavior' ],
  simulationService: [ 'type', SimulationService ],
  simulationUiBehavior: [ 'type', SimulationUiBehavior ]
};


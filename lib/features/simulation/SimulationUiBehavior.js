// features/simulation/SimulationUiBehavior.js
export default function SimulationUiBehavior(eventBus, canvas, simulationService) {
  const container = canvas.getContainer();

  function update(active) {
    if (active) {
      container.classList.add('simulation-mode');
    } else {
      container.classList.remove('simulation-mode');
    }
  }

  // if your service can tell current mode:
  if (simulationService.isSimulationActive) {
    update(simulationService.isSimulationActive());
  }

  // Listen to whatever event you already fire on mode changes
  eventBus.on('simulation.mode.changed', function(event) {
    update(event.active);
  });
}

SimulationUiBehavior.$inject = [ 'eventBus', 'canvas', 'simulationService' ];

import { html }       from 'htm/preact';
import { useState, useEffect } from 'preact/hooks';
import { properties } from './properties/index';

const LOW_PRIORITY = 500;

export default class PetriNetPropertiesProvider {
	static $inject =[
    	"eventBus",
  	];

  constructor(eventBus) {
	console.log("0");
    this.eventBus = eventBus;
    this._results = {};
    this._loading = false;
    propertiesPanel.registerProvider(LOW_PRIORITY, this);

    // Always listen, regardless of panel state
    eventBus.on('petriNet.computeProperties', () => {
		console.log("1111");
      const net = extractNet(eventBus);
      const computed = {};
      for (const prop of properties) {
        try {
          computed[prop.id] = prop.compute(net);
        } catch (e) {
          computed[prop.id] = { value: null, display: 'Error' };
          console.error(`[${prop.id}] computation failed:`, e);
        }
      }
      this._results = computed;
      // Re-render the panel by firing a selection change
      eventBus.fire('selection.changed', {});
    });
  }

  getGroups(element) {
    return (groups) => {
      if (element.type !== 'root') {
        return groups;
      }
      groups.push(createNetAnalysisGroup(element, this._injector, this._results));
      return groups;
    };
  }
}

PetriNetPropertiesProvider.$inject = ['propertiesPanel', 'injector'];

function createNetAnalysisGroup(element, injector, results) {
  return {
    id: 'netAnalysis',
    label: 'Net Analysis',
    entries: [
      {
        id: 'netAnalysisEntries',
        element,
        results,   // ← passed directly
        component: NetAnalysisEntries,
      },
    ],
  };
}

function NetAnalysisEntries({ results = {} }) {
  return html`
    <div class="net-analysis">
      ${properties.map((prop) => {
        const result = results[prop.id];
        return html`
          <div key=${prop.id} class="net-analysis__row">
            <span class="net-analysis__label">${prop.label}</span>
            <span class="net-analysis__value net-analysis__value--${result?.value === true ? 'yes' : result?.value === false ? 'no' : 'unknown'}">
              ${result ? result.display : '—'}
            </span>
          </div>
        `;
      })}
    </div>
  `;
}

function compute(injector, setResults, setLoading) {
  setLoading(true);
  const net = extractNet(injector);
  const computed = {};

  for (const prop of properties) {
    try {
      computed[prop.id] = prop.compute(net);
    } catch (e) {
      computed[prop.id] = { value: null, display: 'Error' };
      console.error(`[${prop.id}] computation failed:`, e);
    }
  }

  setResults(computed);
  setLoading(false);
}

function extractNet(injector) {
  const elementRegistry = injector.get('elementRegistry');

  const places         = [];
  const transitions    = [];
  const arcs           = [];
  const initialMarking = {};

  elementRegistry.forEach((element) => {
    if (element.type === 'petri:place') {
      places.push({ id: element.id });
      initialMarking[element.id] = element.businessObject?.tokens || 0;
    } else if (element.type === 'petri:transition' || element.type === 'petri:empty_transition') {
      transitions.push({ id: element.id });
    } else if (element.type === 'petri:arc') {
      const sourceEl = elementRegistry.get(element.source.id);
      arcs.push({
        id:         element.id,
        source:     element.source.id,
        target:     element.target.id,
        sourceType: sourceEl?.type === 'petri:place' ? 'place' : 'transition',
      });
    }
  });

  return { places, transitions, arcs, initialMarking };
}
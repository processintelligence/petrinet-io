import Diagram from 'diagram-js';

import BendpointsModule from 'diagram-js/lib/features/bendpoints/index.js';
import ConnectModule from 'diagram-js/lib/features/connect/index.js';
import ContextPadModule from 'diagram-js/lib/features/context-pad/index.js';
import CreateModule from 'diagram-js/lib/features/create/index.js';
import LassoToolModule from 'diagram-js/lib/features/lasso-tool/index.js';
import ModelingModule from 'diagram-js/lib/features/modeling/index.js';
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas/index.js';
import MoveModule from 'diagram-js/lib/features/move/index.js';
import OutlineModule from 'diagram-js/lib/features/outline/index.js';
import PaletteModule from 'diagram-js/lib/features/palette/index.js';
import ResizeModule from 'diagram-js/lib/features/resize/index.js';
import RulesModule from 'diagram-js/lib/features/rules/index.js';
import SelectionModule from 'diagram-js/lib/features/selection/index.js';
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll/index.js';
import SpaceToolModule from 'diagram-js/lib/features/space-tool/index.js';
import HandToolModule from 'diagram-js/lib/features/hand-tool/index.js';
import InteractionEventsModule from 'diagram-js/lib/features/interaction-events/index.js';
import PopupMenuModule from 'diagram-js/lib/features/popup-menu/index.js';
import DirectEditingModule from 'diagram-js-direct-editing';
import SnappingModule from 'diagram-js/lib/features/snapping';
import GridSnappingModule from 'diagram-js/lib/features/grid-snapping';
import gridModule from 'diagram-js-grid';
import 'diagram-js/assets/diagram-js.css';
import '../styles/petri-net-icons.css';

import ProvidersModule from '../providers/index.js';
import CustomRendererModule from '../draw/index.js';
import CroppingConnectionDocking from 'diagram-js/lib/layout/CroppingConnectionDocking.js';
import EditingModule from '../features/editing/index.js';
import KeyboardModule from '../features/keyboard/index.js';
import PopupModule from '../features/popup/index.js';
import SimulationModule from '../features/simulation/index.js';
import SimulationUiBehavior from '../features/simulation/SimulationUiBehavior.js';
import ExportModule from '../export/index.js';
import ServicesModule from '../services/index.js';


/**
 * A module that changes the default diagram look.
 */
const ElementStyleModule = {
  __init__: [
    [ 'defaultRenderer', function(defaultRenderer) {
      // override default styles
      defaultRenderer.CONNECTION_STYLE = { fill: 'none', strokeWidth: 5, stroke: '#000' };
      defaultRenderer.SHAPE_STYLE = { fill: 'white', stroke: '#000', strokeWidth: 2 };
      defaultRenderer.FRAME_STYLE = { fill: 'none', stroke: '#000', strokeDasharray: 4, strokeWidth: 2 };
    } ]
  ]
};

const ConnectionDockingModule = {
  __init__: [ 'connectionDocking' ],
  connectionDocking: [ 'type', CroppingConnectionDocking ]
}

/**
 * Our editor constructor
 *
 * @param { { container: Element, additionalModules?: Array<any> } } options
 *
 * @return {Diagram}
 */
export default function Editor(options) {

  const {
    container,
    additionalModules = [
      SnappingModule,
      GridSnappingModule,
      gridModule
    ]
  } = options;

  // default modules provided by the toolbox
  const builtinModules = [
    BendpointsModule,
    ConnectModule,
    ContextPadModule,
    CreateModule,
    LassoToolModule,
    HandToolModule,
    ModelingModule,
    MoveCanvasModule,
    MoveModule,
    OutlineModule,
    PaletteModule,
    PopupMenuModule,
    ResizeModule,
    RulesModule,
    SelectionModule,
    ZoomScrollModule,
    InteractionEventsModule,
    SpaceToolModule,
    DirectEditingModule
  ];

  // our own modules, contributing controls, customizations, and more
  const customModules = [
    ProvidersModule,
    ElementStyleModule,
    CustomRendererModule,
    ConnectionDockingModule,
    EditingModule,
    KeyboardModule,
    PopupModule,
    SimulationModule,
    SimulationUiBehavior,
    ExportModule,
    ServicesModule
  ];

  return new Diagram({
    canvas: {
      container
    },
    modules: [
      ...builtinModules,
      ...customModules,
      ...additionalModules
    ]
  });
}
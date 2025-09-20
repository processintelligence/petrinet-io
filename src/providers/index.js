import ExampleContextPadProvider from './ExampleContextPadProvider.js';
import ExamplePaletteProvider from './ExamplePaletteProvider.js';
import ExampleRuleProvider from './ExampleRuleProvider.js';

export default {
  __init__: [
    'exampleContextPadProvider',
    'examplePaletteProvider',
    'exampleRuleProvider'
  ],
  exampleContextPadProvider: [ 'type', ExampleContextPadProvider ],
  examplePaletteProvider: [ 'type', ExamplePaletteProvider ],
  exampleRuleProvider: [ 'type', ExampleRuleProvider ]
};
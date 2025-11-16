import CustomContextPadProvider from './ContextPadProvider.js';
import CustomPaletteProvider from './PaletteProvider.js';
import CustomRuleProvider from './RuleProvider.js';

export default {
  __init__: [
    'contextPadProvider',
    'paletteProvider',
    'ruleProvider'
  ],
  contextPadProvider: [ 'type', CustomContextPadProvider ],
  paletteProvider: [ 'type', CustomPaletteProvider ],
  ruleProvider: [ 'type', CustomRuleProvider ]
};
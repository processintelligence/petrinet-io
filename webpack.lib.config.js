// webpack.lib.config.js
const path = require('path');

module.exports = {
  mode: 'production',

  entry: './lib/index.js',  // this exports PetriNetIO

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'petrinet-io.umd.js',
    library: {
      name: 'PetriNetIO',
      type: 'umd'
    },
    globalObject: 'this'
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};

// webpack.config.js (ESM version)
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './public/index.js',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
    library: {
      name: 'PetriNetIO',
      type: 'umd'
    },
    globalObject: 'this', // so it works in Node and browser
    clean: true
  },
    devServer: {
    static: path.join(__dirname, 'public'), // serve index.html etc.
    hot: true,
    port: 8080
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          "style-loader",
          "css-loader"
        ],
      },
    ],
  }
};

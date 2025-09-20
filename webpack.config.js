// webpack.config.js (ESM version)

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: {
    bundle: ['./src/index.js']
  },
  output: {
    library: 'Editor',
    libraryExport: 'default',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'public'),
    filename: 'vendor/editor.js'
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
  },
  mode: 'development',
  devtool: 'source-map'
};

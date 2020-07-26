const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackDeployPlugin = require('html-webpack-deploy-plugin');

module.exports = {
  entry: {
    app: './src/app.ts',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [{ loader: 'ts-loader', options: { onlyCompileBundledFiles: true } }],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: 'em-fceux',
      filename: 'index.html',
      template: 'src/index.html',
    }),
    new HtmlWebpackDeployPlugin({
      assets: {
        copy: [{ from: 'static', to: '..', ignore: ['.DS_Store'] }],
      },
      packages: {
        'em-fceux': {
          copy: [{ from: 'dist/', to: '/' }],
          scripts: {
            variableName: 'FCEUX',
            path: 'fceux.js',
          },
        },
      },
    }),
  ],
};

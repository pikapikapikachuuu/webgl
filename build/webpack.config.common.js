const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TsConfigPathsPlugin = require('awesome-typescript-loader').TsConfigPathsPlugin

module.exports = {
  entry: {
    index: path.resolve(__dirname, '../src/ts/index.ts')
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: '[name].js'
  },
  context: path.resolve(__dirname, '../src'),
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '../src/index.html'),
      filename: 'index.html',
      favicon: path.resolve(__dirname, '../src/favicon.ico')
    })
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.json', '.css', '.glsl', '.js'],
    plugins: [
      new TsConfigPathsPlugin({
        configFileName: path.resolve(__dirname, '../tsconfig.json')
      })
    ]
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        loader: 'html-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.tsx?$/,
        use: ['awesome-typescript-loader']
      },
      {
        test: /\.glsl$/,
        loader: 'ts-shader-loader'
      }
    ]
  }
}

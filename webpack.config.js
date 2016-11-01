module.exports = {
    entry: './src/client.js',
    output: {
        path: './public',
        filename: 'main.js'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                loader: 'babel',
            }
        ]
    }
};

module.exports = api => {
    const isTest = api.env('test')

    const presets = [
        ['@babel/preset-env', {targets: {node: 'current'}}],
        '@babel/preset-typescript',
        '@babel/preset-react',
    ]

    const plugins = isTest ? ['babel-plugin-rewire-ts'] : []

    return {presets, plugins}
}
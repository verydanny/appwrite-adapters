import { shared } from '../../tsup.base'

export default shared({
    entry: ['src/main.ts'],
    format: ['esm'],
    outDir: 'lib',
})

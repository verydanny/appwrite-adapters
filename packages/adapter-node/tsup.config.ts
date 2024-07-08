import { shared } from '../../tsup.base'

export default shared({
    entry: ['src/main.ts', 'src/serveStatic.ts'],
    outDir: 'lib'
})

import type { Context } from '../src/types'

export default ({ req, res, log, error }: Context) => {
    return res.send(JSON.stringify({ hello: 'world' }), 200, {
        'content-type': 'application/json',
    })
}

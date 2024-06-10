interface Req {
    headers: Record<string, string>
    url: string
}

interface Res {
    json(obj?: Record<string, string>): void
}

export default function wrapper(app: import("hono").Hono) {
    // Set up things for Hono here

    return (req: Req, res: Res) => listener(app.fetch, req, res)
}

async function listener(
    getResponse: import("hono").Hono['fetch'],
    req: Req,
    res: Res,
) {
    const createRequest = new Request(new URL(req.url))
    const createResponse = await getResponse(createRequest)

    return res.json(await createResponse.json())
}

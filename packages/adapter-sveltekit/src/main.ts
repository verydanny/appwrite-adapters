import { Hono } from 'hono'
import adapterNode from "@gravlabs/appwrite-adapter-node"

const app = new Hono()

adapterNode(app)

export default () => {
    console.log("Work has commenced on bun")
}

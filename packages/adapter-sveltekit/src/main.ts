import { Hono } from 'hono'
import { serve } from "@gravlabs/appwrite-adapter-node"

const app = new Hono()

export default serve(app)

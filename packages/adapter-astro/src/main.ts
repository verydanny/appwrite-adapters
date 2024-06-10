import someTest from "@gravlabs/appwrite-adapter-node"
import bunTest from "@gravlabs/appwrite-adapter-bun"

someTest()
bunTest()

export default () => {
    console.log("Work has commenced on bun")
}

import { Ai } from "@cloudflare/ai"
import { Hono } from "hono"
import ui from './ui.html'

const app = new Hono()

// 1. The UI for asking questions
app.get("/", c => {
	return c.html(ui)
})


// 2. A POST endpoint to query the LLM
// 3. THE UI for adding notes
// 4. A POST endpoint to add notes


export default app
import { Ai } from "@cloudflare/ai"
import { Hono } from "hono"
import ui from './ui.html'
import { cors } from 'hono/cors'
import { methodOverride } from 'hono/method-override'
import write from './write.html'
import notes from './notes.html'


const app = new Hono()

app.get('/notes.json', async (c) => {
  const query = `SELECT * FROM notes`
  const { results } = await c.env.DB.prepare(query).all()
  return c.json(results);
})
app.get('/notes', async (c) => {
	return c.html(notes);
})

app.use('/notes/:id', methodOverride({ app }))
app.delete('/notes/:id', async (c) => {
  const { id } = c.req.param();
  const query = `DELETE FROM notes WHERE id = ?`
  await c.env.DB.prepare(query).bind(id).run()
	await c.env.VECTORIZE.deleteByIds([id])
	return c.redirect('/notes')
})

// 1. The UI for asking questions
app.get("/", c => {
	return c.html(ui)
})

app

// 2. A POST endpoint to query the LLM
app.get('/query', async (c) => {
	const ai = new Ai(c.env.AI);
	
	const question = c.req.query('text') || "What is the square root of 9?"
	
	// generate embeddings for the query
	const embeddings = await ai.run('@cf/baai/bge-base-en-v1.5', { text: [question] })
	const vectors = embeddings.data[0]
	
	// look up similar vectors to our query embedding
	const SIMILARITY_CUTOFF = 0.75
	const vectorQuery = await c.env.VECTORIZE.query(vectors, { topK: 1 });
	const vecIds = vectorQuery.matches
		.filter(vec => vec.score > SIMILARITY_CUTOFF)
		.map(vec => vec.vectorId)
	
	// if similar, extract that notes
	let notes = []
	if (vecIds.length) {
		const query = `SELECT * FROM notes WHERE id IN (${vecIds.join(", ")})`
		const { results } = await c.env.DB.prepare(query).bind().all()
		if (results) notes = results.map(record => record.text)
	}
	
	// query the LLM with notes as the added context, if no notes, leave it empty
	const contextMessage = notes.length
		? `Context:\n${notes.map(note => `- ${note}`).join("\n")}`
		: ""
	console.log(contextMessage)
	const systemPrompt = `When answering the question or responding, use the context provided, if it is provided and relevant.`
	
	const { response: answer } = await ai.run(
		'@cf/meta/llama-2-7b-chat-int8',
		{
		messages: [
			...(notes.length ? [{ role: 'system', content: contextMessage }] : []),
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: question }
		]
		}
	)
	
	return c.text(answer);
	})


// 3. THE UI for adding notes
app.get("/write", c => {
	return c.html(write)
})

// 4. A POST endpoint to add notes
app.post('/notes', async (c) => {
	const ai = new Ai(c.env.AI)
  
	const { text } = await c.req.json();
	if (!text) c.throw(400, "Missing text");
  
	const { results } = await c.env.DB.prepare("INSERT INTO notes (text) VALUES (?) RETURNING *")
	  .bind(text)
	  .run()
  
	const record = results.length ? results[0] : null
  
	if (!record) c.throw(500, "Failed to create note")
  
	const { data } = await ai.run('@cf/baai/bge-base-en-v1.5', { text: [text] })
	const values = data[0]
  
	if (!values) c.throw(500, "Failed to generate vector embedding")
  
	const { id } = record
	const inserted = await c.env.VECTORIZE.upsert([
	  {
		id: id.toString(),
		values,
	  }
	]);
  
	return c.json({ id, text, inserted });
})

export default app
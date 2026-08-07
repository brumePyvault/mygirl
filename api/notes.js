import mongoose from 'mongoose'

const noteSchema = new mongoose.Schema({
  author: { type: String, trim: true, maxlength: 40, default: 'Your love' },
  message: { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true })

const Note = mongoose.models.Note || mongoose.model('Note', noteSchema)

async function connect() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured')
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI)
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  try {
    await connect()
    if (request.method === 'GET') {
      const notes = await Note.find().sort({ createdAt: -1 }).limit(100).lean()
      return response.status(200).json({ notes })
    }
    if (request.method === 'POST') {
      const note = await Note.create({ author: request.body?.author, message: request.body?.message })
      return response.status(201).json({ note })
    }
    response.setHeader('Allow', 'GET, POST')
    return response.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    const status = error.name === 'ValidationError' ? 400 : 500
    return response.status(status).json({ error: status === 400 ? error.message : 'Could not reach the notes database.' })
  }
}

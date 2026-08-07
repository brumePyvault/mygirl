import mongoose from 'mongoose'
import { NextResponse } from 'next/server'

const noteSchema = new mongoose.Schema({
  author: { type: String, trim: true, maxlength: 40, default: 'Your love' },
  recipient: { type: String, enum: ['brume', 'deborah'], default: 'deborah', index: true },
  message: { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true })

const Note = mongoose.models.Note || mongoose.model('Note', noteSchema)

async function connect() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured')
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI)
}

function errorResponse(error) {
  const status = error.name === 'ValidationError' ? 400 : 500
  const message = status === 400 ? error.message : 'Could not reach the notes database.'
  return NextResponse.json({ error: message }, { status })
}

const editorFor = recipient => recipient === 'brume' ? 'deborah' : 'brume'
const editCodes = () => ({
  brume: process.env.BRUME_NOTE_CODE ,
  deborah: process.env.DEBORAH_NOTE_CODE,
})

function authorized(note, code) {
  return Boolean(note && code && editCodes()[editorFor(note.recipient)] === String(code).trim())
}

export async function GET() {
  try {
    await connect()
    const notes = await Note.find().sort({ createdAt: -1 }).limit(100).lean()
    return NextResponse.json({ notes }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request) {
  try {
    await connect()
    const body = await request.json()
    const note = await Note.create({ author: body?.author, recipient: body?.recipient, message: body?.message })
    return NextResponse.json({ note }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request) {
  try {
    await connect()
    const body = await request.json()
    const note = await Note.findById(body?.id)
    if (!note) return NextResponse.json({ error: 'Note not found.' }, { status: 404 })
    if (!authorized(note, body?.code)) return NextResponse.json({ error: 'That edit code is not correct for this note.' }, { status: 403 })
    note.message = body?.message
    await note.save()
    return NextResponse.json({ note }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request) {
  try {
    await connect()
    const body = await request.json()
    const note = await Note.findById(body?.id)
    if (!note) return NextResponse.json({ error: 'Note not found.' }, { status: 404 })
    if (!authorized(note, body?.code)) return NextResponse.json({ error: 'That delete code is not correct for this note.' }, { status: 403 })
    await note.deleteOne()
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return errorResponse(error)
  }
}

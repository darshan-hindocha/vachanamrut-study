'use server'

import { Db, MongoClient, ObjectId } from 'mongodb'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { type Chat } from '@/lib/types'

let db: Db

// Initialize MongoDB client and database
const initDb = async () => {
  if (db) {
    return
  }
  const client = await MongoClient.connect(process.env.MONGODB_URI ?? '')
  db = client.db(process.env.MONGODB_NAME)
}

export async function getChats(userId: string | null) {
  await initDb()

  if (!userId) {
    return []
  }

  try {
    const chats = await db
      .collection('chats')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray()
    return chats.map(chat => {
      return {
        ...chat,
        _id: chat._id.toString(),
        userId: chat.userId.toString()
      } as Chat
    })
  } catch (error) {
    console.error(
      'Error in getChats for userId: ' + userId + ' and error:\n',
      error
    )
    return []
  }
}

export async function getChat(id: string, userId: string) {
  await initDb()
  console.log('running getChat with id: ' + id + ' and userId: ' + userId)
  const chat = await db
    .collection('chats')
    .findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) })
  if (chat === null) {
    console.error(
      'could not find getChat for id: ' + id + ' and userId: ' + userId
    )
    return null
  }
  return {
    ...chat,
    _id: chat._id.toString(),
    userId: chat.userId.toString()
  } as Chat
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  await initDb()
  const session = await auth()

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }

  const collection = db.collection('chats')
  console.log(
    'running removeChat with id: ' + id + ' and userId: ' + session.user.id
  )
  await collection.deleteOne({
    _id: new ObjectId(id),
    userId: new ObjectId(session.user.id)
  })

  revalidatePath('/')
  return revalidatePath(path)
}

export async function clearChats() {
  await initDb()
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const collection = db.collection('chats')
  console.log('running clearChats with userId: ' + session.user.id)
  await collection.deleteMany({ userId: new ObjectId(session.user.id) })

  revalidatePath('/')
  return redirect('/')
}

export async function getSharedChat(id: string) {
  await initDb()
  const collection = db.collection('chats')
  return await collection.findOne({
    _id: new ObjectId(id),
    sharePath: { $exists: true }
  })
}

export async function shareChat(chat: Chat) {
  await initDb()
  const session = await auth()
  if (typeof chat._id !== 'string') {
    chat._id = chat._id.toString()
  }

  if (
    !session ||
    !chat.userId ||
    !session.user.id ||
    session.user.id.toString().slice(0, 15) !==
      chat.userId.toString().slice(0, 15)
  ) {
    return {
      error: 'Unauthorized'
    }
  }

  const collection = db.collection('chats')
  const updatedChat = {
    ...chat,
    sharePath: `/share/${chat._id}`
  }

  await collection.updateOne(
    { _id: new ObjectId(chat._id as string) },
    {
      $set: {
        sharePath: updatedChat.sharePath
      }
    }
  )
  return updatedChat
}

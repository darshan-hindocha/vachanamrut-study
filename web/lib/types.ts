import { ObjectId } from 'mongodb'
import { type Message } from 'ai'

export interface Chat extends Record<string, any> {
  _id: ObjectId | string // Changed from 'id: string' to MongoDB's '_id: ObjectId'
  title: string
  createdAt: Date
  userId: ObjectId | string // Changed from 'userId: string' to 'userId: ObjectId'
  path: string
  messages: Message[]
  sharePath?: string
}

export type ServerActionResult<Result> = Promise<
  | Result
  | {
      error: string
    }
>

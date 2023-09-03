'use server'

import { Chat } from '@/components/chat'
import { ObjectId } from 'mongodb'

export default async function IndexPage() {
  const id = new ObjectId()

  return <Chat id={id.toString()} />
}

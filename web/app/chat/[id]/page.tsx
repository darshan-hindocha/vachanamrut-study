'use server'

import { type Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { auth } from '@/auth'
import { getChat } from '@/app/actions'
import { Chat } from '@/components/chat'
import { Chat as ChatType } from '@/lib/types'

export interface ChatPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({
  params
}: ChatPageProps): Promise<Metadata> {
  const session = await auth()

  if (!session?.user) {
    return {}
  }

  const chat: ChatType | null = await getChat(params.id, session.user.id)
  return {
    title: chat?.title.toString().slice(0, 50) ?? 'Chat'
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const session = await auth()

  if (!session?.user) {
    redirect(`/sign-in?next=/chat/${params.id}`)
  }

  const chat: ChatType | null = await getChat(params.id, session.user.id)

  if (!chat) {
    // TODO redirect('/chat') and show toast
    notFound()
  }

  if (chat?.userId !== session.user.id) {
    // TODO redirect('/chat') and show toast
    notFound()
  }

  return <Chat id={chat._id as string} initialMessages={chat.messages} />
}

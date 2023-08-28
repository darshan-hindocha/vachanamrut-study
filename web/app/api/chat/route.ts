import { kv } from '@vercel/kv'
import { StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'

import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { PineconeStore } from 'langchain/vectorstores/pinecone'

import { PineconeClient } from '@pinecone-database/pinecone'

export const runtime = 'edge'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})

const pinecone = new PineconeClient()

const openai = new OpenAIApi(configuration)

function sanitizeText(text: string) {
  const replacements: {
    [key: string]: string
  } = {
    ā: 'a',
    ī: 'i',
    ū: 'u',
    ē: 'e',
    ō: 'o',
    ṃ: 'm',
    ṇ: 'n',
    ṛ: 'r',
    ṣ: 's',
    ś: 's',
    ṭ: 't',
    ḍ: 'd',
    ḥ: 'h',
    ḷ: 'l'
    // Add more as needed
  }

  // @ts-ignore-next-line
  return text.replace(
    /ā|ī|ū|ē|ō|ṃ|ṇ|ṛ|ṣ|ś|ṭ|ḍ|ḥ|ḷ/g,
    match => replacements[match]
  )
}

export async function POST(req: Request) {
  const [json, _] = await Promise.all([
    req.json(),
    pinecone.init({
      environment: 'us-west1-gcp',
      apiKey: process.env.PINECONE_API_KEY ?? ''
    })
  ])
  const { messages, previewToken } = json
  const userId = (await auth())?.user.id

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  if (previewToken) {
    configuration.apiKey = previewToken
  }

  console.log('pinecone initialized')

  const pineconeIndex = pinecone.Index('yogi')

  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { pineconeIndex }
  )

  const similaritySearchResults = await vectorStore
    .similaritySearchWithScore(messages[messages.length - 1].content, 10)
    .then(result => {
      return result
    })

  // Multi-string prompt
  let prompt = 'Here are the most relevant results I found for your query:\n\n'

  // Group data by metadata.title
  const groupedByTitle: {
    [title: string]: [any, number][]
  } = similaritySearchResults.reduce((acc, [item, score]) => {
    const title: string = item.metadata.title
    // @ts-ignore-next-line
    if (!acc[title]) {
      // @ts-ignore-next-line
      acc[title] = []
    }
    // @ts-ignore-next-line
    acc[title].push([item, score])
    return acc
  }, {})

  // Sort each group by metadata.paragraph
  Object.keys(groupedByTitle).forEach(title => {
    groupedByTitle[title].sort((a, b) => {
      return a[0].metadata.paragraph - b[0].metadata.paragraph
    })
  })

  let uniqueTextSet = new Set()

  // Iterate over each title group
  Object.keys(groupedByTitle).forEach((title, groupIndex) => {
    prompt +=
      '#### ' +
      groupedByTitle[title][0][0]?.metadata?.vachanamrut_number +
      ': ' +
      title.replaceAll('\n', ' ') +
      '\n'

    // Iterate over each document in the title group
    groupedByTitle[title].forEach((document, index) => {
      const pageContent = document[0].pageContent
      const sanitizedContent = sanitizeText(pageContent)
      if (!uniqueTextSet.has(sanitizedContent)) {
        prompt +=
          ' - **[p. ' +
          document[0].metadata?.paragraph +
          ']** ' +
          (document[1] < 0.6 ? '(Low relevance) ' : '') +
          document[0].pageContent +
          '\n\n'
      }
      uniqueTextSet.add(sanitizedContent)
    })

    prompt += '\n\n' // Separator between groups
  })

  messages[messages.length - 1].content = prompt

  const response = prompt

  const title = json.messages[0].content.substring(0, 100)
  const id = json.id ?? nanoid()
  const createdAt = Date.now()
  const path = `/chat/${id}`
  const payload = {
    id,
    title,
    userId,
    createdAt,
    path,
    messages: [
      ...messages,
      {
        content: response,
        role: 'assistant'
      }
    ]
  }
  await kv.hmset(`chat:${id}`, payload)
  await kv.zadd(`user:chat:${userId}`, {
    score: createdAt,
    member: `chat:${id}`
  })

  // @ts-ignore-next-line
  return new StreamingTextResponse(response)
}

import { kv } from '@vercel/kv'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'


import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";

import { PineconeClient } from "@pinecone-database/pinecone";

export const runtime = 'edge'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})

const pinecone = new PineconeClient();


const openai = new OpenAIApi(configuration);

export async function POST(req: Request) {
  const [json, _] = await Promise.all([
    req.json(),
    pinecone.init({
      environment: "us-west1-gcp",
      apiKey: process.env.PINECONE_API_KEY,
    })
  ]);
  const { messages, previewToken } = json
  const userId = (await auth())?.user.id ?? (await auth())?.user.sub

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  if (previewToken) {
    configuration.apiKey = previewToken
  }

  console.log("pinecone initialized");

  const pineconeIndex = pinecone.Index("yogi");

  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { pineconeIndex }
  );

  const similaritySearchResults = await vectorStore.similaritySearchWithScore(messages[messages.length - 1].content, 3)
    .then((result) => {
      return result;
    });

  // Multi-string prompt
  let prompt = `
    Respond by saying "Here are the most results I found for your query:"
    Clean up the results. If there are gaps between words in the results then remove the gaps.
    Re-title the results to represent the results.
    If the document text doesn't make sense then rewrite it to make sense with as little changes as possible.
    Embolden the part of the extract that has the most similarity to the query.
    
    Results:
  `;

  // Loop through the document responses to list out the results and their sources

  similaritySearchResults.forEach((document, index) => {

    prompt += `
        **${index + 1}: ${document[0].metadata?.title ?? "No Title Found"}** \n 
        ${document[1] > 0.6 ? "High" : "Low"} Confidence \n
        Extract: ${document[0].pageContent}
        \n
      `;

  });

  messages[messages.length - 1].content = prompt;

  const res = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages,
    temperature: 0.2,
    stream: true
  })

  const stream = OpenAIStream(res, {
    async onCompletion(completion) {
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
            content: completion,
            role: 'assistant'
          }
        ]
      }
      await kv.hmset(`chat:${id}`, payload)
      await kv.zadd(`user:chat:${userId}`, {
        score: createdAt,
        member: `chat:${id}`
      })
    }
  })

  return new StreamingTextResponse(stream)
}

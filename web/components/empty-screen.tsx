import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

const exampleMessages = [
  {
    heading: "Find Shriji Maharaj's definition of various concepts in satsang",
    message: `What are the panchvishays?`
  },
  {
    heading: 'Curate a list of references from the Vachanamrut on a topic',
    message:
      'What did Shriji Maharaj say about the importance of gnan vs bhakti?'
  },
  {
    heading: 'Find an exact quote from the Vachanamrut based on a description',
    message: `Maharaj talks about sleeping soundly and struggles to wake up`
  }
]

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold">
          Welcome to the Vachanamrut Study App!
        </h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          This is a beta AI search app
        </p>
        <p className="leading-normal text-muted-foreground">
          You can search for something here or try the following examples:
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={() => setInput(message.message)}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

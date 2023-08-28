import React from 'react'

import { cn } from '@/lib/utils'
import { ExternalLink } from '@/components/external-link'

export function FooterText({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'px-2 text-center text-xs leading-normal text-muted-foreground',
        className
      )}
      {...props}
    >
      Beta AI search engine. Share your feedback{' '}
      <ExternalLink href="https://docs.google.com/forms/d/e/1FAIpQLSf_i9xhciA26q_4YaXVf8Hs6Dt4L9lmGxt-KwDLy6ZcOwpqlA/viewform?usp=sf_link">here</ExternalLink>
    </p>
  )
}

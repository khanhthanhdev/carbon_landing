import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.carbonmarketvietnam.com'

  return {
    name: 'CarbonLearn - Carbon Market Training for Vietnamese SMEs',
    short_name: 'CarbonLearn',
    description: 'Comprehensive carbon market training platform for Vietnamese small and medium enterprises',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'vi',
    categories: ['education', 'business', 'environment'],
    icons: [
      {
        src: '/logo_carbon.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'maskable'
      },
      {
        src: '/logo_carbon.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'maskable'
      }
    ],
    screenshots: [
      {
        src: '/screenshot-wide.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide'
      },
      {
        src: '/screenshot-narrow.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow'
      }
    ],
    shortcuts: [
      {
        name: 'Search Knowledge Base',
        short_name: 'Search',
        description: 'Search the carbon market knowledge base',
        url: '/search',
        icons: [{ src: '/logo_carbon.jpg', sizes: '96x96' }]
      },
      {
        name: 'Ask AI',
        short_name: 'AI Chat',
        description: 'Chat with AI carbon advisor',
        url: '/ask-ai',
        icons: [{ src: '/logo_carbon.jpg', sizes: '96x96' }]
      },
      {
        name: 'Books & Courses',
        short_name: 'Courses',
        description: 'Access carbon market courses and resources',
        url: '/books',
        icons: [{ src: '/logo_carbon.jpg', sizes: '96x96' }]
      }
    ]
  }
}

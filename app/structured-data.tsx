export function StructuredData() {
  const organizationData = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'RoofingContractor'],
    name: 'Upgrade Roofs',
    legalName: 'UPGRADE ROOFS LTD',
    image: [
      'https://www.upgraderoofs.co.uk/images/6.jpeg',
      'https://www.upgraderoofs.co.uk/images/2.jpeg'
    ],
    '@id': 'https://www.upgraderoofs.co.uk/#organization',
    url: 'https://www.upgraderoofs.co.uk',
    telephone: '+441270897606',
    email: 'upgraderoofs@yahoo.com',
    description: 'Professional roofing company based in Sandbach, serving Cheshire with 25+ years experience and 5,000+ completed projects. Fully insured with £10M public liability cover and a 10-year workmanship guarantee. Specializing in roof repairs, installations, flat roofing, tile roofs, guttering, and emergency roofing services.',
    foundingDate: '1999',
    slogan: 'Sandbach-Based Roofers Serving Cheshire',
    knowsAbout: [
      'Roof Repairs',
      'Roof Installation',
      'Flat Roofing',
      'Tile Roofing',
      'Slate Roofing',
      'Guttering',
      'Fascia Installation',
      'Skylight Installation',
      'Cladding',
      'Emergency Roofing',
      'Storm Damage Repairs',
      'Roof Maintenance',
      'Commercial Roofing'
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: '20 Crewe Road',
      addressLocality: 'Sandbach',
      addressRegion: 'Cheshire',
      postalCode: 'CW11 4NE',
      addressCountry: 'GB'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 53.1461,
      longitude: -2.3679
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00'
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '09:00',
        closes: '16:00'
      }
    ],
    sameAs: [
      'https://www.facebook.com/people/Upgrade-Roofs/61564099403039/',
      'https://www.instagram.com/upgraderoofs',
      'https://www.x.com/upgraderoofs',
      'https://www.youtube.com/@upgraderoofs',
      'https://www.pinterest.com/upgraderoofs',
      'https://www.google.com/maps/place/Upgrade+Roofs',
      'https://www.corc.org.uk/',
      'https://find-and-update.company-information.service.gov.uk/company/15660654'
    ],
    identifier: {
      '@type': 'PropertyValue',
      name: 'Google Business Profile ID',
      // Must match GBP_LOCATION_ID in lib/contact.ts. This is the live location
      // (placeId ChIJMUVUfoBZekgRrNga9buOK88). Do not shorten it — an earlier
      // pass dropped three digits and pointed this at a resource that 404s.
      value: '17098915606572808840'
    },
    areaServed: [
      {
        '@type': 'City',
        name: 'Sandbach',
        sameAs: 'https://en.wikipedia.org/wiki/Sandbach'
      },
      {
        '@type': 'City',
        name: 'Crewe'
      },
      {
        '@type': 'City',
        name: 'Congleton'
      },
      {
        '@type': 'City',
        name: 'Nantwich'
      },
      {
        '@type': 'City',
        name: 'Middlewich'
      },
      {
        '@type': 'City',
        name: 'Alsager'
      },
      {
        '@type': 'City',
        name: 'Holmes Chapel'
      },
      {
        '@type': 'City',
        name: 'Winsford'
      },
      {
        '@type': 'City',
        name: 'Northwich'
      },
      {
        '@type': 'City',
        name: 'Macclesfield'
      },
      {
        '@type': 'City',
        name: 'Knutsford'
      },
      {
        '@type': 'City',
        name: 'Tarporley'
      },
      {
        '@type': 'City',
        name: 'Biddulph'
      },
      {
        '@type': 'City',
        name: 'Newcastle-under-Lyme'
      },
      {
        '@type': 'City',
        name: 'Wilmslow'
      },
      {
        '@type': 'State',
        name: 'Cheshire',
        sameAs: 'https://en.wikipedia.org/wiki/Cheshire'
      },
      { '@type': 'PostalCode', postalCode: 'CW1' },
      { '@type': 'PostalCode', postalCode: 'CW2' },
      { '@type': 'PostalCode', postalCode: 'CW4' },
      { '@type': 'PostalCode', postalCode: 'CW5' },
      { '@type': 'PostalCode', postalCode: 'CW10' },
      { '@type': 'PostalCode', postalCode: 'CW11' },
      { '@type': 'PostalCode', postalCode: 'CW12' },
      { '@type': 'PostalCode', postalCode: 'SK10' },
      { '@type': 'PostalCode', postalCode: 'SK11' },
      { '@type': 'PostalCode', postalCode: 'ST7' },
      { '@type': 'PostalCode', postalCode: 'WA16' },
    ],
    serviceArea: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: 53.1461,
        longitude: -2.3679
      },
      geoRadius: '30000'
    },
    paymentAccepted: ['Cash', 'Credit Card', 'Bank Transfer', 'Cheque'],
    currenciesAccepted: 'GBP',
    hasCredential: [
      {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'Professional Certification',
        recognizedBy: {
          '@type': 'Organization',
          name: 'Confederation of Roofing Contractors (CORC)'
        }
      }
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Roofing Services',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Tile & Slate Roofing',
            description: 'Expert installation and repair of traditional tile and slate roofing'
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Flat Roofing',
            description: 'Modern flat roofing solutions with superior waterproofing'
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Chimney Repairs',
            description: 'Professional chimney maintenance and repair services'
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Gutters & Fascias',
            description: 'Complete gutter and fascia installation, repair, and maintenance'
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Skylights & Roof Windows',
            description: 'Professional skylight and roof window installation'
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Cladding Installations',
            description: 'Modern cladding solutions for residential and commercial properties'
          }
        }
      ]
    },
    // NOTE: aggregateRating / review removed from the global LocalBusiness entity.
    // Google treats embedded ratings/reviews on a LocalBusiness as a manual-action
    // risk unless they are visible on-page and backed by a verified source. Real
    // reviews are rendered on the homepage via <GhlReviewsWidget /> and audited
    // through the Google Business Profile · page-level review markup belongs with
    // those widgets, not in the site-wide organization schema.
    potentialAction: {
      '@type': 'RequestQuote',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.upgraderoofs.co.uk/contact',
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform'
        ]
      },
      result: {
        '@type': 'Offer',
        name: 'Free Roofing Quote'
      }
    }
  };

  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://www.upgraderoofs.co.uk/#website',
    url: 'https://www.upgraderoofs.co.uk',
    name: 'Upgrade Roofs',
    inLanguage: 'en-GB',
    publisher: {
      '@id': 'https://www.upgraderoofs.co.uk/#organization'
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.upgraderoofs.co.uk/sitemap-page?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  };

  const speakableData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://www.upgraderoofs.co.uk/#webpage',
    url: 'https://www.upgraderoofs.co.uk',
    name: 'Trusted Roofers in Sandbach & Cheshire | Upgrade Roofs',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#entity-citation', '#hero', '#services', '#about']
    },
    isPartOf: {
      '@id': 'https://www.upgraderoofs.co.uk/#website'
    }
  };

  // NOTE: BreadcrumbList and FAQPage schema removed from global layout.
  // These should be injected page-specifically where the content actually exists.
  // See: /roofers-sandbach, /roof-repairs, etc. for page-level FAQ schema.

  // Consolidate all site-level entities into a single @graph document anchored
  // to #organization. A single JSON-LD blob is more robustly parsed by both
  // search engines and HTML-only LLM scrapers than multiple disjoint scripts,
  // and cross-references (publisher, isPartOf, branchOf) resolve via @id.
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [organizationData, websiteData, speakableData],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

// 1. Import utilities from `astro:content`
// import { string } from 'astro/zod';
import { z, defineCollection } from 'astro:content';
import { ORG_TYPE, post_schema } from './schemas.js'



// Main 'post' collection, for all article types
const posts = defineCollection({
  type: 'content', schema: post_schema,
});


// const team = defineCollection({
//   type: 'data',
//   schema: ({ image }) => z.object({
//     name: z.string(), // full name
//     name_slug: z.string().default(''), // slugified version
//     title: z.string(),
//     image: z.object({
//       src: z.string().nullable().default(''),
//       alt: z.string().nullable().default(''),
//     }),
//     external: z.boolean().nullable().default(false), // internal or external writer
//     contact: z.string().nullable().default(''), // email or url if available
//     isFictitious: z.boolean().nullable().default(false), // pen name or real person?
//     draft: z.boolean().nullable().default(false),
//     jobTitle: z.string().nullable().default(''),
//     type: z.string().nullable().default('Person'),
//     url: z.string().nullable().default(''),
//     worksFor: z.object({
//       '@type': z.enum(ORG_TYPE).default('Organization'),
//       name: z.string().default(''),
//     }).default({}),
//     description: z.string().nullable().default(''),
//     sameAs: z.array(z.string()).nullable().default([]),
//     description_125: z.string().nullable().default(''),
//     description_250: z.string().nullable().default(''),
//     biography: z.string().nullable().default(''),
//   }),
// });


// collection: category:
// const categories = defineCollection({
//   type: 'data',
//   schema: ({ image }) => z.object({
//     category: z.string(),
//     category_slug: z.string().default(''),
//     image: z.string().default(''),
//     description: z.string(),
//   }),
// });


// collection: topics:
const topics = defineCollection({
  type: 'data',
  schema: z.object({
    topic: z.string(),
    topic_slug: z.string(),
    category: z.string().nullable().default(''),
    traffic: z.number().default(0),
    description: z.string().nullable().default(''),
    // subtopics: z.array(z.object({
    //   name: z.string(),
    //   slug: z.string(),
    //   description: z.string(),
    // })),
  }),
});



// define collection for subtopics:
// const subtopics = defineCollection({
//   type: 'data',
//   schema: z.object({
//     topic: z.string(),
//     topic_slug: z.string(),
//     category: reference('categories'),
//     subtopics: z.array(z.object({
//       subtopic: z.string(),
//       subtopic_slug: z.string(),
//       keywords: z.array(z.string()),
//       questions: z.array(z.string()),
//    }))
//   }),
// });


// define collection for faqs:
const faqs = defineCollection({
  type: 'data',
  schema: z.object({
    topic: z.string(),
    topic_slug: z.string(),
    category: z.string(),
    title: z.string(),
    description: z.string(),
    faqs: z.array(z.object({
      question: z.string(),
      answer: z.string(),
      // resources: z.array(reference('articles')).optional(),
    })),
  }),
});

// lastPostDate: 2024-02-02T02:55:32.911362
// comments:
//   - id: BBt7SDkwPV
//     parentId: null
//     name: Chad Jones
//     email: user0@example.com
//     date: 2024-02-01T23:50:38.198897
//     content: Really enjoyed this piece, especially the part about the hospitality in Mongolia!
//   - id: tPydWoRMAk
//     parentId: BBt7SDkwPV
//     name: Alex Smith
//     email: null
//     date: 2024-01-31T08:50:38.198951
//     content: How has this adventure changed your perspective on travel and spirituality?

const comments = defineCollection({
  type: 'data',
  schema: z.object({
    lastPostDate:  z.string().transform(str => new Date(str)).default(''),
    comments: z.array(z.object({
      postid: z.string(),
      parentid: z.string().nullable().default(null),
      name: z.string(),
      email: z.string().nullable().default(''),
      date: z.string().transform(str => new Date(str)).default(''),
      content: z.string(),
      starred: z.boolean().default(false),
    }))
  })
});



//    This key should match your collection directory name in "src/content"
export const collections = { comments, posts, topics, faqs };



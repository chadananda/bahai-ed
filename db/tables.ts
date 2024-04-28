import { defineTable, column, NOW } from "astro:db";



export const Categories = defineTable({
  columns: {
    id: column.text({ primaryKey: true }), // category name slug
    category: column.text(),
    image: column.text({ optional: true }),
    description: column.text(),
  }
});

export const Topics = defineTable({
  columns: {
    id: column.text({ primaryKey: true }), // topic slug
    name: column.text(),
    title: column.text({ optional: true }),
    description: column.text({ optional: true }),
    image: column.text({ optional: true }),
    faqs: column.json({ optional: true }), //
  }
});

export const Team = defineTable({
 // FYI, these are fields for populating the structured data for a person
  columns: {
    id: column.text({ primaryKey: true }), // user name slug
    name: column.text({ optional: true }),
    title: column.text({ optional: true }),
    image_src: column.text({ optional: true }),
    image_alt: column.text({ optional: true }),
    external: column.boolean({ optional: true }),
    email: column.text({ optional: false }),
    isFictitious: column.boolean({optional: true}),
    jobTitle: column.text({ optional: true }),
    type: column.text({ optional: true }), // default: Person
    url: column.text({ optional: true }),
    worksFor_type: column.text({ optional: true }),
    worksFor_name: column.text({ optional: true }),
    description: column.text({ optional: true }),
    sameAs_linkedin: column.text({ optional: true }),
    sameAs_twitter: column.text({ optional: true }),
    sameAs_facebook: column.text({ optional: true }),
    description_125: column.text({ optional: true }),
    description_250: column.text({ optional: true }),
    biography: column.text({ optional: true }),
  },
  indexes: [ { on: ["id", "email"], unique: true } ]
});

export const Users = defineTable({
 columns: {
   id: column.text({ primaryKey: true }),  // user name slug
   name: column.text({ optional: true }), // full name
   email: column.text({ optional: true }),
   hashed_password: column.text({ optional: true }),
   role: column.text({ optional: true }),
 },
 indexes: [ { on: ["id", "email"], unique: true } ]
})

export const Sessions = defineTable({
 columns: {
   id: column.text(),
   userId: column.text({ optional: true }), // user name slug
   expiresAt: column.date({ optional: true }),
   fresh: column.boolean({ optional: true }),
 },
 indexes: [ { on: ["id"], unique: true } ]
})


export const Comments = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),       // comment id

    postid: column.text({ optional: false }),       // article slug
    parentid: column.number({ optional: true }),    // comment parent id
    name: column.text({ optional: false }),         // commentator name
    content: column.text({ optional: false }),      // comment
    // description: column.text({ optional: true }),   // article description (needed for ai moderation)

    moderated: column.boolean({ default: false }), //  moderated
    date: column.date({ default: NOW }),           // comment date
    starred: column.boolean({ default: false }),   //  starred
  },
  indexes: [ { on: ["id", "postid", "moderated", "date"], unique: false } ]
})


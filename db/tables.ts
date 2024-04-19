import { defineTable, column, NOW } from "astro:db";

// export const User = defineTable({
// 	columns: {
// 		id: column.number({ primaryKey: true }),
// 		url: column.text({ optional: true }),
// 		name: column.text(),
// 		email: column.text({ unique: true, optional: true }),
// 		avatar: column.text({ optional: true }),
// 		githubId: column.number({ unique: true }),
// 		username: column.text(),
// 		updatedAt: column.date({ default: NOW, nullable: true }),
// 		createdAt: column.date({ default: NOW, nullable: true }),
// 	},
// });

export const Categories = defineTable({
 columns: {
   id: column.text({ primaryKey: true }), // category name slug
   category: column.text(),
   image: column.text({ optional: true }),
   description: column.text(),
 }
});


// Define your tables
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


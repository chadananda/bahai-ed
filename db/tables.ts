import { defineTable, column, NOW } from "astro:db";

// export const Session = defineTable({
// 	columns: {
// 		id: column.text({ primaryKey: true }),
// 		userId: column.number({ references: () => User.columns.id }),
// 		expiresAt: column.number(),
// 	},
// });

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
   category: column.text(),
   category_slug: column.text({ primaryKey: true }),
   image: column.text({ nullable: true }),
   description: column.text(),
 }
});


// Define your tables
export const UserAttributes = defineTable({
 // FYI, these are fields for populating the structured data for a person
 columns: {
   id: column.text({ primaryKey: true }), // sluggified name
   name: column.text(),
   title: column.text(),
   image_src: column.text(),
   image_alt: column.text(),
   external: column.boolean(),
   contact: column.text(),
   isFictitious: column.boolean(),
   jobTitle: column.text(),
   type: column.text(), // default: Person
   url: column.text(),
   worksFor_type: column.text(),
   worksFor_name: column.text(),
   description: column.text(),
   sameAs_linkedin: column.json(),
   sameAs_twitter: column.json(),
   sameAs_facebook: column.json(),
   description_125: column.text(),
   description_250: column.text(),
   biography: column.text(),
 }
});

export const Users = defineTable({
 columns: {
   id: column.text({ primaryKey: true }),
   slug: column.text({ unique: true }),
   email: column.text(),
   username: column.text(),
   hashed_password: column.text(),
 }
})

export const Sessions = defineTable({
 columns: {
   id: column.number({ primaryKey: true }),
   userId: column.number({ references: () => Users.columns.id }),
   expiresAt: column.number(),
 }
})
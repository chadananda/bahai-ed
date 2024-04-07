import { defineDb, defineTable, column } from 'astro:db';


// columns: {
//   // A string of text.
//   author: column.text(),
//   // A whole integer value.
//   likes: column.number(),
//   // A true or false value.
//   flagged: column.boolean(),
//   // Date/time values queried as JavaScript Date objects.
//   published: column.date(),
//   // An untyped JSON object.
//   metadata: column.json(),
// }

const Categories = defineTable({
  columns: {
    category: column.text(),
    category_slug: column.text({ primaryKey: true }),
    image: column.text({ nullable: true }),
    description: column.text(),
  }
});

export default defineDb({
   tables: { Categories },
})
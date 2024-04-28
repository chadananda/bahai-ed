import { defineDb } from 'astro:db';
import { Categories, Users, Sessions, Team, Topics, Comments } from './tables.ts';

export default defineDb({
  tables: { Categories, Users, Sessions, Team, Topics, Comments },
})




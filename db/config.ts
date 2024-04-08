import { defineDb } from 'astro:db';
import { Categories, UserAttributes, Users, Sessions } from './tables.ts';

export default defineDb({
  tables: { Categories, Users, Sessions, UserAttributes },
})




import { db, Categories } from 'astro:db';

export default async function() {
  await db.insert(Categories).values([
			{
					category: 'Bahá’í Literature',
					category_slug: 'bahai-literature',
					image: 'https://bahai-education.org/_astro/bahai-literature.BmmHKzrh_2072vy.webp',
					description: `Doctrinal Bahá’í Literature includes scripture and authoritative interpretation.
This includes teachings, laws, and principles in hundreds of books and letters revealed by the
faith’s central figures — Bahá’u’lláh, the Báb, and
‘Abdu’l-Bahá — as well as interpretative guidance by Shoghi Effendi, the
Guardian of the Bahá’í Faith. This literature forms the doctrinal
foundation of the Bahá’í Faith, guiding individual spiritual life and the
administrative functioning of the Bahá’í community. The	Bahá’í Faith also has a unique and
flexible legislative system that allows for the application of supplemental laws to meet the
needs of a changing society. Such supplemental laws are flexible and can be modified according
to changing needs because they are not part of the ‘Divine Explicit Text’.`,
   },
	 ]);
}

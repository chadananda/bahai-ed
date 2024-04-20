import { db, Categories, Users, Team } from 'astro:db';
import * as argon2 from 'argon2';
import site from '@data/site.json';
import slugifier from 'slugify';

const slugify = (text) => {
	return slugifier(text,  {
			lower: true, // convert to lower case
			strict: true, // strip special characters except replacement
			remove: /[*+~.()'"!:@]/g, // remove characters that match regex, replace with replacement
	})
}

export default async function() {
	// Seed initial admin user
	await db.insert(Users).values([{
		id: slugify(site.author),
		name: site.author,
		email: import.meta.env.SITE_ADMIN_EMAIL.trim().toLowerCase(),
		hashed_password: await argon2.hash(import.meta.env.SITE_ADMIN_PASS.trim()),
		role: 'superadmin'
	}]).execute();

 //  // and initial team member attributes
	await db.insert(Team).values([{
		id: slugify(site.author),
		name: site.author,
		title: 'Author, Editor', // redundant?
		image_src: site.author_image,
		image_alt: `Author - ${site.author}`,
		external: false,
		email: import.meta.env.SITE_ADMIN_EMAIL.trim().toLowerCase(),
		isFictitious: false,
		jobTitle: 'Staff Writer, Editor', // redundant?
		type: 'Person',
		url: `${site.url}/authors/${slugify(site.author)}`,
		worksFor_type: 'Organization',
		worksFor_name: site.siteName,
		description: site.author_bio,
		sameAs_linkedin: site.linkedin.publisher,
		sameAs_twitter: site.twitter.creator,
		sameAs_facebook: site.facebook.author,
		description_125: site.author_bio.slice(0, 125),
		description_250: site.author_bio.slice(0, 250),
		biography: site.author_bio
	}]).execute();

	// seed a category to test that the db and data collections can work together
	await db.insert(Categories).values([
		{	id: 'bahai-literature',
			category: 'Bahá’í Literature',
			image: 'https://blogw-assets.s3.us-west-1.amazonaws.com/categories/content/bahai-literature.png',
			description: `Doctrinal Bahá’í Literature includes scripture and authoritative interpretation.
This includes teachings, laws, and principles in hundreds of books and letters revealed by the
faith’s central figures — Bahá’u’lláh, the Báb, and
‘Abdu’l-Bahá — as well as interpretative guidance by Shoghi Effendi, the
Guardian of the Bahá’í Faith. This literature forms the doctrinal
foundation of the Bahá’í Faith, guiding individual spiritual life and the
administrative functioning of the Bahá’í community. The	Bahá’í Faith also has a unique and
flexible legislative system that allows for the application of supplemental laws to meet the
needs of a changing society. Such supplemental laws are flexible and can be modified according
to changing needs because they are not part of the ‘Divine Explicit Text’.`, },

{	id: 'bahai-education',
category: 'Bahá’í Education',
image: 'https://blogw-assets.s3.us-west-1.amazonaws.com/categories/content/bahai-education.png',
description: `Bahá'í education encompasses the pedagogical principles and practices derived
from the teachings of the Bahá'í Faith, aimed at personal development and
societal transformation. It emphasizes the unity of humankind, the acquisition
of virtues, the importance of service, and the harmony of science and
religion, within formal and informal educational settings.`, },

{	id: 'bahai-faith',
category: 'Bahá’í Faith',
image: 'https://blogw-assets.s3.us-west-1.amazonaws.com/categories/content/bahai-faith.png',
description: `The Bahá'í Faith is a monotheistic religion emphasizing the spiritual unity of
all humankind. Originating with the teachings of Bahá'u'lláh in 19th-century
Persia, it advocates universal peace, elimination of prejudice, and unity
among religions. With its global scope, the Faith espouses principles of
individual search for truth, equality of men and women, and harmonious
development of science and religion.`, },

]).execute();

}

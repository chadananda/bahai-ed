import { db, Categories, Users, Team, Topics } from 'astro:db';
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


// see the topics data collection:

// id: column.text({ primaryKey: true }), // topic slug
// name: column.text(),
// title: column.text({ optional: true }),
// description: column.text({ optional: true }),
// image: column.text({ optional: true }),
// faqs: column.text({ optional: true, mode:	'json' }),


let seedTopics = [

	 { id:	'advent-of-divine-justice',
	   name: 'Advent of Divine Justice',
				title: 'Guiding Light for a New Era: Understanding The Advent of Divine Justice',
				description: `The Advent of Divine Justice is a letter written by Shoghi Effendi, the
																	Guardian of the Bahá’í Faith, to the Bahá’ís of the United States and Canada
																	in 1938. The letter was written in response to the growing community of
																	Bahá'ís in the West and was intended to provide guidance on the spiritual and
																	administrative development of the Bahá’í community. The letter was published
																	in 1939 and is considered to be one of the most important letters of Shoghi
																	Effendi on the ways and means required for the effective prosecution of
																	'Abdu'l-Baha's charter for teaching, the "Tablets of the Divine Plan".`,
				image: '',
				faqs: [
					{ question: 'What Is the Significance of The Advent of Divine Justice for Bahá’ís?',
						answer: `The Advent of Divine Justice serves as both a moral compass and a
											strategic blueprint, emphasizing personal rectitude and collective
											endeavor in propelling the growth of the Bahá'í Faith in North America.` },
					{ question: 'How Does The Advent of Divine Justice Address Racial Prejudice?',
						answer: `Shoghi Effendi identifies the eradication of racial prejudice as America's
											most challenging issue and a requisite for achieving spiritual unity,
											urging Bahá’ís to lead by example.` },
					{ question: 'What Role Does The Advent of Divine Justice Play in Bahá’í Administration?',
						answer: `The letter outlines administrative duties and the necessity for a unified
											and systematic approach to governance, elevating the administrative
											order's role in the Faith's expansion.` },
					{ question: 'How Are Youth Encouraged in The Advent of Divine Justice?',
						answer: `Shoghi	Effendi champions the vibrancy and potential of youth, advocating
											for their wholehearted involvement in community-building efforts and the
											pioneering spirit.` },
					{ question: 'What Guidance Does The Advent of Divine Justice Offer on Teaching the Faith?',
						answer: `The letter calls for a profound commitment to teaching, armed with wisdom
											and tact, to present the Faith's principles in ways that resonate within
											diverse cultural contexts.` },
					{ question: 'How Does Moral Rectitude Feature in The Advent of Divine Justice?',
						answer: `Shoghi Effendi emphasizes moral rectitude as the bedrock of individual
											character and a critical element in effectively representing and serving
											the Faith.` },
					{ question: 'What Connection Does The Advent of Divine Justice Make between America and The Tablets of the Divine Plan?',
						answer: `Shoghi Effendi correlates the spiritual destiny of America to the Tablets
											of the Divine Plan, stating their fulfillment hinges on the country's
											adherence to divine justice and unity.` },
					{ question: 'In What Way Does The Advent of Divine Justice Discuss Global Civilization?',
						answer: `It presents the Bahá'í Faith's vision of a world civilization underpinned
											by spiritual values, with America playing a pivotal role in its shaping
											and realization.` },
					{ question: 'How Does The Advent of Divine Justice Relate to World Peace?',
						answer: `The letter envisions America contributing to world peace by embodying
											justice, eliminating prejudices, and committing to Bahá'í principles of
											unity.` },
					{ question: 'What Does The Advent of Divine Justice Say About Bahá’í Elections?',
						answer: `It provides insightful guidance on the unique, non-partisan framework of
											Bahá’í elections, emphasizing spiritual qualifications and selfless
											service.` },
					{ question: 'How Does The Advent of Divine Justice Define the Standard of Personal Conduct for Bahá’ís?',
						answer: `The Guardian calls for Bahá’ís to exhibit exemplary conduct, being ever
											mindful of honesty, chastity, trustworthiness, and courtesy as
											cornerstones of their personal lives.` },
				]},

].map(topic => ({...topic, faqs: JSON.stringify(topic.faqs)}));

await db.insert(Topics).values(seedTopics).execute();

}

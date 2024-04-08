import { Lucia } from "lucia";
import { AstroDBAdapter } from "lucia-adapter-astrodb";
import { db, Session, User  } from "astro:db";
// import { } from "@db/tables";

const adapter = new AstroDBAdapter(db, Session, User);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// set to `true` when using HTTPS
			secure: !import.meta.env.APP_ENV==='dev'
		}
	},
	getUserAttributes: (attributes) => {
		return {
			// attributes has the type of DatabaseUserAttributes
			name: attributes.name
		};
	}
});

declare module "lucia" {
	 interface Register {
		  Lucia: typeof lucia;
				DatabaseUserAttributes: DatabaseUserAttributes;
	 }
}

interface DatabaseUserAttributes {
		id: string;
		name: string;
		title: string;
		image_src: string;
		image_alt: string;
		external: boolean;
		contact: string;
		isFictitious: boolean;
		jobTitle: string;
		type: string;
		url: string;
		worksFor_type: string;
		worksFor_name: string;
		description: string;
		sameAs_linkedin: string;
		sameAs_twitter: string;
		sameAs_facebook: string;
		description_125: string;
		description_250: string;
		biography: string;
}


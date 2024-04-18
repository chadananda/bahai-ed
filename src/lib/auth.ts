import { Lucia } from "lucia";
import { AstroDBAdapter } from "lucia-adapter-astrodb";
import { db, Sessions, Users  } from "astro:db";
// import { } from "@db/tables";

const adapter = new AstroDBAdapter(db, Sessions, Users);

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
			name: attributes.name,
			role: attributes.role,
			email: attributes.email
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
	id: string;  // user name slug
	name: string; // full name
	email: string;
	hashed_password: string;
	role: string;
}


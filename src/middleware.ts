// src/middleware.ts
import { lucia } from "./lib/auth";
import { verifyRequestOrigin as verifyOrig } from "lucia";
// import { defineMiddleware } from "astro:middleware";


export const onRequest = async (context, next) => {
  const path = new URL(context.request.url).pathname;
  // Skip middleware for non-admin paths
  if (!path.startsWith('/admin')) return next();
  // Retrieve session ID from cookies
  const sessionId = context.cookies.get(lucia.sessionCookieName)?.value ?? null;
  // Redirect to login page if no session ID is present
  if (!sessionId) {
      // console.log('No sessionId, redirecting to login');
      return new Response(null, { status: 302, headers: { Location: '/login' } });
  }
  try {
    // Perform origin verification for additional security
    const originHeader = context.request.headers.get("Origin"); // comes out null
    const hostHeader = context.request.headers.get("Host");
    const isDev = import.meta.env.APP_ENV === 'dev';
    // In development, we might skip the origin check for ease of testing
    // if (!isDev && (!originHeader || !hostHeader || !verifyOrig(originHeader, [hostHeader]))) {
    //   console.log('Origin verification failed:', originHeader, hostHeader );
    //   return new Response("Forbidden", { status: 403 });
    // }
    // Validate session and user, then proceed
    const { session, user } = await lucia.validateSession(sessionId);
    // console.log('Session and user validated:', session, user);
    if (!['superadmin', 'admin','editor','writer'].includes(user.role)) {
      console.log('User role not allowed');
      return new Response(null, { status: 302, headers: { Location: '/login' } });
    }
    context.locals.session = session;
    context.locals.user = user;
    return next();
  } catch (error) {
    // console.error('Session validation error:', error);
    // Clear session cookie on validation error and redirect to login
    const sessionCookie = lucia.createBlankSessionCookie();
    context.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    return new Response(null, { status: 302, headers: { Location: '/login' } });
  }
};

export const config = {
    matcher: '/admin/*' // Apply this middleware only to paths under '/admin'
};

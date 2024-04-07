import { createClient } from '@vercel/postgres';
import brand from '@data/site.json';
import { getPostFromSlug } from '@utils/utils';
// import for hashPassword
import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 2;

/**
 * Connects to the PostgreSQL database using environment variables and returns the client.
 * @returns {Promise<import('@vercel/postgres').Client>} The connected database client.
 */
export async function connectDB() {
  const client = createClient(process.env.POSTGRES_URL);
  await client.connect();
  return client;
}
// check if user table exists and create one if necessary
export async function enforceUsersTable(db) {
  const tableExistsQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    );
  `;
  const tableExistsResult = await db.query(tableExistsQuery);
  const tableExists = tableExistsResult.rows[0].exists;

  if (!tableExists) {
    const createTableQuery = `
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL
      );
    `;
    await db.query(createTableQuery);
  }
  await enforceSuperUser(db);
}

export async function enforceSuperUser(db) {
  // console.log('enforceSuperUser')
  // if user not found in db, create one - process.env.SITE_ADMIN_EMAIL
  // const user = process.env.SITE_ADMIN_NAME
  const email = process.env.SITE_ADMIN_EMAIL
  const hashedPassword = await bcrypt.hash(process.env.SITE_ADMIN_PASS, SALT_ROUNDS);
  const role = 'admin'
  const userExistsQuery = 'SELECT * FROM users WHERE email = $1 LIMIT 1;';
  const userExistsResult = await db.query(userExistsQuery, [email]);
  // console.log('row count', userExistsResult.rowCount)
  if (userExistsResult.rowCount === 0) {
    const insertUserQuery = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4);
    `;
    await db.query(insertUserQuery, [brand.author, email, hashedPassword, role]);
  }
  // console.log('enforceSuperUser done', email, hashedPassword)
}
// export async function scheduleArticleUpdate(minutes = 10) {
//   // save a post named 'schedules-article-update' with the current time plus minutes
//   const now = new Date();
//   const future = new Date(now.getTime() + minutes * 60000);
//   const post = { time: future.toISOString() };
//   await savePendingPost('schedules-article-update', post);
// }


/**
 * Handles the login process for a user. This function checks the provided credentials,
 * and on successful authentication, returns a user object with the user's information.
 * In case of a failed authentication, it returns a user object with default values and an error message.
 */
export async function getUser(email, password) {
  let user = {email, role:'guest', name:'', authenticated:false, id:null, error:'' };

  // console.log('email', email, process.env.SITE_ADMIN_EMAIL)
  // console.log('password', password, process.env.SITE_ADMIN_PASS);

  // if user matches the .env user, return super user, without db
  if (email === process.env.SITE_ADMIN_EMAIL && password === process.env.SITE_ADMIN_PASS) {
    return {...user, id: 0, name: brand.author, role: 'admin', authenticated: true};
  }

  // Connect to the database
  const db = await connectDB();
  if (!db) return {...user, authenticated: false, error: 'Database connection failed'};

  // create table it nonexistent and enforce super user
  await enforceUsersTable(db);

  const userQuery = 'SELECT * FROM users WHERE email = $1 LIMIT 1;';
  const userResult = await db.query(userQuery, [email]);
  db.end(); // close the connection, don't wait

  // no matching user found
  if (userResult.rowCount === 0) {
     // console.log('User not found');
      return {...user, error: 'User not found'};
  } else { // found a matching user
     // console.log('User found');
      const {id, name, role, password_hash} = userResult.rows[0];
      const passwordMatches = await bcrypt.compare(password, password_hash);
      // bad password
      if (!passwordMatches) return {...user, error: 'Password failed'};
      // good password but non-admin/editor role, perhaps suspended user
      if (!['admin', 'editor'].includes(role)) return {...user, error: "invalid role"}
      // good password and good role
      return {...user, id, name, role, authenticated: true}
  }
}

// function to add new user to the database, admin only
export async function addUser(name, email, password, role) {
  const db = await connectDB();
  if (!db) {
    console.error('Database connection failed')
    return { error: 'Database connection failed', redirect: setupPath };
  } else console.error('Database connected successfully')

  await enforceUsersTable(db);
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  // fail out if user name or email already exists:
  const userExistsQuery = 'SELECT * FROM users WHERE email = $1 LIMIT 1;';
  const userExistsResult = await db.query(userExistsQuery, [email]);
  if (userExistsResult.rowCount > 0) {
    db.end(); // close the connection, don't wait
    return { error: 'User already exists' };
  }
  // looks gook, let's insert
  const insertUserQuery = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id;
  `;
  const insertUserResult = await db.query(insertUserQuery, [name, email, hashedPassword, role]);
  db.end(); // close the connection, don't wait

  if (insertUserResult.rowCount === 0) return { error: 'User not added'};
  return { id: insertUserResult.rows[0].id };
}

async function enforcePostTableExists(db) {
  const tableExistsQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'posts'
    );
  `;
  const tableExistsResult = await db.query(tableExistsQuery);
  const tableExists = tableExistsResult.rows[0].exists;
  if (!tableExists) {
    const createTableQuery = `
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        site VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        updated TIMESTAMP NOT NULL DEFAULT NOW(),
        posttype VARCHAR(255) NOT NULL,
        post JSON NOT NULL
      );
    `;
    await db.query(createTableQuery);
  }
}

export async function savePendingPost(posttype, post) {
  try {
    const db = await connectDB();
    await enforcePostTableExists(db);
    const insertPostQuery = `
      INSERT INTO posts (site, slug, posttype, post)
      VALUES ($1, $2, $3, $4);
    `;
    await db.query(insertPostQuery, [brand.url, post.slug, posttype, JSON.stringify(post)]);
    await db.end();
  } catch (error) {
    console.error('savePost error', error);
  }
}

export async function getPendingPosts(posttype) {
  const db = await connectDB();
  await enforcePostTableExists(db);
  const query = `SELECT * FROM posts WHERE site = $1 AND posttype = $2`;
  const values = [brand.url, posttype];
  const queryResult = await db.query(query, values);
  db.end();
  const result = (queryResult.rows).map(({post}) => post);
  // console.log('getPendingComments', result);
  return result;
}

export async function getPendingPost(posttype, slug) {
// console.log('getPendingPost', posttype, slug);
  const db = await connectDB();
  await enforcePostTableExists(db);
  const query = `SELECT * FROM posts WHERE site = $1 AND posttype = $2 AND slug = $3`;
  const values = [brand.url, posttype, slug];
  const queryResult = await db.query(query, values);
  db.end();
  if (queryResult.rowCount === 0) {
    // console.log('No matching post: ', posttype, '-', slug);
    return ({slug, content: false});
  } else return (queryResult.rows)[0].post;
}

export async function deletePendingPosts(posttype) {
  const db = await connectDB();
  await enforcePostTableExists(db);
  // delete all comments matching the current site
  const query = `DELETE FROM posts WHERE site = $1 AND posttype = $2`;
  const values = [brand.url, posttype];
  await db.query(query, values);
  db.end();
}

export async function deletePendingPost(posttype, slug) {
  const db = await connectDB();
  await enforcePostTableExists(db);
  // delete post matching the current site
  const query = `DELETE FROM posts WHERE site = $1 AND posttype = $2 AND slug = $3`;
  const values = [brand.url, posttype, slug];
  await db.query(query, values);
  db.end();
}

export async function saveCommentPost(post) {
  return await savePendingPost('comment', post);
}

export async function getPendingComments() {
  return await getPendingPosts('comment');
}

export async function deletePendingComments() {
  return await deletePendingPosts('comment');
}

export async function saveArticle(slug, content) {
  // the difference from comments is that we want to overwrite the post if it already exists
  const db = await connectDB();
  await enforcePostTableExists(db);
  const query = `SELECT * FROM posts WHERE site = $1 AND posttype = $2 AND slug = $3`;
  const values = [brand.url, 'article', slug];
  const queryResult = await db.query(query, values);
  if (queryResult.rowCount > 0) {
    const updatePostQuery = "UPDATE posts SET post = $1 WHERE id = $2";
    await db.query(updatePostQuery, [JSON.stringify({slug, content}), queryResult.rows[0].id]);
  } else {
    await savePendingPost('article', {slug, content});
  }
}

export async function saveArticleMeta(slug, meta) {
  // the difference from comments is that we want to overwrite the post if it already exists
  const db = await connectDB();
  await enforcePostTableExists(db);
  const query = `SELECT * FROM posts WHERE site = $1 AND posttype = $2 AND slug = $3`;
  const values = [brand.url, 'article-meta', slug];
  const queryResult = await db.query(query, values);
  if (queryResult.rowCount > 0) {
    const updatePostQuery = "UPDATE posts SET post = $1 WHERE id = $2";
    await db.query(updatePostQuery, [JSON.stringify({slug, content:meta}), queryResult.rows[0].id]);
  } else {
    await savePendingPost('article-meta', {slug, content: meta});
  }
}

export async function getPendingArticlePosts() {
  const content = await getPendingPosts('article');
  const meta = await getPendingPosts('article-meta');

  const keyedContent = new Map();
  content.forEach(({slug, content}) =>
    keyedContent.set(slug, { ...keyedContent.get(slug), content }));
  meta.forEach(({slug, content: meta}) =>
    keyedContent.set(slug, { ...keyedContent.get(slug), meta }));

  return Array.from(keyedContent, ([slug, value]) => ({ slug, ...value }));
}

// loads physical article and then updates it with the pending article content and meta
export async function getCurrentArticlePost(slug) {
  let article = await getPostFromSlug(slug);
  const { content: body } = await getPendingPost('article', slug);
  // if (body) console.log('Returned db body: ', body);
  const { content: data } = await getPendingPost('article-meta', slug);
  if (body) {
    console.log('Returning article with updated pending body content');
    article.body = body;
  }
  if (data) {
    console.log('Returning article with updated pending meta content');
    article.data = data;
  }
  return article;
}

export async function getPendingArticlePost(slug) {
  return await getPendingPost('article', slug);
}

export async function getScheduledUpdates() {
  // return an object of post types, each an array of posts needing
  // updated which are older than 10 minutes
}

// saveArticle, getArticle, deleteArticle

/// note, when querying a JSON object, it looks like this:
//  SELECT * FROM comments WHERE post->>'name' = 'chad';


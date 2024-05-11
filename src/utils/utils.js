// utils.js
import slugifier from 'slugify';
import { getCollection, getEntry } from 'astro:content';
// export a slugify function
import path from 'path';
import fs from 'fs';
import matter from 'gray-matter';
import site from '@data/site.json'
import { getImage } from "astro:assets";
import { db, Categories, eq, Team, Users, Topics, Comments, inArray, NOW, Cron, Posts, count } from 'astro:db';
import * as argon2 from 'argon2';
import AWS from 'aws-sdk';
import { Buffer } from 'buffer';
import dotenv from 'dotenv';  dotenv.config();
import { moderateComments } from './openai_request';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';
import { date } from "zod";


// ***************** POSTS

export const genPostID = (title, datePublished) => {
  const stopWords = 'a the and or of in on at to for with by'.split(' '); // add common words to exclude from slug
  // if (language!='en') return console.error('updatePost_DB: completely new post must be in English');
  let namePart = slugify(title).split('-').filter(w => !stopWords.includes(w)).slice(0, 4).join('-');
  let datePart = (new Date(datePublished)).toLocaleDateString('en-CA'); // YYYY-MM-DD
  return `${datePart}-${namePart}/en.md`;
}

// updatePost requires a full post object with data and body, not a partial update
export const updatePost_DB = async (entry) => {
  let { id, data, body } = entry;
  let { title, post_type, url, description, desc_125, abstract,  audio, audio_duration, audio_image, narrator, draft, author, editor, category, topics,  keywords, datePublished, image, language } = data;
  language = language || 'en';

  // basic validation
  if (!title || !description || !abstract ) {
    console.error('updatePost_DB: missing some required fields');
    return false;
  }

  // if image is an object, make it a string
  if (typeof image === 'object') image = image.src;

  // replace index.mdoc with en.id  and  *.mdoc with *.md
  id = id || genPostID(title, datePublished);
  if (id.endsWith('.mdoc')) id = id.replace('.mdoc', '.md');
  if (id.endsWith('index.md')) id = id.replace('index.md', 'en.md');
  let baseid = id.split('/')[0];

  // console.log({ title, post_type, url, description, desc_125, abstract, language, audio, audio_duration, audio_image, narrator, draft, author, editor, category, topics, tags, keywords, datePublished, image })

  // Prepare the post object for insertion or update
  const post = {
    id, baseid, url, title, post_type, description, desc_125, abstract, language,
    audio, audio_duration, audio_image, narrator, draft, author, editor, category,
    topics: (topics || []).map(topic => slugify(topic.trim())).filter(Boolean),
    keywords: (keywords || []).map(kw => slugify(kw.trim())).filter(Boolean), // Directly assigning JSON objects
    datePublished: new Date(datePublished),
    dateModified: new Date(), // Set the dateModified to NOW
    image, // Assume image field only needs the src as a string
    // post content
    body: `\n${body.trim()}\n\n`
  };
  // console.log({
  //   id, url, title, post_type, description, desc_125, abstract, language,
  //   audio, audio_duration, audio_image, narrator, draft, author, editor, category,
  //   topics, tags, keywords,
  //   datePublished,
  //   image
  // })
  try {
    // Check if the post already exists
    if (id && (await db.select().from(Posts).where(eq(Posts.id, id))).length > 0) {
      // if published, do not allow changes to the url
      if (!draft || datePublished<new Date()) delete post.url;
      // question: should we load the existing post and just update the changed fields?
      await db.update(Posts).set(post).where(eq(Posts.id, id));
//console.log(`Updated post "${id}"`);
      // if English, update core fields in translations: image, post_type, author, editor, category, topics, keywords, draft, audio_image, date_published
      if (language==='en') {
        let updateObj = {image, post_type, author, editor, category, topics, keywords, draft, audio_image, datePublished};
        await db.update(Posts).set(updateObj).where(eq(Posts.baseid, baseid));
       // console.log('Updated translations matching:', baseid);
      }
    } else { // insert new post
      // on new post, set datePublished, dateModified, make sure id, slug and url are set
      // post.datePublished = new Date(); post.dateModified = new Date();
      if (!post.url) post.url = slugify(title);
      // If not found, insert as new without dateModified
//console.log(`Inserting new post...`, post.id);
      await db.insert(Posts).values(post);
    }
    return post;
  } catch (e) {
    console.error('error: ', e);
    return false;
  }
}

export const importPost2DB = async (id) => {
  let post = await getPostFromID(id)
  if (!post.db) await updatePost_DB(post)
}

export const postExists = async (id) => {
  return (await db.select({id: Posts.id}).from(Posts).where(eq(Posts.id, id))).length>0
  // this is inefficient. we should query a count instead of fetching the whole object
}

// export const postExists = async (id) => {
//   return (await db.select(count('*')).from(Posts).where(eq(Posts.id, id))) > 0
// }

export const importAllPosts2DB = async () => {
  // let posts = await getAllArticles();
  const posts = await getAllCollectionArticles();
  // sort the posts so language=en is last
  posts.sort((a, b) => a.data.language === 'en' ? 1 : -1);
  for (const post of posts) {
    let normalizeID = post.id.replace('index.mdoc', 'en.md').replace('.mdoc', '.md');
    if (!(await postExists(normalizeID))) await updatePost_DB(post);
  }
}

export const normalizePost_DB = (dbpost) =>  {
  const { id, url, title, post_type, description, desc_125, abstract, language, audio, audio_duration, audio_image, narrator, draft, author, editor, category, topics, tags, keywords, datePublished, dateModified, image, body, baseid } = dbpost;

// console.log('normalizePost_DB check 1', { audio: dbpost.audio, audio_image: dbpost.audio_image, audio_duration: dbpost.audio_duration } );
// console.log('normalizePost_DB check 2', { audio, audio_image, audio_duration } );

  const entry = {
    id, slug: url, baseid, collection: "posts",
    data: {
      title, url, post_type, description, desc_125, abstract, language,
      audio, audio_duration, audio_image,
      narrator, draft, author, editor, category,
      topics: typeof topics === 'string' ? JSON.parse(topics) : topics,
      tags: typeof tags === 'string' ? JSON.parse(tags) : tags,
      keywords: typeof keywords === 'string' ? JSON.parse(keywords) : keywords,
      datePublished, dateModified,
      image: { src: image, alt: description},
    },
    body
  }
  // console.log('normalizePost_DB', entry.data);
  // console.log('normalizePost_DB', entry);
  return entry;
};

export const newPostObj = (title, description, abstract='', desc_125='', body='') => {
  const datePublished = new Date(Date.now() + 604800000); // 604800000ms = 7 days
  const language = 'en';
  const id = genPostID(title, datePublished);
  const slug = slugify(title);
  const url = slug;
  const baseid = id.split('/')[0];
 return {
  id: '',
  slug: '',
  collection: 'posts',
  baseid,
  data: {
    title, url,
    post_type: 'Article',
    description, desc_125, abstract, language,
    audio: '', audio_duration: '', audio_image: '',
    narrator: 'auto',
    draft: true,
    author: '', editor: '',
    category: '', topics: [], keywords: [],
    datePublished, dateModified: new Date(),
    image: { src: '', alt: title }
  },
  body,
  db: true };
};

export const deletePost = async (postid) => {
  // we should not actually delete but turn the post into a redirect
  // but for now we will delete
   await db.delete(Posts).where(eq(Posts.id, postid));
   console.log('deleted post', postid);
}


export const getPosts_DB = async (lang = '', filter = () => true) => {
  const isLangMatch = (p) => !!lang ? p.data.language === lang : true;
  const posts = (await db.select().from(Posts))
    .map(normalizePost_DB)
    .filter((post) => isLangMatch(post))  // Apply language filter to db articles
    .map(post => ({ ...post, db: true }));
  return posts;
}

export const getPostFromSlug_DB = async (slug) => {
  const post = (await db.select().from(Posts).where(eq(Posts.url, slug)))
    .map(normalizePost_DB)
    .map(post => ({ ...post, db: true, helpers: getArticleHelpers(post) }))[0];
  return post;
}
export const getPostFromID_DB = async (id) => {
  const post = (await db.select().from(Posts).where(eq(Posts.id, id)))
    .map(normalizePost_DB)
    .map(post => ({ ...post, db: true, helpers: getArticleHelpers(post) }))[0];
  return post;
}

export const getArticleHelpers = (article) => {
  let { datePublished, author, draft, image } = article.data;
  if (!datePublished) datePublished = new Date();
    else if (typeof datePublished === 'string') datePublished = new Date(datePublished)
  const isPublished = (datePublished < new Date()) && !draft;
  return {
    isPublished,
    authorName: author?.replace(/(^|\s|-)\S/g, s => s.toUpperCase().replace('-', ' ')),
    datePublishedStr: (draft || !isPublished) ? '' : datePublished.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }),
    dateShort: datePublished.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    imgThumb: transformS3Url(image.src, 80,80),
    imgSmall:  transformS3Url(image.src, 120,120),
    imgMed: transformS3Url(image.src, 240, 180),
    imgLg: transformS3Url(image.src, 400,300),
    imgCover: transformS3Url(image.src, 1200,900),
  }
}

export const getAllCollectionArticles = async (lang='', filter=()=>true) => {
  const isBlank = (p) => p.data.url.toLowerCase().trim() === 'blank';
  const isLangMatch = (p) => !!lang ? p.data.language === lang : true;
  // Load articles from the collection
  let posts = (await getCollection('posts', (p) => isLangMatch(p) && !isBlank(p)))
    .filter(filter);
  return posts;
}

export const getAllArticles = async (lang = '', filter = () => true) => {
  // make sure all collection posts are loadded into the database
  await importAllPosts2DB();

  const posts = (await getPosts_DB(lang, filter))
    .sort((a, b) => b.data.datePublished - a.data.datePublished)
    .map(post => ({ ...post, helpers: getArticleHelpers(post) })) // add helpers like images
  return posts;
}
export const getPublishedArticles = async (lang='', filter=()=>true) => {
  const isDev = import.meta.env.APP_ENV==='dev';
  const isPublished = (p) => (!p.data.draft && p.data.datePublished<=new Date()) || isDev;
  return (await getAllArticles(lang, (p)=>isPublished(p)))
    .filter((post) => !!post.data?.url) // make sure post is ready for publication
    .filter(filter);
}
export const getPostFromSlug = async (slug) => {
  // return null;
  if (!slug) return null;
  // console.log('getPostFromSlug - looking for post with slug:', slug);
  // let post = (await getCollection('posts', (post)=>post.data?.url===slug))?.pop();
  // if (!post) await getPostFromSlug_DB(slug);
  const post = await getPostFromSlug_DB(slug);

  // console.log('getPostFromSlug - post found:', post);
  if (!post) console.error('getPostFromSlug - post not found:', slug);
  return post;
}
export const getPostFromID = async (id) => {
  // return null;
  // console.log('getPostFromSlug - looking for post with slug:', slug);
  // let post = (await getCollection('posts', (post)=>post.id===id))?.pop();
  // if (!post) await getPostFromID_DB(id);
  const post = await getPostFromID_DB(id);

  // console.log('getPostFromSlug - post found:', post);
  if (!post) console.error('getPostFromID - post not found:', id);
  return post;
}

// given a slug, return all matching translations, published or not
export const getArticleTranslationAll = async (slug, all=false) => {
  // we can make this better by gettting baseid
  //const baseid = (await db.select({baseid: Posts.baseid}).from(Posts).where(eq(Posts.url, slug)))[0];
  const post = (await db.select().from(Posts).where(eq(Posts.url, slug)))[0];
  if (!post) return []
  const baseid = post.baseid;
  let translations = (await db.select().from(Posts).where(eq(Posts.baseid, baseid)))
  if (!all) translations = translations.filter(post => post.url != slug);
  translations = translations.map(normalizePost_DB);
  return translations;

  // const allPosts = await getAllArticles();
  // const thisPostId = (allPosts.filter(post => post.data.url === slug)[0])?.id;
  // if (!thisPostId) return []
  // // const baseid = (id) => id.split('/')[0];
  // const thisBaseId = baseid(thisPostId);
  // // console.log('getArticleTranslationAll', baseid(thisPost.id));
  // let translations = allPosts.filter(({id}) => baseid(id) === thisBaseId)
  // if (!all) translations = translations.filter(post => thisPostId != post.id);
  // return translations;
};

export const getArticleTranslations = async (slug, all=false) => {
  const allPosts = await getPublishedArticles();
  const thisPost = allPosts.filter(post => post.data.url === slug)[0];
  if (!thisPost) return []
  const baseid = (id) => id.split('/')[0];
  const thisBaseId = baseid(thisPost.id);
  let translations = allPosts.filter(({id}) => baseid(id) === thisBaseId)
  if (!all) translations = translations.filter(post => thisPost.id != post.id);
  return translations;
}
export const getRelatedPosts = async (slug) => {
 const allPosts = await getPublishedArticles();
 const thisPost = allPosts.filter(post => post.data.url===slug)[0]
 if (!thisPost || !thisPost.data.topics || thisPost.data.topics.length<1) return []
 const topicsSet = new Set(thisPost.data.topics); // without repitition
 const hasIntersection = (set, arr) => arr.some(item => set.has(item)); // why here?
 // now find all posts with topics in our set
 const relatedPosts = allPosts.filter((entry)=>{
   let isIntersection = hasIntersection(topicsSet, entry.data.topics);
   let isSameArticle = entry.id === thisPost.id;
   let isSameLanguage = entry.data.language === thisPost.data.language;
   // Now use the hasIntersection function by passing the Set and the array
   return isIntersection && !isSameArticle && isSameLanguage;
 });
 // sort posts by date
 relatedPosts.sort((a, b) => b.data.datePublished - a.data.datePublished);
 return relatedPosts;
}
// TODO: instead of a nested query, gather all aricles and filter them
export const getSitemapArticles = async () => {
  // const isPublished = (data) => !data.draft && data.datePublished <= new Date();
  // const basePosts = await getCollection('posts', ({ data }) => data.lang === 'en' && isPublished(data));
  const allPosts = await getPublishedArticles();
  const enPosts = allPosts.filter(post => (post.language==='en' || !post.language));
  const getTranslations = (id) => allPosts
    .filter(post => post.id.split('/')[0] = id.split('/')[0])
    .filter(post => id != post.id);
  // const enPosts = await getPublishedArticles('en');
  const sitemapArticles = enPosts.map((post) => { // this assumes a url at base
    const translations = getTranslations(post.id);
    const urlSet = {
      loc: post.data.url, // The primary article URL
      alternates: translations.map(alt => ({
        href: alt.data.url, // The alternate article URL TODO: check this!
        lang: alt.data.language // The language of the alternate article
      }))
    };
    return urlSet;
  });
  // const sitemapArticles = await Promise.all(sitemapArticlesPromises);
  return sitemapArticles;
};




// ********* POST tools
export const getArticleImageURL = async (slug, filename, full=false) => {
  let path = ''
  filename = filename.replace('./', '');
  let image = await getArticleImage(slug, filename);
  if (image) path = image.src;
  if (full) return site.url + path;
   else return path
}
export const getArticleAssetURL = async (slug, filename, full=false) => {
  if (!slug) return;
  let path
  let ar = await getPostFromSlug(slug);
  filename = filename.replace('./', '');
  path = '/posts/' + ar.id.split('/')[0] + '/' + filename;
  if (full) return site.url + path;
   else return path
}
export const generateArticleImage = async (imgfile, post=null, baseUrl="", width, height=100, format='webp', quality=80, alt="") => {
  alt = alt || post.data.title;
  let empty ={src:'', width, height, alt}
  if (!imgfile) return empty;
  // http image
  if (imgfile.startsWith('http')) return displayImageObj(imgfile, alt, width, height, format, quality);
  // local images need a post object to locate the asset file
  try {
    if (!post || !post.id) { console.error('generateArticleImage: post not found'); return empty; }
    // console.log('base url', baseUrl);
    baseUrl = baseURL(baseUrl);
    // console.log('baseUrl', baseUrl);
    const asset = imgfile.replace('./', ''),
          imageKey = `/src/content/posts/${post?.id?.split('/')[0]}/${asset}`,
          images = await import.meta.glob('/src/content/posts/**/*.{jpeg,jpg,png,gif,webp,avif,svg}');
    const imageModule = images[imageKey];
    // failed to locate
    if (!imageModule) { console.error(`Image not found: ${imageKey}`); return empty; }
    // turn file into url
    const imageResult = await getImage({ src: imageModule(), width, height, format, quality });
    // console.log('generateArticleImage', { imageResult });
    const fullUrl = baseUrl + imageResult.src;
    // console.log('generateArticleImage', { fullUrl, width, height, format, quality, alt});
    return { src: fullUrl, width, height, alt };
  } catch (e) { console.error('Error processing local image:', e); return empty; }
};
export const getArticleImage = async (slug, filename, post=null) => {
  // return null;
//  console.log('getArticleImage', slug, filename);
  const entry = post || await getPostFromSlug(slug);
  const assetFolder = entry.id?.split('/')[0]
  const asset = filename.replace('./', '');
  const imagekey = `/src/content/posts/${assetFolder}/${asset}`;
  const images = await import.meta.glob('/src/content/posts/*/*.{jpeg,jpg,png,gif,webp,avif,svg}');
  const image = images[imagekey];
  if (!image) return console.error(`Image not found: ${imagekey}:`, images);
  try {
    return (await image())?.default;
  } catch (e) { console.error('getArticleImageURL', e); return null; }
}
export const getArticleAudioPath = async (slug, filename) => {
  // return '';
  // console.log('getArticleAudioPath', slug)
  const entry = await getPostFromSlug(slug);
  if (!entry) return console.error('getArticleAudioPath: entry not found:', slug, filename);
  const assetFolder = entry.id?.split('/')[0]
  const asset = filename.replace('./', '');
 //  console.log('getArticleAudioPath', `/${assetFolder}/${asset}`);
  return `/posts/${assetFolder}/${asset}`
}
// TODO: make this work with S3 links
export const getArticleAudioSize = async (slug, filename) => {
  // return 0;
  const entry = await getPostFromSlug(slug);
  // console.log('getArticleAudioPath', slug, filename)
  const assetFolder = ''+entry.id?.split('/')[0]
  const asset = filename.replace('./', '');
  const fullPath = path.resolve(process.cwd(), 'src/content/posts', assetFolder, asset);
  const stats = fs.statSync(fullPath);
  return stats.size; // Size in bytes
}
export const getArticleSlugFromURL = (url) => {
  // return '';
  let cleanURL = url.replace(/\/$/, ''); // remove trailing slash
  const pathname = new URL(cleanURL).pathname;
  // Decode the pathname to handle encoded characters
  const decodedPathname = decodeURIComponent(pathname);
  return decodedPathname.split('/').filter(Boolean).pop();
}




// ***************** Topics
export const getTopics = async (filter = ()=>true) => {
  // first load topics from the data collection
  let allTopics = (await getCollection('topics'))
  let allFaqs = (await getCollection('faqs'))
  let topics =  allTopics.map(topic => {
    let {topic_slug: id, topic: name, description} = topic.data;
    let {data} = allFaqs.find(f => f.id === id);
    let {title, faqs} = data;
    return {id, name, description, title, faqs, image:'', type:'collection' }
  });
  // then load topics from the database
  let dbTopics = (await db.select().from(Topics)).map(({id, title, name, description, image, faqs}) =>  {
    let result = { id, title, name, description, image, faqs };
    // there are some bugs in drizzle/libsql wherein json objects are returned as strings. Deal with it:
    if (result && typeof result.faqs === 'string') try {
      result.faqs = JSON.parse(result.faqs);
    } catch (e) {
      console.error('JSON error:', e);
      result.faqs = [];
    }
    return result
  });
  // merge the two lists without duplications of id into a new array
  let mergedMap = new Map(topics.map(topic => [topic.id, topic]));
  dbTopics.forEach(dbTopic => mergedMap.set(dbTopic.id, dbTopic));
  let merged = Array.from(mergedMap.values());
  // filter the two lists & return result
  return merged.filter(filter);
}
export const updateTopic = async (values) => {
  let {id, name, title, description, image, faqs} = values;
  if (!id) return false;
  // unsluggify name from id with title case
  if (!name) name = id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  if (!faqs) faqs = [];
  faqs = JSON.stringify(faqs);

  try {
    if ((await db.select().from(Topics).where(eq(Topics.id, id))).length > 0) {
      // console.log(`Matching topic for "${id}" found, updating...`);
       await db.update(Topics).set({id, name, title, description, image, faqs}).where(eq(Topics.id, id));
    } else {
      //console.log(`No topic for "${id}" found, inserting...`);
       await db.insert(Topics).values({id, name, title, description, image, faqs})
     }
    return true;
  } catch (e) { console.error('updateCategory', e); return false; }
}
export const getTopic = async (id) => {
  // console.log('getTopic', id);
  // check if topic is an object or a string
  let result;
  if (!id) return result;
  let topic = await getDataCollectionEntry('topics', id);
  let faq = await getDataCollectionEntry('faqs', id);
  if (topic && faq) { // data collection
    const {topic: name, description} =  topic.data;
    const {title, faqs} = faq.data;
    result = { id, name, title, image: '', description, faqs };
// console.log('getTopic, from collection:', result);
  } else { // db
    result = (await db.select().from(Topics).where(eq(Topics.id, topic)))?.pop();
    // there are some bugs in drizzle/libsql wherein json objects are returned as strings. Deal with it:
    if (result && typeof result.faqs === 'string') try {
      result.faqs = JSON.parse(result.faqs);
    } catch (e) {
      console.error('JSON error:', e);
      result.faqs = [];
    }
  }
  return result;
}


// ***************** Comments

export const getComments = async (filter = () => true) => {
  return (await db.select().from(Comments)).filter(filter)
}
export const getCommentsForPost = async (postId) => {
  return await db.select().from(Comments).where(eq(Comments.postid, postId));
}
export const getComment = async (id) => {
  return (await db.select().from(Comments).where(eq(Comments.id, id)))[0];
}
export const getUnmoderatedComments = async () => {
  return await db.select().from(Comments).where(eq(Comments.moderated, false));
}
export const updateComment = async (comment) => {
  // fields are: {id, parentid, postid, name, content, date, starred}
  // console.log('updateComment', comment);
  try {
    if ((await db.select().from(Comments).where(eq(Comments.id, comment.id))).length > 0) {
      // console.log(`Matching comment for "${comment.id}" found, updating...`);
      delete comment.date; // this should not be updated
      await db.update(Comments).set(comment).where(eq(Comments.id, comment.id));
    } else {
      const {id, parentid, postid, name, content} = comment;
     // console.log(`Inserting new comment...`, {id, parentid, postid, name, content});
      await db.insert(Comments).values({id, parentid, postid, name, content})
     }
    return comment;
  } catch (e) { console.error('updateComment', e); return false; }
}
export const deleteComment = async (id) => {
  return await db.delete(Comments).where(eq(Comments.id, id));
}
export const deleteCommentsBatch = async (ids) => {
  //console.log('deleteCommmentsBatch', ids);
  if (!ids || ids.length<1) return;
  // delete with an array of ids in a single request
  await db.delete(Comments).where(inArray(Comments.id, ids));
}
// TODO: do in a single batch request?
export const updateCommentsBatch = async (comments) => {
  await comments.forEach(async comment => await updateComment(comment));
}
export const setModeratedBatch = async (ids) => {
 // console.log('setModeratedBatch', ids);
  if (!ids || ids.length<1) return;
  await db.update(Comments).set({moderated: true}).where(inArray(Comments.id, ids));
}
export const setStarredBatch = async (ids) => {
  if (!ids || ids.length<1) return;
  await db.update(Comments).set({starred: true}).where(inArray(Comments.id, ids));
}
export const moderateComments_openai = async () => {
  let allComments = await getUnmoderatedComments();
  // console.log('moderateComments_openai', allComments.length, allComments[0]);
  // call the api to moderate
  const postids = [...new Set(allComments.map(comment => comment.postid))];
  // console.log('moderating '+allComments.length+' comments for '+postids.length+' posts');
  for (const postid of postids) {
    const description = (await getPostFromSlug(postid))?.data?.description;
    const postComments = allComments.filter(c => c.postid === postid);
    // console.log('postComments for postid', postid, postComments[0]);
    const moderatedComments = await moderateComments(postComments, description);
    const approved = moderatedComments.filter(c => c.moderated).map(c => c.id)
    const starred = moderatedComments.filter(c => c.moderated && c.starred).map(c => c.id)
    const toDelete = moderatedComments.filter(c => !c.moderated).map(c => c.id)
    //console.log(`Page (${postid}):`, {approved, starred, toDelete});
    // set moderated in batch
    await setModeratedBatch(approved);
    // set starred in batch
    await setStarredBatch(starred);
    // delete comments that were not approved with an array of ids
    await deleteCommentsBatch(toDelete);
  }
}





// ***************** categories
export const getCategories = async (filter = () => true) => {
   let categories = (await db.select().from(Categories))
     .map(row=>({id: row.id, type: "db", collection: 'categories', data: row})).filter(filter);
  //  console.log('getCategories', categories);
   return categories;
}
export const getCategory = async (id) => {
  if (!id) return null;
  // let start = new Date().getTime();
  let match = (await db.select().from(Categories).where(eq(Categories.id, id)).limit(1));
  // let end = new Date().getTime();
  // console.log('getCategory', id, 'time:', end-start);
  if (!match || match.length<1) return null;
  else {
    match = match[0];
    return { id: match.id, type: "db", collection: 'categories', data: match };
  }
}
export const categoryExists = async (id) => {
  return (await db.select().from(Categories).where(eq(Categories.id, id))).length > 0
}
export const updateCategory = async (values) => {
  let {id, category, description, image} = values;
  if (!id || !category || !description || !image) return false;
  try {
    if (await categoryExists(id)) {
      //  console.log(`Matching category for "${id}" found, updating...`);
       await db.update(Categories).set({id, category, description, image}).where(eq(Categories.id, id));
    } else {
      // console.log(`No category for "${id}" found, inserting...`);
       await db.insert(Categories).values({id, category, description, image})
     }
    return true;
  } catch (e) { console.error('updateCategory', e); return false; }
}
export const deleteCategory = async (id) => {
  return await db.delete(Categories).where(eq(Categories.id, id));
}


// ***************** Team
// TODO: simplify formatting to not use data collection format
export const getTeam = async (filter = () => true) => {
  let team = (await db.select().from(Team))
    .map(row=>({id: row.id, type: "db", collection: 'team', data: row})).filter(filter);
  // console.log('getTeam', team);
  return team;
}
export const getTeamWithRole = async () => {
  // drizzle or libsql do not merge tables, so we need to do it manually -- we just need the user role
  const members = (await db.select().from(Team).leftJoin(Users, eq(Team.email, Users.email)))
    .map(m => ({ ...m.Team, role: m.Users?.role || 'author' }));
  return members;
}
export const getTeamMember = async (slug) => { // formatted like data collection
 slug = slug?.id || `${slug}`; // handle either reference or string
//  console.log('getTeamMember', slug);
 if (!slug) return null;
 let match = (await db.select().from(Team).where(eq(Team.id, slug)))[0];
 if (match) return { id: match?.id, type: "db", collection: 'team', data: match };
}
export const getTeamMemberBySlug = async (slug) => {
  // drizzle does not merge tables, so we need to do it manually -- we just need the user role
  const member = (await db.select().from(Team).where(eq(Team.id, slug)).leftJoin(Users, eq(Team.email, Users.email)))
    .map(m => ({ ...m.Team, role: m.Users?.role || 'author' }))[0];
  return member;
}
export const getTeamMemberByEmail = async (email) => {
  // drizzle does not merge tables, so we need to do it manually -- we just need the user role
  const member = (await db.select().from(Team).where(eq(Team.email, email)).leftJoin(Users, eq(Team.email, Users.email)))
    .map(m => ({ ...m.Team, role: m.Users?.role || 'author' }))[0];
  return member;
}
export const deleteTeamMember = async (slug) => {
  return await db.delete(Team).where(eq(Team.id, slug));
}
// TODO: query for user id instead of using 'isNew'
export const updateTeamMember = async (member, isNew) => {
  let success = true
  if (isNew) {
    // insert
    if ((await db.select().from(Team).where(eq(Team.email, member.email))).length>0) throw new Error(`Email "${member.email}" already in use`);
    if ((await db.select().from(Team).where(eq(Team.id, member.id))).length>0) throw new Error(`ID "${member.id}" already in use`);

    const {role, email} = member; delete member.role;
    await db.insert(Team).values({ ...member });
    await db.update(Users).set({ role }).where(eq(Users.email, email));
    // console.log('Inserted new team member', member);
  } else {
    // update
    const {role, email, id} = member; delete member.role;
    await db.update(Team).set({ ...member }).where(eq(Team.id, id));
    await db.update(Users).set({ role }).where(eq(Users.email, email));
    // console.log('Updated team member', member);
  }
  return success;
}



// ***************** MISC -- actual Utils

/**
 * Exportable component to render a JSON object as an HTML table with Tailwind CSS for compactness.
 * @param data - The JSON object to be rendered as a table.
 * @param columns - Array with names for the columns.
 * @returns A string containing the HTML markup for the table.
 */
export const JSONTable = (data, columns = ['Key', 'Value']) => {

  // console.log('JSONTable', data);
  if (!data) {
    console.error('JSONTable: no data provided');
    return '';
  }

  let tableRows = "";
  Object.keys(data).forEach((key) => {
    tableRows += `<tr class="border-b last:border-b-0">
                    <td class="px-2 py-1 text-sm">${key}</td>
                    <td class="px-2 py-1 text-sm whitespace-nowrap">${JSON.stringify(data[key], null, 2)}</td>
                  </tr>`;
  });
  return `
    <table class="w-full text-left table-fixed">
      <thead>
        <tr class="bg-gray-100">
          <th class="w-1/3 px-2 py-1 text-xs font-semibold">${columns[0]}</th>
          <th class="w-2/3 px-2 py-1 text-xs font-semibold">${columns[1]}</th>
        </tr>
      </thead>
      <tbody class="bg-white">
        ${tableRows}
      </tbody>
    </table>
  `;
}
export const guessContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg': return 'image/jpeg';
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.avif': return 'image/avif';
    case '.svg': return 'image/svg+xml';
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.ogg': return 'audio/ogg';
    case '.pdf': return 'application/pdf';
    case '.doc': return 'application/msword';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls': return 'application/vnd.ms-excel';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.ppt': return 'application/vnd.ms-powerpoint';
    case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.txt': return 'text/plain';
    case '.csv': return 'text/csv';
    default: return 'application/octet-stream';
  }
}
export const uploadS3 = async (base64Data, Key, ContentType='', Bucket='') => {
  // Configuring the AWS region and credentials
  const region = process.env.AWS_BUCKET_REGION; // 'us-east-1'
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  AWS.config.update({ region, accessKeyId, secretAccessKey });
  ContentType = ContentType || guessContentType(Key)
  Bucket = process.env.AWS_BUCKET_NAME;

// console.log('uploadS3 process.env.AWS_BUCKET_REGION', process.env.AWS_BUCKET_REGION);
// console.log('uploadS3 process.env.AWS_ACCESS_KEY_ID', process.env.AWS_ACCESS_KEY_ID);
// console.log('uploadS3 process.env.AWS_BUCKET_NAME', process.env.AWS_BUCKET_NAME);

  // Convert base64 string to binary buffer
  const Body = Buffer.from(base64Data, 'base64');
  // Create an S3 instance
  const s3 = new AWS.S3();
  // Setting up S3 upload parameters
  const params = {  Bucket, Key, Body, ContentType };
  try {
    const data = await s3.upload(params).promise();
    //console.log(`File uploaded successfully at ${data.Location}`);
    return data.Location;
  } catch (err) {
   // console.error('Error uploading file:', err);
    throw err;
  }
}
export const transformS3Url = (url = '', width = null, height = null, format = 'webp', quality=0) => {
  url = url || '';
  if (!url.includes('.s3.')) return url;
  const imagePath = new URL(url).pathname;
  let params = [];
  if (width) params.push(`w=${width}`);
  if (height) params.push(`h=${height}`);
  // set default quality
  if (quality===0 && width<400) quality = 100; else if (quality===0) quality = 80;
  params.push(`fm=${format}`, `q=${quality}`, `fit=crop`, `crop=faces`);
  // sharpen small images
  if (width<400) params.push('usm=20&usmrad=20'); else params.push('sharp=20')
  // add watermark ??
  // if (site.logo.includes('.s3.')) {
    // url encode site.logo to make a watermark
  // const watermark = Buffer.from(site.logo).toString('base64')
  // Base64.urlsafe_encode64(site.logo).delete('=')
  // params.push(`mark64=${watermark}`);//, `mark-alpha=10`, `mark-scale=10`);

  //  &mark64=aHR0cHM6Ly9iYWhhaS1lZHVjYXRpb24ub3JnL2Zhdmljb24uc3Zn&mark-scale=10&mark-alpha=10
  // }
  return `${site.img_base_url}${imagePath}?${params.join('&')}`;
}
export const displayImageObj = (url, alt='', width=0, height=0, format='webp', quality=80) => {
  return {
    src: transformS3Url(url, width, height, format, quality),
    width, height, alt, isExternal: true
  }
}
export const baseURL = (Astro) => {
  let url = typeof Astro === 'string' ? Astro : Astro?.url?.href;
  if (!url) url = site.url;
  return url?.split('/').slice(0,3)?.join('/');
}
export const seedSuperUser = async () => {
  const email = import.meta.env.SITE_ADMIN_EMAIL.trim().toLowerCase();
  const userFound = (await db.select().from(Users).where(eq(Users.email, email))).length;
  const name = site.author;
  const id = slugify(name);
  const role = 'superadmin';
  const hashed_password = await argon2.hash(import.meta.env.SITE_ADMIN_PASS.trim());
  const user = { id, name, email, hashed_password, role };
  if (!userFound) try {
   // console.log('Adding super user:', user);
    await db.insert(Users).values(user);
  } catch (e) { console.error('seedSuperUser user', e); }

  // and initial team member attributes
  const memberFound = (await db.select().from(Team).where(eq(Team.email, email))).length;
  if (!memberFound) {
    const title = 'Author, Editor';
    const image_src = site.author_image;
    const image_alt = `Author - ${site.author}`;
    const external = false;
    const jobTitle = 'Staff Writer, Editor';
    const type = 'Person';
    const url = `${site.url}/authors/${id}`;
    const worksFor_type = 'Organization';
    const worksFor_name = site.siteName;
    const description = site.author_bio;
    const sameAs_linkedin = site.linkedin.publisher;
    const sameAs_twitter = site.twitter.creator;
    const sameAs_facebook = site.facebook.author;
    const description_125 = site.author_bio.slice(0, 125);
    const description_250 = site.author_bio.slice(0, 250);
    const biography = site.author_bio;
    const teamMember = { id, name, title, image_src, image_alt, external, email, isFictitious: false, jobTitle, type, url, worksFor_type, worksFor_name, description, sameAs_linkedin, sameAs_twitter, sameAs_facebook, description_125, description_250, biography };
    try {
     // console.log('Adding super user to team:', teamMember);
      await db.insert(Team).values(teamMember); }
    catch (e) { console.error('seedSuperUser team:', e); }
  }
}
export const currentURL = (Astro) => {
  // Ensure the URL doesn't end with a slash
  let cleanURL = Astro.url.href.replace(/\/$/, '');
  cleanURL = cleanURL.replace('[::1]', 'localhost'); // for dev
  // Decode the URL to handle encoded characters
  return decodeURIComponent(cleanURL);
}

export const hashstr = (str, len=8) => {
  let hash = btoa(String(str.split('').reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0) >>> 0)); // Generate Base64 encoded hash
  return hash.slice(0, len)
}
// export const langFlag(lang) {
//   return mainLanguages[lang]?.flag;
// }
export const getUsedLanguages = async () => {
  const articles = await getPublishedArticles()
  const inLanguageList = (lang) => !!mainLanguages[lang];
  const inSiteList = (lang) => !!site.languages.includes(lang);
  let languages = new Set();
  // add any found language
  articles.forEach((post) => languages.add(post.data.language));
  // now convert back to array
  languages = Array.from(languages).filter(inLanguageList).filter(inSiteList)
  return languages;
}
export const mainLanguages = {
  en: { flag: "🇬🇧", name: "English", dir: "ltr", en_name: "English" },
  zh: { flag: "🇨🇳", name: "中文", dir: "ltr", en_name: "Chinese" },
  hi: { flag: "🇮🇳", name: "हिन्दी", dir: "ltr", en_name: "Hindi" },
  es: { flag: "🇪🇸", name: "Español", dir: "ltr", en_name: "Spanish" },
  fr: { flag: "🇫🇷", name: "Français", dir: "ltr", en_name: "French" },
  ar: { flag: "🇸🇦", name: "العربية", dir: "rtl", en_name: "Arabic" },
  bn: { flag: "🇧🇩", name: "বাংলা", dir: "ltr", en_name: "Bengali" },
  ru: { flag: "🇷🇺", name: "Русский", dir: "ltr", en_name: "Russian" },
  pt: { flag: "🇧🇷", name: "Português", dir: "ltr", en_name: "Portuguese" },
  ur: { flag: "🇵🇰", name: "اردو", dir: "rtl", en_name: "Urdu" },
  id: { flag: "🇮🇩", name: "Bahasa Indonesia", dir: "ltr", en_name: "Indonesian" },
  de: { flag: "🇩🇪", name: "Deutsch", dir: "ltr", en_name: "German" },
  ja: { flag: "🇯🇵", name: "日本語", dir: "ltr", en_name: "Japanese" },
  sw: { flag: "🇹🇿", name: "Kiswahili", dir: "ltr", en_name: "Swahili" },
  mr: { flag: "🇮🇳", name: "मराठी", dir: "ltr", en_name: "Marathi" },
  he: { flag: "🇮🇱", name: "עברית", dir: "rtl", en_name: "Hebrew" },
  fa: { flag: "🇮🇷", name: "فارسی", dir: "rtl", en_name: "Persian" },
  ro: { flag: "🇷🇴", name: "Română", dir: "ltr", en_name: "Romanian" },
  it: { flag: "🇮🇹", name: "Italiano", dir: "ltr", en_name: "Italian" },
  tr: { flag: "🇹🇷", name: "Türkçe", dir: "ltr", en_name: "Turkish" }
}
export const slugify = (text) => {
  return slugifier(text,  {
    lower: true, // convert to lower case
    strict: true, // strip special characters except replacement
    remove: /[*+~.()'"!:@]/g, // remove characters that match regex, replace with replacement
  })
}

export const sanitizeHTML = (rawHTML) => {
  const window = new JSDOM('').window;
  const DOMPurify = createDOMPurify(window);
  return DOMPurify.sanitize(rawHTML);
}

export const renderMarkdown = (md) => {
  const rawHTML = marked(md);
  return sanitizeHTML(rawHTML);
};

export const buildToc = (post) => {
  const headings = MDHeadings(post.body);
  const toc = [], parentHeadings = new Map();
  headings.forEach(h => {
    const heading = { ...h, subheadings: [] };
    parentHeadings.set(heading.depth, heading);
    if (heading.depth === 2 || heading.depth === 3) {
      toc.push(heading);
    } else if (heading.depth > 3) {
      parentHeadings.get(heading.depth - 1)?.subheadings.push(heading);
    }
  });
  return toc;
}

export const MDHeadings = (mdContent) => {
  const headings = [];
  const renderer = new marked.Renderer();
  // Capture the original heading function of the renderer
  const originalHeading = renderer.heading.bind(renderer);
  // Override the heading function to extract headings
  renderer.heading = (text, level, raw, slugger) => {
    const slug = slugify(text);  // Ensure the slug is URL-friendly
    headings.push({ depth: level, text, slug });
    return originalHeading(text, level, raw, slugger);  // Call the original function to maintain default behavior
  };
  // Render the markdown to activate the custom renderer
  marked(mdContent, { renderer });
  return headings;
};

export const sanitizeInput = (str, maxlength = null) => {
  // Remove all script tags and everything between them
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove html tags
  str = str.replace(/<[^>]*>/g, '');
  // Replace special characters but not foreign language characters or basic punctuation
  str = str.replace(/[^\w\s.,!?:;'"’“”-]/gu, '');
  // Change all tabs to spaces
  str = str.replace(/\t/g, ' ');
  // Collapse all whitespace (except line breaks) to single spaces
  str = str.replace(/[ \t]+/g, ' ');
  // Collapse line breaks (with optional whitespace) to single line breaks
  str = str.replace(/(\n\s*){3,}/g, '\n\n');
  // Replace HTML entities with their character
  str = str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
  // Trim whitespace from sides
  str = str.trim();
  // If maxlength is set, truncate to that length
  if (maxlength && str.length > maxlength) str = str.substring(0, maxlength);
  return str;
}
export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const toIsoStringWithTimezone = (d) => {
  let z = n => ('0' + n).slice(-2),
      off = d.getTimezoneOffset(),
      sign = off < 0 ? '+' : '-',
      padHours = z(Math.floor(Math.abs(off) / 60)),
      padMinutes = z(Math.abs(off) % 60);
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) +
         'T' + z(d.getHours()) + ':' + z(d.getMinutes()) + ':' + z(d.getSeconds()) +
         sign + padHours + ':' + padMinutes;
}

// server only

export const crontasks = async () => {
  // long running and expensive tasks on the server
  await moderateComments_openai();
  await importAllPosts2DB();
}
export const poorMansCron = async () => {
  // Call crontask by API if more than 5 minutes since last call
  const previousCron = (await db.select().from(Cron).where(eq(Cron.task, 'cronjob')))[0];
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
  const oneMinute = 60 * 1000; // 1 minute in milliseconds
  const timeSince = (previousTime) => (new Date()-oneMinute)
  if (!previousCron) {
    // If no last call time is recorded, insert a new record
    await db.insert(Cron).values({ task: 'cronjob' });
    // await crontasks();
  } else if (previousCron && (timeSince(previousCron.time) > fiveMinutes)) {
    // If more than 5 minutes have passed since the last call
    try {
      await crontasks();
    } finally {
      // Update the time after tasks are done
      await db.update(Cron).set({ time: new Date() }).where(eq(Cron.task, 'cronjob'));
    }
  }
}



// ***************** Deprecated

// in order to migrate data collections to the DB, we need to write a
// wrapper function which fetches both the data collection and the data entry
// TODO: phase this out entirely (only comments remain)
export const getDataCollection = async (collection, filter = () => true) => {
  let  collectionItems = await getCollection(collection, filter);
  // let table = null;
  // let dbMatches = [];
  // if (collection === 'categories') table = Categories;
  //  else if (collection === 'faqs') table = Faqs;
  //  else if (collection === 'keywords') table = Keywords;
  //  else if (collection === 'team') table = Team;

  // if (table) dbMatches = (await db.select().from(table))
  //   .map(row=>({id: row.id, type: "db", collection, data: row})).filter(filter);
  // Create a map to override local items with dbMatches based on id
  // const merged = new Map(dbMatches.map(item => [item.id, item]));
  // local.forEach(item => merged.set(item.id, item)); // Local items are added, but don't override existing dbMatches
  // return Array.from(merged.values());

  // console.log('getDataCollection', collection, dbMatches);

  return collectionItems;
}
export const getDataCollectionEntry = async (collection, id) => {
  return await getEntry(collection, id)


  // let match = null, table = null;
  // if (collection === 'categories') table = Categories;
  // //  else if (collection === 'faqs') table = Faqs;
  // //  else if (collection === 'keywords') table = Keywords;
  // //  else if (collection === 'team') table = Team;

  // // first try to fetch from the database
  // if (table) match = (await db.select().from(table).where(  eq(table.category_slug, id) ))[0];
  // if (match) match = { id, collection, data: match } // format like an astro content entry
  //  else match = await getEntry(collection, id); // fall back on file system
  // return match;
}
export const getDataCollectionImage = async (collection, filename, imageType={format: 'jpg', width: 1000, height: 700}) => {
  if (!filename) return null;
  const {width, height, format} = imageType;
  if (filename.startsWith('http')) {
    //  https://bahai-education.org/_astro/bahai-literature.BmmHKzrh_2072vy.webp
    // later, when we use an image CDN, we can modify the url to set the size & format
    let finalImage;
    if (filename.includes(".s3.")) { // add s3 bucket later to be more specific
      let finalFormat = format || filename.split('.').pop();
      let newUrl = transformS3Url(filename, width, height, finalFormat, 80);
      finalImage = {width, height, format: finalFormat, src: newUrl, isExternal: true}
    } else finalImage = {width, height, format: format || filename.split('.').pop(), src: filename, isExternal: true}
    // console.log('finalImage http', finalImage);
    return finalImage;
  }
  const imagekey = `/src/content/${collection.collection}/${filename.replace('./', '')}`;
  const images = await import.meta.glob('/src/content/*/*.{jpeg,jpg,png,gif,webp,avif,svg}');
  const image = images[imagekey];
  if (!image) return console.error(`Image not found: ${imagekey}:`);
  try {
    const src = (await image())?.default;
    const dest = await getImage({ src, format, width, height }); // process according to request
    const finalImage = { src: dest.src,  width: dest.attributes.width, height: dest.attributes.height, format: dest.format || format };
    // console.log('finalImage', finalImage);
    return finalImage;
  } catch (e) { console.error('getDataCollectionImage', e); return null; }
}



// TODO: deprecated - for physical manipulation of Markdoc file
export const loadArticleRaw = async (slug, type='posts') => {
  const entry = await getPostFromSlug(slug);
  const filepath = path.join(process.cwd(), 'src/content', entry.collection, entry.id);
  // console.log('loadArticleRaw filepath:', filepath);
  const filedata = fs.readFileSync(filepath);
  const { data, content } = matter(filedata);
  return { data, content };
}


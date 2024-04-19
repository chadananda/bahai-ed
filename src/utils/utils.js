// utils.js
import slugifier from 'slugify';
import { getCollection, getEntry } from 'astro:content';
// export a slugify function
import path from 'path';
import fs from 'fs';
import matter from 'gray-matter';
import site from '@data/site.json'
import { getImage } from "astro:assets";
import { db, Categories, eq, Team, Users } from 'astro:db';
import AWS from 'aws-sdk';
import { Buffer } from 'buffer';

export const slugify = (text) => {
  return slugifier(text,  {
    lower: true, // convert to lower case
    strict: true, // strip special characters except replacement
    remove: /[*+~.()'"!:@]/g, // remove characters that match regex, replace with replacement
  })
}

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
};


export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const loadArticleRaw = async (slug, type='posts') => {
  const entry = await getPostFromSlug(slug);
  const filepath = path.join(process.cwd(), 'src/content', entry.collection, entry.id);
  // console.log('loadArticleRaw filepath:', filepath);
  const filedata = fs.readFileSync(filepath);
  const { data, content } = matter(filedata);
  return { data, content };
}


// tools to translate a url into a file path for processing

export const getPublishedArticles = async (lang='', filter=()=>true) => {
  const isDev = import.meta.env.APP_ENV==='dev';
  const isPublished = (p) => (!p.data.draft && p.data.datePublished<=new Date()) || isDev;
  return (await getAllArticles(lang, (p)=>isPublished(p))).filter(filter);
}

export const getAllArticles = async (lang='', filter=()=>true) => {
  const isBlank = (p) => p.data.url.toLowerCase().trim() === 'blank';
  const isLangMatch = (p) => !!lang ? p.data.language === lang : true;
  const articles = (await getCollection('posts', (p)=>isLangMatch(p) && !isBlank(p)))
  .filter(filter);
  articles.sort((a, b) => b.data.datePublished - a.data.datePublished);
  return articles;
}

export const getPostFromSlug = async (slug) => {
  // return null;
  // console.log('getPostFromSlug - looking for post with slug:', slug);
  const post = (await getCollection('posts', (post)=>post.data?.url===slug))?.pop();
  if (!post) console.error('getPostFromSlug - post not found:', slug);
  return post;
}
export const getArticleURL = (Astro) => {
  // Ensure the URL doesn't end with a slash
  let cleanURL = Astro.url.href.replace(/\/$/, '');
  cleanURL = cleanURL.replace('[::1]', 'localhost'); // for dev
  // Decode the URL to handle encoded characters
  return decodeURIComponent(cleanURL);
}

export const getArticleSlugFromURL = async (url) => {
  // return '';
  let cleanURL = url.replace(/\/$/, ''); // remove trailing slash
  const pathname = new URL(cleanURL).pathname;
  // Decode the pathname to handle encoded characters
  const decodedPathname = decodeURIComponent(pathname);
  return decodedPathname.split('/').filter(Boolean).pop();
}
export const getArticleImageURL = async (slug, filename, full=false) => {
  let path = ''
  filename = filename.replace('./', '');
  let image = await getArticleImage(slug, filename);
  if (image) path = image.src;
  if (full) return site.url + path;
   else return path
}
export const getArticleAssetURL = async (slug, filename, full=false) => {
  let path
  let ar = await getPostFromSlug(slug);
  filename = filename.replace('./', '');
  path = '/posts/' + ar.id.split('/')[0] + '/' + filename;
  if (full) return site.url + path;
   else return path
}

export const transformS3Url = (url, width = null, height = null, format = 'webp', quality = 80) => {
  if (!url.includes('.s3.')) return url;
  const imagePath = new URL(url).pathname;
  let params = [];
  if (width) params.push(`w=${width}`);
  if (height) params.push(`h=${height}`);
  // params.push(`fm=${format}`, `q=${quality}`);
  params.push(`fm=${format}`, `q=${quality}`, `fit=crop`, `crop=faces`);
  return `${site.img_base_url}${imagePath}?${params.join('&')}`;
}

export const getDataCollectionImage = async (collection, filename, imageType={format: 'jpg', width: 1000, height: 700}) => {
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

export const getArticleImage = async (slug, filename) => {
  // return null;
//  console.log('getArticleImage', slug, filename);
  const entry = await getPostFromSlug(slug);
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

export const getArticleTranslations = async (slug, all=false) => {
  const entry = await getPostFromSlug(slug);

  // console.log('getArticleTranslations', slug, entry.id);

  const folder = entry.id?.split('/')[0];
  const idmatch = (id) => id.split('/')[0] === folder;
  const translations = await getCollection('posts', (post)=> {
    // should share base folder but not match id completely
    if (all) return idmatch(post.id);
     else return idmatch(post.id) && post.id !== entry.id;
  });
  // console.log('matching translations', translations.length);
  return translations;
}

export const getRelatedPosts = async (slug) => {
//  return [];
 const thisPost = await getPostFromSlug(slug);
 const topicsSet = new Set(thisPost.data.topics); // without repitition
 const hasIntersection = (set, arr) => arr.some(item => set.has(item));
 const isPublished = ({data}) => (!data.draft && data.datePublished<=new Date());
 // get all posts, filtered to those who share the same topics
 const relatedPosts = await getCollection("posts", (entry)=>{
   let isIntersection = hasIntersection(topicsSet, entry.data.topics);
   let isSameArticle = entry.id === thisPost.id;
   let isSameLanguage = entry.data.language === thisPost.data.language;
   // Now use the hasIntersection function by passing the Set and the array
   return isIntersection && !isSameArticle && isSameLanguage && isPublished(entry);
 });
 // sort posts by date
 relatedPosts.sort((a, b) => b.data.datePublished - a.data.datePublished);
 return relatedPosts;
}

// returns a set of all languages found in published articles
export const getAllLanguages = async () => {
  // return new Set();
  const isPublished = ({data}) => (!data.draft && data.datePublished<=new Date());
  const isDev = import.meta.env.APP_ENV==='dev';
  const publishedPosts = await getCollection("posts", (ar) => (isPublished(ar) || isDev));
  // add all languages to a set
  const languages = new Set();
  publishedPosts.forEach((post) => languages.add(post.data.language));
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
};




// import { getSitemapArticles } from '@utils/utils.js';
export const getSitemapArticles = async () => {
  const isPublished = (data) => !data.draft && data.datePublished <= new Date();
  const baseArticles = await getCollection('posts', ({ data }) => data.lang === 'en' && isPublished(data));
  const sitemapArticlesPromises = baseArticles.map(async (post) => {
    const translations = await getArticleTranslations(post.data.url);
    const urlSet = {
      loc: post.data.url, // The primary article URL
      alternates: translations.map(alt => ({
        href: alt.data.url, // The alternate article URL
        lang: alt.data.lang // The language of the alternate article
      }))
    };
    return urlSet;
  });
  const sitemapArticles = await Promise.all(sitemapArticlesPromises);
  return sitemapArticles;
};

// in order to migrate data collections to the DB, we need to write a
// wrapper function which fetches both the data collection and the data entry
export const getDataCollection = async (collection, filter = () => true) => {
  const local = await getCollection(collection, filter);
  let table = null;
  let dbMatches = [];
  if (collection === 'categories') table = Categories;
  //  else if (collection === 'faqs') table = Faqs;
  //  else if (collection === 'keywords') table = Keywords;
  //  else if (collection === 'team') table = Team;

  // if (table) dbMatches = (await db.select().from(table)).map(row=>({id: row.category_slug, collection, data: row})).filter(filter);
  // Create a map to override local items with dbMatches based on id
  const merged = new Map(dbMatches.map(item => [item.id, item]));
  local.forEach(item => merged.set(item.id, item)); // Local items are added, but don't override existing dbMatches
  return Array.from(merged.values());
}

export const getDataCollectionEntry = async (collection, id) => {
  let match = null
  let table = null;
  if (collection === 'categories') table = Categories;
  //  else if (collection === 'faqs') table = Faqs;
  //  else if (collection === 'keywords') table = Keywords;
  //  else if (collection === 'team') table = Team;

  // first try to fetch from the database
  // if (table) match = (await db.select().from(table).where(  eq(table.category_slug, id) ))[0];
  if (match) match = { id, collection, data: match } // format like an astro content entry
   else match = await getEntry(collection, id); // fall back on file system
  return match;
}

export const updateCategory = async (category, isNew) => {
  let success = true
  if (isNew) {
    console.log('Inserting category', category);
    // insert if category not already found
    const alreadyExists = (await db.select().from(Categories).where(eq(Categories.id, category.id))).length;
    if (alreadyExists) {
      console.log('Category name is already in use', await db.select().from(Categories).where(eq(Categories.id, category.id)));
      throw new Error('Category name is already in use');
    }
    await db.insert(Categories).values({ ...category });
  } else {
    console.log('Updating category', category);
    // update category
    await db.update(Categories).set({ ...category }).where(eq(Categories.id, category.id));
  }
  return success;
}
export const deleteCategory = async (id) => {
  return await db.delete(Categories).where(eq(Categories.id, id));
}


/**
 * Exportable component to render a JSON object as an HTML table with Tailwind CSS for compactness.
 * @param data - The JSON object to be rendered as a table.
 * @param columns - Array with names for the columns.
 * @returns A string containing the HTML markup for the table.
 */
export const JSONTable = (data, columns = ['Key', 'Value']) => {

  console.log('JSONTable', data);
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
};


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

export const getTeamMembers = async () => {
  // drizzle does not merge tables, so we need to do it manually -- we just need the user role
  const members = (await db.select().from(Team).leftJoin(Users, eq(Team.email, Users.email)))
    .map(m => ({ ...m.Team, role: m.Users?.role || 'author' }));
  // const allMembers = await db.select().from(Team);
  // console.log('getTeamMembers count:', members.length);
  // maybe add in the data collection users
  return members;
}

export const filterTopics = async (topics) => {
  // Filter the topics array based on whether each topic exists in the 'topics' collection
  const filteredTopics = await Promise.all(
    topics.map(async (topic) => {
      try {
        return await getDataCollectionEntry('topics', topic);
      } catch (error) { return false; }
    })
  );
  return filteredTopics.filter(Boolean);
  // Return the filtered topics or the nonexistent topics based on the 'exists' parameter
  // return exists ? existingTopics : topics.filter(topic => !existingTopics.includes(topic));
}

export const deleteTeamMember = async (slug) => {
  return await db.delete(Team).where(eq(Team.id, slug));
}

export const updateTeamMember = async (member, isNew) => {
  let success = true
  if (isNew) {
    // insert
    if (await db.select().from(Team).where(eq(Team.email, member.email))) throw new Error('Email already in use');
    if (await db.select().from(Team).where(eq(Team.id, member.id))) throw new Error('Name already in use');

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
  Bucket = Bucket || process.env.AWS_BUCKET_NAME;
// console.log('uploadS3', Key, ContentType, Bucket);
  // Convert base64 string to binary buffer
  const Body = Buffer.from(base64Data, 'base64');
  // Create an S3 instance
  const s3 = new AWS.S3();
  // Setting up S3 upload parameters
  const params = {  Bucket, Key, Body, ContentType };
  try {
    const data = await s3.upload(params).promise();
    // console.log(`File uploaded successfully at ${data.Location}`);
    return data.Location;
  } catch (err) {
    console.error('Error uploading file:', err);
    throw err;
  }
};



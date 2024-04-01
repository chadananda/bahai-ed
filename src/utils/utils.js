// utils.js

import slugifier from 'slugify';
import { getCollection } from 'astro:content';
// export a slugify function
import path from 'path';
import fs from 'fs';
import matter from 'gray-matter';
import brand from '@data/branding.json'

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
  //const entry = await getEntry(type, slug);
  const entry = await getPostFromSlug(slug);
  const filepath = path.join(process.cwd(), 'src/content', entry.collection, entry.id);
  console.log('loadArticleRaw filepath:', filepath);
  const filedata = fs.readFileSync(filepath);
  const { data, content } = matter(filedata);
  return { data, content };
}


// tools to translate a url into a file path for processing

export const getPublishedArticles = async (lang='') => {
  const isPublished = (p) => !p.data.draft && p.data.datePublished<=new Date();
  const isLangMatch = (p) => !!lang ? p.data.language === lang : true;
  const articles = await getCollection('posts', (p)=>isPublished(p) && isLangMatch(p));
  // sort by date
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
  if (full) return brand.url + path;
   else return path
}
export const getArticleAssetURL = async (slug, filename, full=false) => {
  let path
  let ar = await getPostFromSlug(slug);
  filename = filename.replace('./', '');
  path = '/posts/' + ar.id.split('/')[0] + '/' + filename;
  if (full) return brand.url + path;
   else return path
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
  console.log('matching translations', translations.length);
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




export const prerender = true;

import site from '@data/site.json';
import rss from '@astrojs/rss';
import { getArticleAudioSize, getArticleAudioPath, getAllLanguages, getPublishedArticles } from '@utils/utils.js';
import { getImage } from "astro:assets";

const mainLanguages = {
  es: { flag: "🇪🇸", name: "Español", dir: "ltr", en_name: "Spanish" },
  en: { flag: "🇬🇧", name: "English", dir: "ltr", en_name: "English" },
  zh: { flag: "🇨🇳", name: "中文", dir: "ltr", en_name: "Chinese" },
  ar: { flag: "🇸🇦", name: "العربية", dir: "rtl", en_name: "Arabic" },
  hi: { flag: "🇮🇳", name: "हिन्दी", dir: "ltr", en_name: "Hindi" },
  fa: { flag: "🇮🇷", name: "فارسی", dir: "rtl", en_name: "Persian" },
  fr: { flag: "🇫🇷", name: "Français", dir: "ltr", en_name: "French" },
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
  ro: { flag: "🇷🇴", name: "Română", dir: "ltr", en_name: "Romanian" },
  it: { flag: "🇮🇹", name: "Italiano", dir: "ltr", en_name: "Italian" },
  tr: { flag: "🇹🇷", name: "Türkçe", dir: "ltr", en_name: "Turkish" }
 };

// const isPublished = ({data}) => (!data.draft && data.datePublished<=new Date());
const hasAudio = ({data}) => !!data.audio;
// const isDev = import.meta.env.APP_ENV==='dev';

export const getPodcastArticles = async (lang) => {
  // const posts = await getCollection("posts", (ar) => {
  //   return isPublished(ar) && hasAudio(ar) && (ar.data.language===lang);
  // });
  // return posts;
  return await getPublishedArticles(lang, hasAudio);
}

export async function getStaticPaths() {
  const languages = await getAllLanguages();
   // Convert Set to Array and generate paths
  const paths = Array.from(languages).map((language) => {
    // console.log( { params: { language: `${language}` } } )
    return { params: { language: `${language}` } };
  });
  return paths;
}

const iso8601DurToBytes = (duration, bitrate = 64) => {
  const [_, hours, minutes, seconds] = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/).map(t => parseInt(t) || 0);
  return ((hours * 3600 + minutes * 60 + seconds) * bitrate * 125);
}

const ISO8601ToiTunes = (isoDuration) => {
  const match = isoDuration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (match) {
    const hours = String(parseInt(match[1] || 0)).padStart(2, '0');
    const minutes = String(parseInt(match[2] || 0)).padStart(2, '0');
    const seconds = String(parseInt(match[3] || 0)).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  return null;
};



export const processItems = async (articles, site, baseUrl) => {
  const items = await Promise.all(articles.map(async post => {
    const localAudio = post.data.audio.startsWith('http') ? false : true;
    // marshall audio file
    const audioURL = localAudio ? baseUrl + (await getArticleAudioPath(post.data.url, post.data.audio)) : post.data.audio;
    const audioSize = localAudio ? await getArticleAudioSize(post.data?.url, post.data.audio) :
       post.data.audio_length || iso8601DurToBytes(post.data.audio_duration);
    const imagePath = !!post.data.audio_image ? (await getImage({src: post.data.audio_image, format: 'jpg'})).src : ''
    const imageURL = baseUrl + imagePath

    let author = false
    if (!!post.data.author) {
      author = await getDataCollectionEntry(post.data.author?.collection, post.data.author?.id);
    }

    const itunes_duration = ISO8601ToiTunes(post.data.audio_duration);
    return {
      title: post.data.title,
      pubDate: new Date(post.data.datePublished).toUTCString(),
      description: post.data.description,
      content: post.data.abstract,
      author: author?.data?.name || site.author,
      description: post.data.abstract,
      enclosure: { url: audioURL, type: "audio/mpeg", length: audioSize },
      link: `${baseUrl}/${post.data?.url}`,
      commentsUrl: `${baseUrl}/${post.data?.url}#comments`,
      categories: post.data.topics,
      customData: [
        // `<image src="${ imageURL }" />`
        `<itunes:image href="${ imageURL }" />`,
        `<itunes:duration>${itunes_duration}</itunes:duration>`,
        `<itunes:explicit>no</itunes:explicit>`,
        `<itunes:subtitle>${post.data.desc_125}</itunes:subtitle>`,
        `<itunes:author>${author?.data?.name || site.author}</itunes:author>`,
        `<itunes:summary>${post.data.abstract}</itunes:summary>`,
        `<itunes:keywords>${post.data.keywords?.join(', ')}</itunes:keywords>`,
        // needs itunes:category and subcategory
        `<itunes:category text="${site.podcast.category}"> <itunes:category text="${site.podcast.subcategory}" /></itunes:category>`,
      ].join(` `)
    };
  }));
  return items;
}

export const generateRSSFeedObj = async (articles, language, site, baseUrl) => {
  const langname = mainLanguages[language].name;
  const title = site.siteName + (language!='en' ? ` (${langname})` : '');
  const feed = {
    stylesheet: '/rss-podcast.xsl',
    title: title,
    author: site.site,
    description: site.description,
    site: site.url,
    trailingSlash: false,
    language,
    xmlns: {
      itunes: 'http://www.itunes.com/dtds/podcast-1.0.dtd',
      podcast: 'https://podcastindex.org/namespace/1.0',
      atom: 'http://www.w3.org/2005/Atom'
    },
    customData: [
      `<description>${site.description}</description>`,
      `<itunes:author>${site.author}</itunes:author>`,
      `<language>${language}</language>`,
      `<itunes:category text="${site.podcast.category}"><itunes:category text="${site.podcast.subcategory}" /></itunes:category>`,
      `<itunes:image href="${site.logo_jpg}" />`,
      `<itunes:explicit>no</itunes:explicit>`,
      `<atom:link href="${baseUrl}/podcast/${language}.xml" rel="self" type="application/rss+xml" />`,
      `<image>
        <url>${site.logo_jpg}</url>
        <title>${site.siteName}</title>
        <link>${site.url}</link>
      </image>`,
      `<itunes:owner><itunes:name>${site.author}</itunes:name><itunes:email>${site.email}</itunes:email></itunes:owner>`,
    ].join(' '),
    items: await processItems(articles, site, baseUrl)
  };

  return feed;
};



export async function GET({ params, request }) {
  const baseUrl = new URL(request?.url).origin;
  const language = params.language;
  // all articles matching language, filtered by having audio
  const articles = await getPodcastArticles(language)
//  console.log(`${articles.length} articles found with podcast audio in "${language}"`);
  const feed = await generateRSSFeedObj(articles, language, site, baseUrl);
  // console.log('rss feed', feed);
  return rss(feed);
}



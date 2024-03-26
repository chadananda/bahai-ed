/**
 * Script: build_assets.js
 * Purpose: Build additional assets for the articles on this site
 * Features:
 *   - Loads each article and builds or updates translation file
 *   - Loads each article and builds or updates podcast audio using elevenlabs
 * Requirements:
 *   - OpenAI API key in a .env file at the root.
 *   - External npm packages for HTTP requests, YAML conversion, and slugification.
 *   - Node.js environment.
 * Usage:
 *   - Accepts category name as input, works from the list of topics in the [category].yaml
 *   - Processes each topic in the category to generate topic files and FAQ files.
 *   - Saves the results as YAML and an associated image in the specified directory.
 * Note:
 *   - Includes error handling and logging for API interactions and file operations.
 */

import yaml from 'js-yaml';
import slugifier from 'slugify';
// import inquirer from 'inquirer';
import fsPromises from 'fs/promises';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { object, string, array } from "zod";
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import pLimit from 'p-limit'; // throttle the number of concurrent tasks
const throttle = pLimit(1); // Set the concurrency limit to 1 translation task at a time
import fg from 'fast-glob';
import matter from 'gray-matter';
import Markdoc from '@markdoc/markdoc';
import markdoc_config from '../../markdoc.config.js';

import { mainLanguages, genericJSONPrompt, genericStringPrompt } from "./_script_utils.js";


// export const mainLanguages = {
//   es: { flag: "🇪🇸", name: "Español", dir: "ltr", en_name: "Spanish" },
//   en: { flag: "🇬🇧", name: "English", dir: "ltr", en_name: "English" },
//   zh: { flag: "🇨🇳", name: "中文", dir: "ltr", en_name: "Chinese" },
//   ar: { flag: "🇸🇦", name: "العربية", dir: "rtl", en_name: "Arabic" },
//   hi: { flag: "🇮🇳", name: "हिन्दी", dir: "ltr", en_name: "Hindi" },
//   fa: { flag: "🇮🇷", name: "فارسی", dir: "rtl", en_name: "Persian" },
//   fr: { flag: "🇫🇷", name: "Français", dir: "ltr", en_name: "French" },
//   bn: { flag: "🇧🇩", name: "বাংলা", dir: "ltr", en_name: "Bengali" },
//   ru: { flag: "🇷🇺", name: "Русский", dir: "ltr", en_name: "Russian" },
//   pt: { flag: "🇧🇷", name: "Português", dir: "ltr", en_name: "Portuguese" },
//   ur: { flag: "🇵🇰", name: "اردو", dir: "rtl", en_name: "Urdu" },
//   id: { flag: "🇮🇩", name: "Bahasa Indonesia", dir: "ltr", en_name: "Indonesian" },
//   de: { flag: "🇩🇪", name: "Deutsch", dir: "ltr", en_name: "German" },
//   ja: { flag: "🇯🇵", name: "日本語", dir: "ltr", en_name: "Japanese" },
//   sw: { flag: "🇹🇿", name: "Kiswahili", dir: "ltr", en_name: "Swahili" },
//   mr: { flag: "🇮🇳", name: "मराठी", dir: "ltr", en_name: "Marathi" },
//   he: { flag: "🇮🇱", name: "עברית", dir: "rtl", en_name: "Hebrew" },
//   ro: { flag: "🇷🇴", name: "Română", dir: "ltr", en_name: "Romanian" },
//   it: { flag: "🇮🇹", name: "Italiano", dir: "ltr", en_name: "Italian" },
//   tr: { flag: "🇹🇷", name: "Türkçe", dir: "ltr", en_name: "Turkish" }
// };

// dotenv.config();
// const openai = new OpenAI({ apiKey: process.env.OPENAI });

// const slugify = (text) => {
//   return slugifier(text,  {
//     lower: true, // convert to lower case
//     strict: true, // strip special characters except replacement
//     remove: /[*+~.()'"!:@]/g, // remove characters that match regex, replace with replacement
//   })
// }

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const SCRIPT_HELP = `
Usage: node _build_assets.js ...
       node _build_assets.js --help

Arguments:
- --help                   : Displays this help message.

Description:
This script loads articles looking for one that has missing or outdated translation or audio files.
Translation will be build with OpenAI API and audio will be build with ElevenLabs API.`;

const TRANSLATE_HEADER = {
 // generate a category JSON object
 // requires the argument "category"
 schema: object({
    title: string(),
    url: string(),
    description: string(),
    desc_125: string(),
    abstract: string()
 }),
 schema_str: `object({ title: string().max(60),  url: string().url(), description: string().max(150), desc_125: string().max(120), abstract: string().max(1000) })`,
 system_instructions: "You are an expert blogger with detailed knowledge about this article topic in both English and [language]. You take great joy in crafting timeless quality translations and it is not uncommon that your translations are even more eloquent and readable than the original article, while still being completely accurate to the facts presented. ",
 model: 'gpt-4-1106-preview',
 prompt: `You are tasked with translating the fields in this data object from English into [language]. Be careful to never exceed the maximum character limits defined by the ZOD schema. If necessary, slightly re-word to make it fit.

 The fields will be:

 title: must be < 60 characters
 url: Translate title into a [language] slug. When possible, use the [language] script.
 description: must be < 150 characters
 abstract: must be < 500 characters
 desc_125: must be < 120 characters

 ENGLISH DATA OBJECT:

 [data]

 `
};

const TRANSLATE_CONTENT = {
 // generate a translation of our JSON object
 system_instructions: "You are an expert blogger with detailed knowledge about this article topic in both English and [language]. You take great joy in crafting timeless quality translations and it is not uncommon that your translations are even more eloquent and readable than the original article, while still being completely accurate to the facts presented. ",
 model: 'gpt-4-1106-preview',
 prompt: `You are tasked with translating this portion of a MarkDoc article (Markdoc is a superset of Markdown) from English into [language]. Be careful to keep all the Markdown and Markdoc (and any HTML) formatting intact and to only translate the text portions. Otherwise, feel free to make adjustments to the text to ensure that it reads very naturally in [language].

 Important: Do not output additional text or explanation or any additional markup or code blocks and do not wrap the translation in a markdown code block. Do not translate file names or urls. Alt text can be translated if it is a description of an image.

  ENGLISH ARTICLE PORTION TO TRANSLATE:

[content]
 `
};

// generic JSON comment prompt
// const genericJSONPrompt = async (PROMPT, args={}) => {
//  try {
//    // insert values from args
//    var prompt = PROMPT.prompt
//    var instructions = 'You are a helpful and competent assistant who can output in JSON format ' + PROMPT.system_instructions + "... so output only JSON with a format matching this Zod schema: "+PROMPT.schema_str;
//    Object.keys(args).forEach(function(key) {
//       // Use a global regex to replace all instances
//       const regex = new RegExp(`\\[${key}\\]`, 'g');
//       prompt = prompt.replace(regex, args[key]);
//       instructions = instructions.replace(regex, args[key]);
//    });
//    const FULL_REQUEST = {
//     model: PROMPT.model || 'gpt-4-1106-preview',
//     response_format: { "type": "json_object" },
//     messages: [
//       {"role": "system", "content": instructions},
//       {"role": "user", "content": prompt}
//     ]
//    }
//   //  console.log('FULL_REQUEST', JSON.stringify(FULL_REQUEST.messages[0].content, null, 2));
//    // step one, generate the JSON
//    const VALIDATOR = PROMPT.schema;
//    let attempt = 0, validJSON = false;
//    while (attempt++ <=2) {
//      // fetch a response from the OpenAI API
//      const response = await openai.chat.completions.create(FULL_REQUEST);
//      try {
//        const resJSON = JSON.parse(response.choices[0].message.content); // openai returns JSON
//       //  console.log('validating:', JSON.stringify(resJSON, null, 2));
//        validJSON = VALIDATOR.parse(resJSON) // zod validates the object
//      } catch (error) {
//         console.error(`Error validating JSON, trying again`, error.message);
//         continue;
//        }
//      if (validJSON) break;
//    }
//    if (!!validJSON) return validJSON
//     else throw new Error(`Error calling OpenAI: ${error.message}`);
//  } catch (error) {
//    throw error;
//  }

// }


// const genericStringPrompt = async (PROMPT, args = {}, retries = 1) => {
//   const retryDelay = 1100; // 1 second
//   const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
//   try {
//     let prompt = PROMPT.prompt;
//     let instructions = PROMPT.system_instructions;
//     Object.keys(args).forEach((key) => {
//       const regex = new RegExp(`\\[${key}\\]`, 'g');
//       prompt = prompt.replace(regex, args[key]);
//       instructions = instructions.replace(regex, args[key]);
//     });
//     const FULL_REQUEST = {
//       model: PROMPT.model || 'gpt-4-turbo-preview',
//       response_format: {type: 'text'},
//       messages: [
//         { "role": "system", "content": instructions },
//         { "role": "user", "content": prompt }
//       ]
//     };
//     // console.log('calling openai with prompt:', FULL_REQUEST.messages[1].content);
//     return (await openai.chat.completions.create(FULL_REQUEST)).choices[0].message.content;
//   } catch (error) {
//     // console.error(`Error calling OpenAI: ${error.message}`, 'might try again');
//     if (retries > 0) {
//       console.log(`Retrying... attempts left: ${retries}`);
//       await sleep(retryDelay);
//       return await genericStringPrompt(PROMPT, args, retries - 1); // Decrement retries and try again
//     } else {
//       throw error; // Rethrow error if no retries left
//     }
//   }
// };


// const translateContent = async (content, language) => {
//   if (!content) return '';
//   const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
//   const MAX_WORDS = 2000 / 1.5; // Based on 1.5 tokens per English word approximation.
//   const PROMPT = TRANSLATE_CONTENT; // Assuming this is predefined somewhere.
//   const languageName = mainLanguages[language].en_name;
//   const lines = content.split('\n');
//   let chunks = [];
//   let currentChunk = [];
//   let currentWordCount = 0;
//   lines.forEach(line => {
//     const lineWordCount = line.split(/\s+/).length;
//     if (currentWordCount + lineWordCount > MAX_WORDS) {
//       chunks.push(currentChunk.join('\n'));
//       currentChunk = [];
//       currentWordCount = 0;
//     }
//     currentChunk.push(line);
//     currentWordCount += lineWordCount;
//   });
//   if (currentChunk.length > 0) chunks.push(currentChunk.join('\n'));
//   // Modify here to introduce a delay
//   // let delay = 0; // Initial delay
//   const DELAY_INCREMENT = 1100; // Delay increment for each task slightly so OpenAI doesn't get overwhelmed
//   const translationTasks = chunks.map((chunk, index) => async () => {
//     await sleep(index * DELAY_INCREMENT); // Delay increases with each task
//     console.log('translating chunk', index+1, ':', chunk.trim().split('\n')[0].slice(0, 100), '...');
//     return genericStringPrompt(PROMPT, { language: languageName, content: chunk });
//   });
//   console.log(`Translating ${translationTasks.length} chunks into `, languageName);
//   const translatedChunks = await Promise.all(translationTasks.map(task => task()));
//   console.log('Translated chunks:', translatedChunks.join('\n'));

//   return translatedChunks.join('\n');
// };

// const translateContent = async (content, language) => {
//   if (!content) return '';
//   const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
//   const MAX_WORDS = 2000 / 1.5; // Based on 1.5 tokens per English word approximation.
//   const PROMPT = TRANSLATE_CONTENT; // Assuming this is predefined somewhere.
//   const languageName = mainLanguages[language].en_name;

//   // Splitting based on double-line-breaks with optional whitespace characters around them
//   const blocks = content.split(/\n\s*\n/);
//   let chunks = [];
//   let currentChunk = [];
//   let currentWordCount = 0;

//   blocks.forEach(block => {
//     // Counting words in the current block
//     const blockWordCount = block.trim().split(/\s+/).filter(Boolean).length;
//     if (currentWordCount + blockWordCount > MAX_WORDS || (currentChunk.length > 0 && block.trim().startsWith('#'))) {
//       chunks.push(currentChunk.join('\n\n'));
//       currentChunk = [];
//       currentWordCount = 0;
//     }
//     currentChunk.push(block);
//     currentWordCount += blockWordCount;
//   });

//   if (currentChunk.length > 0) chunks.push(currentChunk.join('\n\n'));
//   const DELAY_INCREMENT = 1100; // Delay increment for each task slightly so OpenAI doesn't get overwhelmed

//   const translationTasks = chunks.map((chunk, index) => async () => {
//     await sleep(index * DELAY_INCREMENT); // Delay increases with each task
//     console.log('Translating chunk', index+1, ':', chunk.trim().split('\n')[0].slice(0, 100), '...');
//     return genericStringPrompt(PROMPT, { language: languageName, content: chunk });
//   });

//   console.log(`Translating ${translationTasks.length} chunks into `, languageName);
//   const translatedChunks = await Promise.all(translationTasks.map(task => task()));
//   console.log('Translated chunks:', translatedChunks.join('\n\n')); // Join with double-line-breaks to preserve original structure

//   return translatedChunks.join('\n\n');
// };


const translateContent = async (content, language) => {
  if (!content) return '';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const MAX_WORDS = 2000 / 1.5;
  const PROMPT = TRANSLATE_CONTENT;
  const languageName = mainLanguages[language].en_name;
  const RETRY_LIMIT = 3;
  const DELAY_INCREMENT = 1100;
  const blocks = content.split(/\n\s*\n/);
  let chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;
  blocks.forEach(block => {
    const blockWordCount = block.trim().split(/\s+/).filter(Boolean).length;
    if (currentWordCount + blockWordCount > MAX_WORDS || (currentChunk.length > 0 && block.trim().startsWith('#'))) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [];
      currentWordCount = 0;
    }
    currentChunk.push(block);
    currentWordCount += blockWordCount;
  });
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }
  const translateWithRetries = async (chunk, index, attempt = 0) => {
    try {
      console.log(`Translating chunk ${index + 1}, attempt ${attempt + 1}`);
      // Pre-validate the original Markdoc content
      const preAst = Markdoc.parse(chunk);
      const preErrors = Markdoc.validate(preAst, markdoc_config);
      let shouldValidateAfterTranslation = preErrors.length === 0;
      if (preErrors.length > 0) {
        console.warn(`Pre-validation warning for chunk ${index + 1}: ${preErrors.map(e => e.error.message).join(', ')}`);
      }
      const translatedChunk = await genericStringPrompt(PROMPT, { language: languageName, content: chunk });
      if (shouldValidateAfterTranslation) {
        // Post-validation: Validate the translated text using Markdoc
        const postAst = Markdoc.parse(translatedChunk);
        const postErrors = Markdoc.validate(postAst, markdoc_config);
        if (postErrors.length > 0) {
          console.error(`Validation error in chunk ${index + 1} on attempt ${attempt + 1}: ${postErrors.map(e => e.error.message).join(', ')}`);
          if (attempt < RETRY_LIMIT - 1) {
            await sleep(DELAY_INCREMENT); // Wait before retrying
            return await translateWithRetries(chunk, index, attempt + 1); // Retry translation
          } else {
            throw new Error(`Failed to translate chunk ${index + 1} after ${RETRY_LIMIT} attempts due to post-validation errors`);
          }
        }
      }
      return translatedChunk;
    } catch (error) {
      console.error(`Error in chunk ${index + 1} on attempt ${attempt + 1}:`, error);
      if (attempt < RETRY_LIMIT - 1) {
        await sleep(DELAY_INCREMENT); // Wait before retrying
        return await translateWithRetries(chunk, index, attempt + 1); // Retry with the same content
      } else {
        throw new Error(`Failed to process chunk ${index + 1} after ${RETRY_LIMIT} attempts`);
      }
    }
  };
  const translationTasks = chunks.map((chunk, index) => () => translateWithRetries(chunk, index));
  console.log(`Translating ${chunks.length} chunks into ${languageName}`);
  // Execute all translation tasks and wait for them to settle
  const results = await Promise.allSettled(translationTasks.map(task => task()));
  // Check if any of the translations failed or returned empty
  const hasFailureOrEmpty = results.some(result => result.status === 'rejected' || result.value === '');
  if (hasFailureOrEmpty) {
    console.error('Translation failed: Some chunks did not translate successfully or returned empty.');
    throw new Error('Translation process failed due to invalid chunk translation.');
  } else {
    const translatedChunks = results.map(result => result.value);
    return translatedChunks.join('\n\n');
  }
};

const translateData = async (data, language, oldSlug='') => {
  // return data; // shortcut out for testing
  const PROMPT = TRANSLATE_HEADER
  let trData = { ...data };
  const en_data = {
    title: data.title,
    url: data.url,
    description: data.description,
    desc_125: data.desc_125,
    abstract: data.abstract
  }
  const languageName = mainLanguages[language].en_name;
  const dataStr = JSON.stringify(en_data, null, 3);
  // console.log('translating data:', dataStr, 'into', languageName);
  const tr_data = await genericJSONPrompt(PROMPT, {language: languageName, data: dataStr})
  // console.log('received tr_data', tr_data);
  trData.title = tr_data.title;
  trData.url = oldSlug ? oldSlug : tr_data.url; // if we already had a translated slug, don't change it
  trData.description = tr_data.description.slice(0, 159);
  trData.desc_125 = tr_data.desc_125.slice(0,124);
  trData.abstract = tr_data.abstract;
  trData.language = language;
  trData.translator = 'auto';
  // remove audio field to force re-generation
  trData.audio = '';
  trData.audio_duration = '';
  trData.narrator = 'auto';

  return trData;
}

const translateArticle = async ({ trFilePath, language, data, content }, delayMs=1000) => {
  await sleep(delayMs);
  const trContentPromise = translateContent(content, language);

  // check to see if a translated slug already exists
  let oldSlug = '';
  if (fs.existsSync(trFilePath)) {
    const { data } = matter(fs.readFileSync(trFilePath));
    if (data.url) oldSlug = data.url;
  }
  const trDataPromise = translateData(data, language, oldSlug);
  // resolve both simultaneously and then write to file when both are done
  try {
    const [trContent, trData] = await Promise.all([trContentPromise, trDataPromise]);
    // if (typeof trData === "string") {
    //   console.error('Error, JSON data needs converted to OBJ!!', trData);
    //   return;
    // }
    const trFileData = `---\n${yaml.dump(trData)}---\n\n${trContent}`;
    const id = trFilePath.split('/')[12]+'/'+trFilePath.split('/')[13]
    console.log('Writing to file:', id, `\n`);
    // console.log('--- File data:', `\n`, JSON.stringify(trFileData, null, 3));
    // console.log('--- File content: ',`\n`, trContent.slice(0, 100));
    fs.writeFileSync(trFilePath, trFileData);
  } catch (error) {
    console.error(`Error: into ${mainLanguages[language].en_name}:`, data.title.slice(0,25), error);
  }
}

const getArticleList = async () => {
  const cwd = process.cwd(); // Current working directory
  const pattern = `${cwd}/src/content/posts/*/index.mdoc`;
  const excludePattern = `!${cwd}/src/content/posts/blank/index.mdoc`;
  let articles = await fg(pattern, { ignore: [excludePattern] });
  // filter out unpublished articles
  console.log('All Articles:', articles.length);
  articles = articles.filter(ar => {
    const { data } = matter(fs.readFileSync(ar));
    return !data.draft && new Date(data.datePublished) <= new Date();
  });
  console.log('Published Articles:', articles.length);
  return articles;
}

const needsUpdated = async (dateModified, trFilePath) => {
  // console.log('Checking for translation file:', trFilePath, fs.existsSync(trFilePath));
  try {
    // const trFile = fs.readFileSync(trFilePath);
    const { data } = matter(fs.readFileSync(trFilePath));
    // console.log('Read file data');
    const updated = new Date(data.dateModified) !== new Date(dateModified);
    // console.log('Matches file date:', updated);
    const manualTranslation = (data.translator || 'auto') !== 'auto';
    // console.log('Manual translation:', manualTranslation);
    if (!updated && !manualTranslation) console.log('Translation needed although file exists:', trFilePath, updated, manualTranslation);
    if (!updated && !manualTranslation) return true;
  } catch {
    console.log('Translation needed because translation file not found.', trFilePath);
   return true;
  }
}

const translateArticleTasks = async (path) => {
  // load article
  const trTasks = [];
  const { data, content } = matter(fs.readFileSync(path));
  if (data.draft || data.url==='blank') return trTasks;
  const allLanguages = Object.keys(mainLanguages).filter(lang => lang!=='en');
  // create task for each language
  for (var i = 0; i < allLanguages.length; i++) {
    const language = allLanguages[i];
    const trFilePath = path.replace('index.mdoc', `${language}.mdoc`);
    if (await needsUpdated(data.dateModified, trFilePath)) {
      trTasks.push({ trFilePath, language, data, content });
    }
  }
  return trTasks;
}

const main = async () => {
  const articles = (await getArticleList());
  let translationTasks = [];
  // gather up all the translation tasks
  articles.forEach(async (article, index) => {
    // create an array of throttled tasks
    const trTasks = (await translateArticleTasks(article))
      // wrap each task in a function call
      .map(trTask => async () => { await translateArticle(trTask, (index+1)*5000); }) // add a minimum additional delay for each translation task
      // wrap each function call in a throttle
      .map(trTask => throttle(trTask));
    // add the tasks to the major throttled list
    translationTasks = translationTasks.concat(trTasks);
  })
  // run the throttled task list
  try {
    await Promise.all(translationTasks);
    console.log('** All translations processed.');
  } catch (error) { console.error(' XX A throttle process error occurred:', error) }
}

main().catch(error => console.error(' xx An overall error occurred:', error));



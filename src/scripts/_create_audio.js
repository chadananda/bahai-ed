/**
 * Script: create_audio.js
 * Purpose: Build audio assets for the articles on this site
 * Features:
 *   - Loads each article and builds podcast audio using elevenlabs
 * Requirements:
 *   - Elevenlabs API key in a .env file at the root.
 *   - Node.js environment.

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
import { ElevenLabsClient, stream } from "elevenlabs";
// import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { exec } from 'child_process';
const execPromise = promisify(exec);
import site from '../data/site.json' assert { type: 'json' };

import {mainLanguages, genericStringPrompt, getAudioDuration, saveArticleMdoc, addID3toMP3, uploadS3} from './_script_utils.js';




// dotenv.config();
// const openai = new OpenAI({ apiKey: process.env.OPENAI });


// const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const TTS_PROMPT_LITERAL = `
Adjust the provided historic text in [language] into a TTS-ready narration script with the following guidelines:

1. Preserve Original Wording: Maintain the original text as much as possible, ensuring the historical context and language are untouched.

2. Keep <break> Tags: Retain <break> tags around headers for deliberate pauses. Do not add additional pauses for these headers.

3. Insert Natural Pauses: Use ellipses (...) to denote natural speech pauses, enhancing listener comprehension without altering the text.

4. Phonetic Conversion for Clarity: Convert words and phrases likely to be mispronounced by TTS to phonetic equivalents without changing their meaning or context, such as:
   - Roman numerals (e.g., "II" to "Two")
   - Abbreviations and acronyms (e.g., "Dr." to "Doctor")
   - Dates and numbers for clarity (e.g., "1845" to "Eighteen Forty-Five")

5. Maintain Lists and Enumerations: Keep the structure of lists or bullet points clear with pauses, but do not rephrase or add introductory phrases that change the original text.

6. Avoid Tone Alterations: Maintain the original narrative tone of the document; do not shift to a conversational tone.

7. Exclude Direct Address: Do not incorporate direct address unless it is part of the original document.

8. Retain Complex Expressions: Do not simplify or rewrite complex phrases; the aim is to keep the historical authenticity intact.

9. Preserve Quotes: Keep quotations exact, without any alterations or rewording.

10. Paragraph Splitting: Split paragraphs at natural sentence pauses with a blank line between each to improve readability for TTS, ensuring no large text blocks are present.

The goal is to produce a narration script that is clear and listener-friendly for TTS and audio consumption, maintaining the integrity and authenticity of the historical document. Provide only the adjusted text in [language] with no additional instructions or comments. This adjustment pertains to a specific portion of the entire document, which may not necessarily be at the beginning or end.

TEXT TO ADJUST:
===============

[text]

`;

const TTS_PROMPT_FLEX = `

Adjust the provided text in [language] into a TTS-ready narration script with the following guidelines:

1. Preserve <break> Tags: Keep <break> tags around headers. These indicate to the TTS engine a deliberate pause for headers. No need to add more pause for these headers.

2. Insert Pauses with Ellipses: Place ellipses (....) in the text to denote natural speech pauses, enhancing listener comprehension and engagement.

3. Phonetic Conversion: Modify words and phrases likely to be mispronounced by TTS to their phonetic equivalents, such as:
   * Roman numerals (e.g., "II" to "Two")
   * Abbreviations and acronyms (e.g., "Dr." to "Doctor")
   * Version numbers and technical terms (e.g., "1.0" to "One Point Oh")

4. Spell Out Numbers and Dates: Clearly articulate numbers and dates (e.g., "the 1800s" to "the eighteen hundreds") to avoid confusion in audio format.

5. Clarify Lists and Enumerations: Clearly separate list or bullet point items with pauses or introductory phrases like "Firstly," "Next," "Additionally," to maintain listener orientation.

6. Narrative Tone: Where appropriate, shift to a conversational tone to make the content more relatable and engaging. Do not depart far from the original text.

7. Direct Address: Use direct address by incorporating words like "you" or "we" to forge a personal connection with the listener.

8. Simplify Complex Expressions: Rewrite or simplify complex phrases into more conversational language to ensure clarity and ease of understanding in audio format. Do not change the text very much, just slight adjustments where necessary.

9. When the article seems to be quoting someone, do not re-word the quote. Keep it as close to the original as possible.

10. Split paragraphs at all natural sentence pauses with a blank line (two line breaks) between each  for clarity. We do not want any large blocks of text which would be hard for TTS to read.

The aim is to craft a narration script that is engaging, clear, and listener-friendly, yet very close to the original text -- while optimizing it for TTS and audio consumption. Provide just the adjusted text in [language] with no additional instructions or comments. You will be adjusting portions of the entire article, so bear in mind that this portion is not necessarily the beginning or end of the article.

TEXT TO ADJUST:
===============

[text]


`;

const TTS_SCRIPT = {
  // generate a translation of our JSON object
  system_instructions: "You are an expert [language] narrator with detailed knowledge about this article topic in [language]. You take great joy in narrating important articles, and it is not uncommon that your narrations are slightly more eloquent and readable than the original article, while still being quite close to the original text. ",
  model: 'gpt-4-1106-preview',
  prompt: TTS_PROMPT_FLEX
 };

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




function extractPlainText(markdocContent, title = '') {
  const ast = Markdoc.parse(markdocContent);
  // const stripDiacritics = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let plainText = '';
  function walk(node) {
    switch (node.type) {
      case 'text':
        if (node.attributes.content) plainText += node.attributes.content;
        break;
      case 'heading':
        plainText += '\n\n\n<break time="1.5s" />';
        if (node.children) node.children.forEach(walk);
        plainText += '<break time="1s" />\n\n';
        break;
      case 'paragraph':
      case 'blockquote':
        plainText += '\n\n';
        if (node.children) node.children.forEach(walk);
        break;
      case 'link':
        if (node.children) {
          node.children.forEach(walk);
          plainText += ' '; // Add a space after links to prevent merging with following text
        }
        break;
      case 'list':
        node.children.forEach((item) => {
          plainText += '\n\n....'; // Add ellipsis and blank line before each list item
          walk(item);
        });
        break;
      case 'listItem':
        if (node.children) node.children.forEach(walk);
        break;
      case 'book-quote':
        if (node.attributes.content) plainText += '\n\n'+node.attributes.content + ' ';
        break;
      default:
        if (node.children) node.children.forEach(walk);
    }
  }

  walk(ast);

  // max three newlines
  plainText = plainText.replace(/(\s*\n\s*){4,}/g, '\n\n\n');


  // add title
  if (title) plainText = title + ' <break time="2s" />\n\n' + plainText;

  // fix the word Baha'i for better pronunciation
  // plainText = plainText.replace(/Bah[aá]['’][ií]/g, 'Bahai').replace(/Baha'i/g, 'Bahai');

  return plainText;
}


const chunkText = (text, maxSize=800) => {
  // split into an array of chunks which are less than maxSize. Split on double-newlines
  let chunks = text.split('\n\n');
  let chunkedText = [];
  let chunk = '';
  for (let i = 0; i < chunks.length; i++) {
    if (chunk.length + chunks[i].length > maxSize) {
      chunkedText.push(chunk);
      chunk = chunks[i];
    } else {
      chunk += '\n\n' + chunks[i];
    }
  }
  chunkedText.push(chunk);
  return chunkedText;
}

// const getAudioDuration = async (filePath) => { //ISO 8601 duration format (PTxHyMzS)
//   try {
//     const { stdout } = await execPromise(`ffmpeg -i "${filePath}" 2>&1 | grep "Duration"`);
//     const durationMatch = stdout.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
//     if (!durationMatch) {
//       throw new Error('Duration not found in the ffmpeg output');
//     }
//     const hours = parseInt(durationMatch[1], 10);
//     const minutes = parseInt(durationMatch[2], 10);
//     const seconds = parseInt(durationMatch[3], 10);
//     // Convert to ISO 8601 duration format (PTxHyMzS)
//     let duration = 'PT';
//     if (hours > 0) duration += `${hours}H`;
//     if (minutes > 0 || hours > 0) duration += `${minutes}M`;
//     if (seconds > 0 || (hours <= 0 && minutes <= 0)) duration += `${seconds}S`;
//     return duration;
//   } catch (error) {
//     console.error('Error getting audio duration:', error);
//     return null;
//   }
// };

// const saveArticleMdoc = (filePath, data, content) => {
//   let fileData = `---\n${yaml.dump(data)}---\n\n`;
//   // here is where we clean things up. We insert a line break before certain yaml fields for readability
//   const fields = ['external_reference', 'draft', 'datePublished', 'category', 'image', 'audio', 'author', 'video_main', 'language', 'relatedBooks'];
//   fields.forEach(field => {
//     fileData = fileData.replace(new RegExp(`\n${field}:`, 'g'), `\n\n${field}:`);
//   });
//   fileData += content;
//   fs.writeFileSync(filePath, fileData);
// }

const narrateAudio = async ({ destFile, data, content }) => {
  const fixBahai = (text) => text.replace(/Bah[aá]['’]?[ií]/gi, "Bahai");
  const PROMPT = {...TTS_SCRIPT, prompt:  data.narrator==='literal'?TTS_PROMPT_LITERAL:TTS_PROMPT_FLEX};
  const language = data.language || 'en';
  const articleID = path.basename(path.dirname(destFile));
  const langName = mainLanguages[language].en_name
  console.log('\n📋 Generating',langName, 'audio for', articleID);
  let text = extractPlainText(content, data.title);
  let chunks = chunkText(text, 2000);
  // convert the chunks into TTS script format
  const chunk2script = async (text, language, index) => {
    await new Promise(resolve => setTimeout(resolve, index*2000));
    console.log(' 📄 Converting text chunk to script ', index+1);
    return genericStringPrompt(PROMPT, {text, language: langName});
  }
  const promises = chunks.map((chunk, index) => chunk2script(chunk, language, index));
  let fullScript = fixBahai((await Promise.all(promises)).join('\n\n'));
  fs.writeFileSync(destFile+'-script.txt', fullScript);
  // now split again
  let maxsize = language === 'en' ? 800 : 400;
  let scripts = chunkText(fullScript, maxsize);
  console.log('📄 Split script into', scripts.length, 'chunks');

  // convert each script into audio
  const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS });
  const model_id = language === 'en' ? 'eleven_multilingual_v1' : 'eleven_multilingual_v2';
  const voice = "Dorothy"; // or Clyde or Charlie or Antoni
  const tempFiles = scripts.map((_, index) => `${destFile}.${index+1}.mp3`);

  const generateAudio = async (chunk, index, delay) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    console.log(' 🎙️  Generating audio segment', index+1, 'length:', chunk.length);
    const audioStream = await elevenlabs.generate({ stream: true, voice, text: chunk, model_id });
    const tempDestFile = `${destFile}.${index+1}.mp3`;
    const writeStream = fs.createWriteStream(tempDestFile);
    audioStream.pipe(writeStream);
    return new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  };

  try {
    const maxAudioRequests = pLimit(3);
    const promises = scripts.map((script, index) => {
      return maxAudioRequests(() => generateAudio(script, index, 5000));
    });
    await Promise.all(promises);

    // Use ffmpeg to merge the audio files
    const mergeCommand = `ffmpeg -y -i "concat:${tempFiles.join('|')}" -acodec copy ${destFile}`;
    await execPromise(mergeCommand);
    console.log('🔊 Audio merged:',path.basename(path.dirname(destFile)) +'/'+  path.basename(destFile));

    // Clean up temporary files
    tempFiles.forEach(file => fs.unlinkSync(file));

    // Update the article with a reference to the new audio file
    const articlePath = path.join(path.dirname(destFile), language==='en'? 'index.mdoc' : `${language}.mdoc`); // let's double-check first:
    const audioName = path.basename(destFile);
    data.audio_duration = await getAudioDuration(destFile); // ISO 8601 format

    // add id3 tags to audio file
    const artist = (data.author || site.author)?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const image = path.join(path.dirname(articlePath), data.image.src);
    let id3 = {
      title: data.title,
      artist,
      album: site.siteName,
      year: new Date(data.datePublished).getFullYear(),
      genre: site.genre,
      comment: data.description.replace(/"/g, '\\"'),
      publisher: site.site,
      url: site.url + '/' + data.url,
      language: data.language || 'en',
      image
    }
    const success = await addID3toMP3(destFile, id3);
    if (success) {
      // get audio file size
      data.audio_length = fs.statSync(destFile).size;
      // upload audio to s3
      console.log('⬆️ Uploading audio file to S3 ');
      data.audio = await uploadS3(destFile, articleID+'/'+audioName, process.env.PODCAST_BUCKET, 'audio/mpeg');
      // update the data file with url
      console.log('💾 Saving article file with updated url data');
      saveArticleMdoc(articlePath, data, content);
      // now remove mp3 destFile
      fs.unlinkSync(destFile);
      // now remove script file
      fs.unlinkSync(destFile+'-script.txt');
    }
  } catch (error) {
    console.error('❌ Error generating audio with ElevenLabs:', error);
  }
};

// alternate approach: s3 bucket for website with audio in folder like:
  // /audio/[id]/[language].mp3
  // /audio/[id]/[language]+[modifiedDate].json

const getArticleList = async () => {
  const cwd = process.cwd(); // Current working directory
  const pattern = `${cwd}/src/content/posts/*/*.mdoc`;
  const excludePattern = `!${cwd}/src/content/posts/blank/index.mdoc`;
  let articles = await fg(pattern, { ignore: [excludePattern] });
  // filter out unpublished articles
  const audioFile = (data, ar) => path.join(path.dirname(ar), `${data.language || 'en'}.mp3`);
  const audioFileNotExists = (data, ar) => !fs.existsSync(audioFile(data, ar));
  const isPublished = (data) => !data.draft && new Date(data.datePublished) <= new Date();
  // needs audio if 'auto' and no audio file exists and no remote file
  const hasLocalFile = (data,ar) => data.audio && audioFileNotExists(data, ar);
  const hasRemoteFile = (data) => data.audio && data.audio.startsWith('http');
  const needsAudio = (data, ar) => data.narrator==='auto' && !hasLocalFile(data,ar) && !hasRemoteFile(data);
  const langFound = (data) => !!mainLanguages[data.language || 'en'];
  // const isArabic = (data) => (data.language || 'en') === 'ar';
  console.log('All Articles:', articles.length);
  articles = articles.filter(ar => {
    const { data } = matter(fs.readFileSync(ar));
    return isPublished(data) && needsAudio(data, ar) && langFound(data); // change
  });
  console.log('Articles Needing Audio:', articles.length);
  return articles;
}


const main = async () => {
  const articles = (await getArticleList());
  let audioTasks = [];
  audioTasks = articles.map(filepath => {
    // make each path into a task
   const { data, content } = matter(fs.readFileSync(filepath));
   let destFile = path.join(path.dirname(filepath), `${data.language || 'en'}.mp3`)
   return { destFile, data, content };
  });
  console.log('All audio tasks:', audioTasks.length);
  // Throttle audio generation tasks
  const throttledTasks = audioTasks.map((task, index) => {
    return throttle(() => narrateAudio(task, index * 10000));
  });
  // run the throttled task list
  try {
    await Promise.all(throttledTasks);
    console.log('** All audio completed.');
  } catch (error) { console.error(' XX A throttle process error occurred:', error) }
}

main().catch(error => console.error(' xx An overall error occurred:', error));



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
// Set the concurrency limit to 1 translation task at a time
import fg from 'fast-glob';
import matter from 'gray-matter';
import Markdoc from '@markdoc/markdoc';
import markdoc_config from '../../markdoc.config.js';
import { ElevenLabsClient, stream } from "elevenlabs";
// import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { exec } from 'child_process';
const execPromise = promisify(exec);

import {saveArticleMdoc, uploadS3} from './_script_utils.js';




function extractPlainText(markdocContent, title = '') {
  const ast = Markdoc.parse(markdocContent);
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


const uploadMainAudio = async ({ audioFile, articleFile, count=0, total=0}) => {
  const articleID = path.basename(path.dirname(articleFile))+'/'+path.basename(articleFile);
  if (count) console.log( count,'/', total, 'Uploading audio for:', articleID);
    else console.log( 'Uploading audio for:', articleID);
  const audioKey = path.basename(path.dirname(audioFile))+'/'+path.basename(audioFile)
  // upload audio file to S3
  const audioURL = await uploadS3(audioFile, audioKey);
  console.log('Audio uploaded:', audioURL);
  if (audioURL) {
    // now write the new url to the article
    const { data, content } = matter(fs.readFileSync(articleFile));
    data.audio = audioURL;
    // save article file
    await saveArticleMdoc(articleFile, data, content);
    // delete audio file from system
    fs.unlinkSync(audioFile);
  }

};



const getArticleList = async () => {
  const cwd = process.cwd(); // Current working directory
  const pattern = `${cwd}/src/content/posts/*/*.mdoc`;
  const excludePattern = `!${cwd}/src/content/posts/blank/index.mdoc`;
  let articles = await fg(pattern, { ignore: [excludePattern] });
  // filter out unpublished articles
  const audioFile = (data, ar) => path.join(path.dirname(ar), `${data.language || 'en'}.mp3`);

  const isPublished = (data) => !data.draft && new Date(data.datePublished) <= new Date();
  const isURL = (data) => !!data.audio && data.audio.startsWith('http');
  const audioExists = (data, ar) => fs.existsSync(audioFile(data, ar));
  const uploadNeeded = (data, ar) => audioExists(data, ar) && !isURL(data);
  console.log('All Articles:', articles.length);
  articles = articles.filter(ar => {
    const { data } = matter(fs.readFileSync(ar));
    return isPublished(data) && uploadNeeded(data, ar);
  });
  console.log('Articles Needing Audio uploading:', articles.length);
  return articles;
}


const main = async () => {
  const uploadThrottle = pLimit(10);
  let articles = (await getArticleList());
  let audioTasks = [];
  console.log(articles.length, 'articles needing audio uploads');
  // articles = articles.slice(0, 10); // limit to 1 for testing
  audioTasks = articles.map((articleFile, index) => {
    // make each path into a task
   const { data, content } = matter(fs.readFileSync(articleFile));
   let audioFile = path.join(path.dirname(articleFile), `${data.language || 'en'}.mp3`)
   return { audioFile, articleFile, count: index+1, total: articles.length };
  });
  // console.log('All audio uploads:', audioTasks.length);
  // Throttle audio generation tasks
  const throttledTasks = audioTasks.map((task, index) => {
    return uploadThrottle(() => uploadMainAudio(task));
  });
  // run the throttled task list
  try {
    await Promise.all(throttledTasks);
    console.log('** All audio completed.');
  } catch (error) { console.error(' XX A throttle process error occurred:', error) }
}

main().catch(error => console.error(' xx An overall error occurred:', error));



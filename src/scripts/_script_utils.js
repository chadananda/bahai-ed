/**
 * Script: _script_util.js
 * Purpose: Tools for building assets
 * Features:
 *   - Loads each article and uploads local assets to S3 bucket to reduce repo size
 */

import yaml from 'js-yaml';
import slugifier from 'slugify';
// import inquirer from 'inquirer';
// import fsPromises from 'fs/promises';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
// import { object, string, array } from "zod";
import OpenAI from 'openai';
// import { fileURLToPath } from 'url';
import pLimit from 'p-limit'; // throttle the number of concurrent tasks
// const throttle = pLimit(1); // Set the concurrency limit to 1 translation task at a time
import fg from 'fast-glob';
import matter from 'gray-matter';
// import Markdoc from '@markdoc/markdoc';
// import markdoc_config from '../../markdoc.config.js';
// import { ElevenLabsClient, stream } from "elevenlabs";
// import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { exec } from 'child_process';
const execPromise = promisify(exec);
import AWS from 'aws-sdk';
// import { splitExtensions } from "@tiptap/core";
import site from '../data/site.json' assert { type: 'json' };
import https from 'https';
import { createWriteStream } from 'fs';

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI });



export const uploadS3 = async (filePath, key, bucketName = '', ContentType="") => {
  if (!ContentType) {
    let ext = path.extname(filePath).toLowerCase();
    if (ext==='mp3') ContentType = 'audio/mpeg';
    else if (ext==='mp4') ContentType = 'video/mp4';
    else if (ext==='jpg' || ext==='jpeg') ContentType = 'image/jpeg';
    else if (ext==='png') ContentType = 'image/png';
    else if (ext==='gif') ContentType = 'image/gif';
    else if (ext==='webp') ContentType = 'image/webp';
    else if (ext==='pdf') ContentType = 'application/pdf';
    else if (ext==='md') ContentType = 'text/markdown';
    else if (ext==='json') ContentType = 'application/json';
    else if (ext==='txt') ContentType = 'text/plain';
    else if (ext==='html') ContentType = 'text/html';
    else if (ext==='xml') ContentType = 'text/xml';
    else if (ext==='webm') ContentType = 'video/webm';
  }
  bucketName = bucketName || process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_BUCKET_REGION; // 'us-east-1'
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  // Configure the AWS region and credentials
  AWS.config.update({ region, accessKeyId, secretAccessKey });
  // Create an S3 instance
  const s3 = new AWS.S3();
  const fileContent = fs.readFileSync(filePath);
  const params = {
      Bucket: bucketName,
      Key: key || `uploads/${Date.now()}-${filePath}`,
      Body: fileContent,
      ContentType,
  };
  try {
      const data = await s3.upload(params).promise();
      console.log(`File uploaded successfully at ${data.Location}`);
      return data.Location;
  } catch (err) {
      console.error('Error uploading file:', err);
      throw err;
  }
};


export const mainLanguages = {
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



export const addID3toMP3 = async (mp3File, data) => {
  const { title, artist, album, year, genre, comment, publisher, url, language, image } = data;
  // console.log('Adding ID3 tags to file:', mp3File, data);

  const tempFile = `${mp3File}.temp.mp3`;
  const ffmpegCommand = `ffmpeg -i "${mp3File}" -i "${image}" ` +
    `-metadata title="${title}" -metadata artist="${artist}" ` +
    `-metadata album="${album}" -metadata year="${year}" ` +
    `-metadata genre="${genre}" -metadata comment="${comment}" ` +
    `-metadata publisher="${publisher}" -metadata TXXX="URL:${url}" ` +
    `-metadata language="${language}" -map 0:a -map 1:v ` +
    `-codec copy -id3v2_version 3 "${tempFile}"`;

  try {
    await execPromise(ffmpegCommand);
    fs.renameSync(tempFile, mp3File);
    return true;
    // console.log('File has been renamed/moved successfully');
  } catch (error) {
    console.error('An error occurred:', error);
    return false;
  }
}


export const downloadFile = (url, destination) => new Promise((resolve, reject) => {
  https.get(url, response => {
    response.pipe(createWriteStream(destination))
            .on('finish', resolve)
            .on('error', reject);
  }).on('error', reject);
});

export const updateS3PodcastAudioFile = async (articlePath) => {
  // load article
  let {data, content} = matter(fs.readFileSync(articlePath, 'utf8'));
  const audioName = path.basename(data.audio);
  const articleID = path.basename(path.dirname(articlePath));
  const tempFile = path.join('/tmp', `${articleID+'-'+audioName}`);

  // console.log('downloading audio file:  ', data.audio, tempFile);
  await downloadFile(data.audio, tempFile);

  // console.log('downloaded file to tmp:  ', tempFile);
  // set the id3 tags: { title, artist, album, year, genre, comment }
  const artist = data.author.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
  const success = await addID3toMP3(tempFile, id3);

  if (success) {
  // upload the file to S3
    console.log('uploading audio file to S3:  ', articleID+'/'+audioName);
    const url = await uploadS3(tempFile, articleID+'/'+audioName, process.env.PODCAST_BUCKET, 'audio/mpeg');
    if (url!=data.audio) console.error('Warning, uploaded audio url is different!!');
    // now update the data
    // data.audio = url;
    data.audio_length = fs.statSync(tempFile).size;;
    data.language = data.language || 'en';
    console.log('updating article data:  ', data.url, data.audio_length, data.language);
    await saveArticleMdoc(articlePath, data, content);
  } else console.error('Error adding ID3 tags to file:', tempFile);

  // delete the temp file
  fs.unlinkSync(tempFile);
}


export const genericStringPrompt = async (PROMPT, args = {}, retries = 1) => {
 const retryDelay = 1100; // 1 second
 const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
 try {
   let prompt = PROMPT.prompt;
   let instructions = PROMPT.system_instructions;
   Object.keys(args).forEach((key) => {
     const regex = new RegExp(`\\[${key}\\]`, 'g');
     prompt = prompt.replace(regex, args[key]);
     instructions = instructions.replace(regex, args[key]);
   });
   const FULL_REQUEST = {
     model: PROMPT.model || 'gpt-4-turbo-preview',
     response_format: {type: 'text'},
     messages: [
       { "role": "system", "content": instructions },
       { "role": "user", "content": prompt }
     ]
   };
   // console.log('calling openai with prompt:', FULL_REQUEST.messages[1].content);
   return (await openai.chat.completions.create(FULL_REQUEST)).choices[0].message.content;
 } catch (error) {
   // console.error(`Error calling OpenAI: ${error.message}`, 'might try again');
   if (retries > 0) {
     console.log(`Retrying... attempts left: ${retries}`);
     await sleep(retryDelay);
     return await genericStringPrompt(PROMPT, args, retries - 1); // Decrement retries and try again
   } else {
     throw error; // Rethrow error if no retries left
   }
 }
};

export const getAudioDuration = async (filePath) => { //ISO 8601 duration format (PTxHyMzS)
 try {
   const { stdout } = await execPromise(`ffmpeg -i "${filePath}" 2>&1 | grep "Duration"`);
   const durationMatch = stdout.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
   if (!durationMatch) {
     throw new Error('Duration not found in the ffmpeg output');
   }
   const hours = parseInt(durationMatch[1], 10);
   const minutes = parseInt(durationMatch[2], 10);
   const seconds = parseInt(durationMatch[3], 10);
   // Convert to ISO 8601 duration format (PTxHyMzS)
   let duration = 'PT';
   if (hours > 0) duration += `${hours}H`;
   if (minutes > 0 || hours > 0) duration += `${minutes}M`;
   if (seconds > 0 || (hours <= 0 && minutes <= 0)) duration += `${seconds}S`;
   return duration;
 } catch (error) {
   console.error('Error getting audio duration:', error);
   return null;
 }
};

export const saveArticleMdoc = (filePath, data, content) => {
 let fileData = `---\n${yaml.dump(data)}---\n\n`;
 // here is where we clean things up. We insert a line break before certain yaml fields for readability
 const fields = ['external_reference', 'draft', 'datePublished', 'category', 'image', 'audio', 'author', 'video_main', 'language', 'relatedBooks'];
 fields.forEach(field => {
   fileData = fileData.replace(new RegExp(`\n${field}:`, 'g'), `\n\n${field}:`);
 });
 fileData += content;
 fs.writeFileSync(filePath, fileData);
}

export const genericJSONPrompt = async (PROMPT, args={}) => {
 try {
   // insert values from args
   var prompt = PROMPT.prompt
   var instructions = 'You are a helpful and competent assistant who can output in JSON format ' + PROMPT.system_instructions + "... so output only JSON with a format matching this Zod schema: "+PROMPT.schema_str;
   Object.keys(args).forEach(function(key) {
      // Use a global regex to replace all instances
      const regex = new RegExp(`\\[${key}\\]`, 'g');
      prompt = prompt.replace(regex, args[key]);
      instructions = instructions.replace(regex, args[key]);
   });
   const FULL_REQUEST = {
    model: PROMPT.model || 'gpt-4-1106-preview',
    response_format: { "type": "json_object" },
    messages: [
      {"role": "system", "content": instructions},
      {"role": "user", "content": prompt}
    ]
   }
  //  console.log('FULL_REQUEST', JSON.stringify(FULL_REQUEST.messages[0].content, null, 2));
   // step one, generate the JSON
   const VALIDATOR = PROMPT.schema;
   let attempt = 0, validJSON = false;
   while (attempt++ <=2) {
     // fetch a response from the OpenAI API
     const response = await openai.chat.completions.create(FULL_REQUEST);
     try {
       const resJSON = JSON.parse(response.choices[0].message.content); // openai returns JSON
      //  console.log('validating:', JSON.stringify(resJSON, null, 2));
       validJSON = VALIDATOR.parse(resJSON) // zod validates the object
     } catch (error) {
        console.error(`Error validating JSON, trying again`, error.message);
        continue;
       }
     if (validJSON) break;
   }
   if (!!validJSON) return validJSON
    else throw new Error(`Error calling OpenAI: ${error.message}`);
 } catch (error) {
   throw error;
 }

}

export const slugify = (text) => {
 return slugifier(text,  {
   lower: true, // convert to lower case
   strict: true, // strip special characters except replacement
   remove: /[*+~.()'"!:@]/g, // remove characters that match regex, replace with replacement
 })
}

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

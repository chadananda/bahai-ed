/**
 * Script: create_topics.js
 * Purpose: Automates the generation of detailed topic files using OpenAI's GPT-4 model.
 * Features:
 *   - Generates category-specific data formatted as JSON using OpenAI's GPT-4.
 *   - Validates the JSON output and converts it to YAML.
 *   - Saves YAML data for each topic file in 'src/content/topics/[slugified-topic-name].yaml'.
 *   - Saves YAML data for each faq file in 'src/content/faqs/[slugified-topic-name].yaml'.
 *   - Skips overwriting of existing files.
 *   - Parallel processing capability for handling multiple topics.
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
const throttle = pLimit(10); // Set the concurrency limit to 3

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI });

const slugify = (text) => {
  return slugifier(text,  {
    lower: true, // convert to lower case
    strict: true, // strip special characters except replacement
    remove: /[*+~.()'"!:@]/g, // remove characters that match regex, replace with replacement
  })
}


const SCRIPT_HELP = `
Usage: node _create_topic.js <category> ...
       node _create_topic.js --help

Arguments:
- category : Name of category to process.
- --help                   : Displays this help message.

Description:
This script loads a category YAML file and builds topics based on the list therein using OpenAI's GPT-4 model.
For each provided category, it creates a corresponding topic and FAQ YAML file with category+topic-specific information.`;

// const CATEGORY_IMAGE_PROMPT = {
//   // generate an image
//   // requires the argument "category"
//   model: 'dall-e-3', size: "1792x1024", n: 1,
//   prompt: "Please generate an image for the category: [category] ",
//   style: ` | Use the following style: Image with no words or letters! It should be a low-fidelity watercolor image which looks hand-made by a skilled impressionist on rough-press white paper. While using a simple pallete, try to stick to pastel colors with very crisp, white borders. Some very slight dripping is acceptable in watercolor paintings. Be creative and have fun painting!`
// }


const TOPIC_PROMPT = {
  // generate a category JSON object
  // requires the argument "category"
  schema:  object({ subtopics: array(object({ name: string(), description: string() })) }),
  schema_str: `object({ subtopics: array(object({ name: string(), description: string() })) })`,
  system_instructions: "You are an expert in [category] with detailed knowledge about [topic]",
  model: 'gpt-4-1106-preview',
  prompt: `Major Category: [category], This Topic: [topic], Topic Description: [description]

  Main Topics in this Category:

  [topicList]

  =====

  Instructions:

   Your task is to return an array of subtopics for this specific TOPIC in this CATEGORY.

   Imagine that you are a subject-area expert in this CATEGORY and TOPIC and also understand user web-search behavior and SEO.

   You take great joy in the quality, depth and breadth of your analysis.

   Considering that the major CATEGORY is divided into main TOPICS, think deeply about this specific TOPIC area and explore the entire conceptual landscape of this specific TOPIC. Then generate a list of the most significant 15-20 subtopics which are integral to this TOPIC while avoiding overlap with other TOPICS in this CATEGORY. The goal is to identify sub-areas that are integral to the topic, and provide a comprehensive yet specialized definition of the sphere of each subtopic for professionals or LLMs working with this data. The subtopic description should aim at maximum context with minimal words. Avoid overlap or semantic repetition with other subtopics.

   The list of distinct subtopics will each contain two fields, "name" and "description":

   * "name": a proper title (with Title Case) for each subtopic which attempts to incorporate the CATEGORY and TOPIC while being as brief as possible in order to be clear and concise while still distinct from any other possible topics and subtopics under other related categories.

   * "description": a brief but concise description of this subtopic's concept -- which compacts as much context as possible into as few words as possible without semantic overlap.

  `
};

const FAQ_PROMPT = {
  // generate a category JSON object
  // requires the argument "category"
  schema:  object({ title:string(), faqs: array(object({ question: string(), answer: string() })) }),
  schema_str: `object({ title:string(), faqs: array(object({ question: string(), answer: string() })) })`,
  system_instructions: "You are an expert in [category] with detailed knowledge about [topic]",
  model: 'gpt-4-1106-preview',
  prompt: `Major Category: "[category]". This Topic: "[topic]". Topic Description: "[description]"

  Main Topics in this Category:

  [topicList]

  =====

  Instructions:

   Your task is to return an faq object with both a title and an array of faqs for this specific TOPIC in this CATEGORY.

   Imagine that you are a subject-area expert in this CATEGORY and TOPIC and also understand user web-search behavior and SEO.

   You take great joy in the quality, depth and breadth of your analysis.

   Considering that the major CATEGORY is divided into main TOPICS, think deeply about this specific TOPIC area and explore the entire conceptual landscape of this specific TOPIC. Then generate a list of the most significant 15-20 questions which interested internet searchers are likely to ask when exploring this topic -- questions which are integral to this TOPIC while avoiding overlap with other TOPICS in this CATEGORY. Then you will muster all your clever writing skills to answer each question in a way that is both concise, witty and comprehensive.

   The list of distinct faqs will each contain two fields, "question" and "answer":

   * "question": a proper title (with Title Case) for each subtopic which attempts to incorporate the CATEGORY and TOPIC while being as brief as possible in order to be clear and concise while still distinct from any other possible topics and subtopics under other related categories.

   * "answer": a brief but concise description of this subtopic's concept -- which compacts as much context as possible into as few words as possible without semantic overlap.

   also, come up with a witty yet astute and incisive title for this FAQ page, which should be a short phrase that is both memorable and descriptive of the topic.

  `
};


      // keywords:
      //   - bahaullah-life-story
      //   - bahaullah-teachings
      //   - bahaullah-exile
      //   - bahaullah-revelations
      // questions:
      //   - "What are the significant events in the life of Baha'u'llah?"
      //   - "How did Baha'u'llah's teachings shape the Bahá'í Faith?"
      //   - "What were the major revelations received by Baha'u'llah?"

const SUBTOPIC_PROMPT = {
  // generate a category JSON object
  // requires the argument "category"
  schema:  object({ subtopics: array(object({ subtopic: string(), keywords: array(string()), questions: array(string()) })) }),
  schema_str: `object({ subtopics: array(object({ subtopic: string(), keywords: array(string()), questions: array(string()) })) })`,
  system_instructions: "You are an expert in [category] with detailed knowledge about [topic]",
  model: 'gpt-4-1106-preview',
  prompt: `Major CATEGORY: "[category]". This TOPIC: "[topic]". TOPIC Description: "[description]"

  Main Topics in this CATEGORY:

  [topicList]

  =====

  subtopics in this TOPIC (with descriptions)

  [subtopicList]

  =====

  Instructions:

    Your task is to return an list of subtopic objects, each with keywords and questions about the specific SUBTOPIC in context of this TOPIC in this CATEGORY.

    Imagine that you are a subject-area expert in this CATEGORY and TOPIC and also understand user web-search behavior and SEO.

    You take great joy in the quality, depth and breadth of your analysis.

    Considering that the major CATEGORY is divided into main TOPICS, think deeply about this specific TOPIC area and explore the entire conceptual landscape of this specific TOPIC and SUBTOPIC.

    For each subtopic, generate a list of the ALL most likely keyword phrases which interested searchers are likely to use to find information about this subtopic. Only include likely phrases and do not overlap with other phrases or subtopics. Do not include single-word keywords phrases unless they are very very specific.

    Also for each subtopic, generate a list of ALL the most likely questions which interested searchers are likely to be asking about this subtopic. Only include likely questions and do not overlap with other questions or subtopics.


    The subtopic items in this list will each contain fields, "keywords" and "questions":

    * "subtopic": the subtopic name for this subtopic item

    * "keywords": slugified list of keyword phrases without duplication, ordered from most likely to least likely

    * "questions": list of questions, without semantic duplication, which users are likely to ask about this subtopic, ordered from most likely to least likely
  `
};






const getCategoryFile = (category) => {
  const __dirname = path.dirname(fileURLToPath(import.meta?.url))
  return path.join(__dirname, '../content/categories', `${slugify(category)}.yaml`);
}
const getTopicFile = (topic) => {
  const __dirname = path.dirname(fileURLToPath(import.meta?.url))
  return path.join(__dirname, '../content/topics', `${slugify(topic)}.yaml`);
}
const getFAQFile = (topic) => {
  const __dirname = path.dirname(fileURLToPath(import.meta?.url))
  return path.join(__dirname, '../content/faqs', `${slugify(topic)}.yaml`);
}
const getSubtopicsFile = (topic) => {
  const __dirname = path.dirname(fileURLToPath(import.meta?.url))
  return path.join(__dirname, '../content/subtopics', `${slugify(topic)}.yaml`);
}
const loadCategoryJSON = async (category) => {
  const categoryFile = getCategoryFile(category);
  if (!fs.existsSync(categoryFile)) return false;
  const data = fs.readFileSync(categoryFile, 'utf8');
  return yaml.load(data);
}
const loadTopicJSON = async (topic) => {
  const topicFile = getTopicFile(topic);
  if (!fs.existsSync(topicFile)) return false;
  const data = fs.readFileSync(topicFile, 'utf8');
  return yaml.load(data);
}


// generic JSON comment prompt
const genericJSONPrompt = async (PROMPT, args={}) => {
  try {
    // insert values from args
    var prompt = PROMPT.prompt
    var instructions = 'You are a helpful and competent assistant who can output in JSON format ' + PROMPT.system_instructions + "... so output only JSON with a format matching this Zod schema: "+PROMPT.schema_str;
    Object.keys(args).forEach(function(key) {
      prompt = prompt.replace(`[${key}]`, args[key]);
      instructions = instructions.replace(`[${key}]`, args[key]);
    });
    const FULL_REQUEST = {
     model: PROMPT.model || 'gpt-4-1106-preview',
     response_format: { "type": "json_object" },
     messages: [
       {"role": "system", "content": instructions},
       {"role": "user", "content": prompt}
     ]
    }

    //console.log('FULL_REQUEST', JSON.stringify(FULL_REQUEST.messages[0].content, null, 2));

    // step one, generate the JSON
    const VALIDATOR = PROMPT.schema;
    let attempt = 0, validJSON = false;
    while (attempt++ <=2) {
      // fetch a response from the OpenAI API
      const response = await openai.chat.completions.create(FULL_REQUEST);
      try {
        const resJSON = JSON.parse(response.choices[0].message.content); // openai returns JSON
        validJSON = VALIDATOR.parse( resJSON) // zod validates the object
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





const generateTopic = async (category, topic) => {
  // console.log('generateTopic', category, topic);
  // validate the category and load category data
  const category_slug = slugify(category);
  const topic_slug = slugify(topic);
  const cat = await loadCategoryJSON(category);
  if (!cat || !cat.topics[slugify(topic)]) return !console.error(`Error in category (${category}/${topic})`);

  const topicFile = getTopicFile(topic);
  const faqFile = getFAQFile(topic);
  const subtopicsFile = getSubtopicsFile(topic);

  const description = cat.topics[topic_slug].description;
  const topicList = Object.keys(cat.topics).map(slug =>
    ` * ${cat.topics[slug].topic}: ${cat.topics[slug].description}\n`).join('');

  // generate Topic file
  if (!fs.existsSync(topicFile)) try {
    console.log(`** Processing topic: "${topic}"`);
    // Step 1: Generate JSON using OpenAI
    var { subtopics } = await genericJSONPrompt(TOPIC_PROMPT, {category, topic, description, topicList});
    if (!Array.isArray(subtopics)) throw new Error(`Subtopics not an array: `, subtopics);
    // Step 2: build final output
    subtopics = subtopics.map(sub => ({name: sub.name, slug: slugify(sub.name), description: sub.description}));
    const topicObj = { topic, topic_slug, category: category_slug, description, subtopics }
    // Step 3: Save tas a YAML file
    await fsPromises.mkdir(path.dirname(topicFile), { recursive: true });
    await fsPromises.writeFile(topicFile, yaml.dump(topicObj));
    console.log(`[✓] Generated topic file: ${path.basename(topicFile)}`);
  } catch (error) {
   console.error(` XX Error generating topic file "${category}": "${error.message}"`);
   throw error;
  }

  // generate FAQ file
  if (!fs.existsSync(faqFile)) try {
    console.log(`** Processing faq: "${topic}"`);
    // Step 1: Generate JSON using OpenAI
    var {title, faqs} = await genericJSONPrompt(FAQ_PROMPT, {category, topic, description, topicList});
    const FAQObj = { topic, topic_slug: topic_slug, category: category_slug, title, description, faqs }
    // Step 2: Save as a YAML file
    await fsPromises.mkdir(path.dirname(faqFile), { recursive: true });
    await fsPromises.writeFile(faqFile, yaml.dump(FAQObj));
    console.log(`[✓] Generated FAQ file: ${path.basename(faqFile)}`);
  } catch (error) {
   console.error(` XX Error generating FAQ file "${category}": "${error.message}"`);
   throw error;
  }

  // generate Subtopics file
  if (!fs.existsSync(subtopicsFile)) try {
    console.log(`** Processing subtopics: "${topic}"`);
    let topicObj = await loadTopicJSON(topic);
    const subtopicList = topicObj.subtopics.map(sub => ` * ${sub.name}: ${sub.description}\n` ).join('');
    // Step 1: Generate JSON using OpenAI
    var { subtopics } = await genericJSONPrompt(SUBTOPIC_PROMPT, {category, topic, description, topicList, subtopicList});
    if (!Array.isArray(subtopics)) throw new Error(`Subtopics not an array: `, subtopics);
// console.log('subtopics', subtopics);

    // Step 2: build final output

    // - subtopic: "Life of Baha'u'llah"
      // subtopic_slug: life-of-bahaullah
      // keywords:
      //   bahaullah-life-story: 500
      //   bahaullah-teachings: 400
      //   bahaullah-exile: 300
      //   bahaullah-revelations: 200
      // questions:
      //   - "What are the significant events in the life of Baha'u'llah?"
      //   - "How did Baha'u'llah's teachings shape the Bahá'í Faith?"
      //   - "What were the major revelations received by Baha'u'llah?"

    subtopics = subtopics.map(sub => {
      return {subtopic: sub.subtopic, subtopic_slug: slugify(sub.subtopic),
        keywords: sub.keywords.map(kw => slugify(kw)),
        questions: sub.questions}
    });
    const subtopicsObj = { topic, topic_slug, category: category_slug, description, subtopics }
    // Step 3: Save tas a YAML file
    await fsPromises.mkdir(path.dirname(subtopicsFile), { recursive: true });
    await fsPromises.writeFile(subtopicsFile, yaml.dump(subtopicsObj));
    console.log(`[✓] Generated subtopics file: ${path.basename(subtopicsFile)}`);
  } catch (error) {
   console.error(` XX Error generating subtopics file "${category}": "${error.message}"`);
   throw error;
  }


};

// const generateCategoryImage = async (category, filepath) => {
//  if (fs.existsSync(filepath)) return console.error(` >> Image already exists: "`+
//     path.basename(path.dirname(filepath))+ '/' +path.basename(filepath) +'"');
//  try {
//    await genericImagePrompt(CATEGORY_IMAGE_PROMPT, { category, filepath })
//    console.log(`[x] Downloaded image: ${path.basename(args.filepath)}`);
//  } catch (error) {
//    console.error(`Error generating image for category ${category}: ${error.message}`);
//  }
// };

const generateCategoryItems = async (category) => {

}


const main = async () => {
  let categories = process.argv.slice(2); // Get categories from command-line arguments
  // Check for no arguments, help argument, or incorrect usage
  if (categories.length === 0 || categories[0].includes('--help')) return console.log(SCRIPT_HELP);
  let topicTasks = [];

  // gather up all the category tasks
  categories.forEach(async (category) => {
    let cat = await loadCategoryJSON(category);
    if (!cat || !cat.topics) return console.error(`Error loading category: ${category}`);
    // create an array of throttled tasks
    const tasks = Object.keys(cat.topics).map(topic => async () => {
      await generateTopic(cat.category, cat.topics[topic].topic);
    }).map(task => throttle(task));
    // add the tasks to the list
    topicTasks = topicTasks.concat(tasks);
  })

  // run the throttled task list
  try {
    await Promise.all(topicTasks);
    console.log('** All topics processed.');
  } catch (error) { console.error(' XX A throttle process error occurred:', error) }
};



main().catch(error => console.error(' xx An overall error occurred:', error));






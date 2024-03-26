/**
 * Script: create_category.js
 * Purpose: Automates the generation of detailed category information using OpenAI's GPT-4 model.
 * Features:
 *   - Generates category-specific data formatted as JSON using OpenAI's GPT-4.
 *   - Validates the JSON output and converts it to YAML.
 *   - Saves YAML data in markdown files within 'src/content/categories/[slugified-category-name]/'.
 *   - Handles file creation and prompts before overwriting existing files.
 *   - Parallel processing capability for handling multiple categories.
 *   - Generates and saves related images in the category directory.
 * Requirements:
 *   - OpenAI API key in a .env file at the root.
 *   - External npm packages for HTTP requests, YAML conversion, and slugification.
 *   - Node.js environment.
 * Usage:
 *   - Accepts category names as input.
 *   - Processes each category to generate topics and details.
 *   - Saves the results as YAML and an associated image in the specified directory.
 * Note:
 *   - Includes error handling and logging for API interactions and file operations.
 */

import axios from 'axios';
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
Usage: node create_category.js <category1> [category2] ...
       node create_category.js --help

Arguments:
- category1, category2, ... : Names of categories to process.
- --help                   : Displays this help message.

Description:
This script generates detailed category information using OpenAI's GPT-4 model.
For each provided category name, it creates a corresponding YAML file with
category-specific data and generates an associated image.`;

const CATEGORY_IMAGE_PROMPT = {
  // generate an image
  // requires the argument "category"
  model: 'dall-e-3', size: "1792x1024", n: 1,
  prompt: "Please generate an image for the category: [category] ",
  style: ` | Use the following style: Image with no words or letters! It should be a low-fidelity watercolor image which looks hand-made by a skilled impressionist on rough-press white paper. While using a simple pallete, try to stick to pastel colors with very crisp, white borders. Some very slight dripping is acceptable in watercolor paintings. Be creative and have fun painting!`
}


// topics:
//   prophet-zoroaster:
//     topic: Prophet Zoroaster
//     description: >-
//       The life and teachings of the Prophet Zoroaster, including historical
//       context, his revelations, and his impact on the development of Zoroastrian
//       beliefs and rituals.

const CATEGORY_PROMPT = {
  // generate a category JSON object
  // requires the argument "category"
  schema: object({ description: string(), topics: array(object({ description: string(), topic: string(), })), }),
  schema_str: `object({ description: string(), topics: array(object({ description: string(), topic: string(), })), })`,
  system_instructions: "You are an expert in [category]",
  model: 'gpt-4-1106-preview',
  prompt: `Category: [category]
  ## Instructions:

  Imagine that you are a subject-area expert in this CATEGORY and also an expert in search engine optimization. You take great joy in the quality, depth and breadth of your analysis.

  Category Description: You will start by considering the CATEGORY carefully and then writing a top level complete but concise CATEGORY DESCRIPTION of the entire CATEGORY concept -- which will server to define precisely the scope of the category.

  Category Topics: Next you will take a wide 360 degree survey of this entire category and  craft a list of each specific and distinct TOPIC within this CATEGORY, each topic with a brief but complete Topic DESCRIPTION clarifying it's scope.

  Topic: Each of these topics should be a focused aspect or a specialized area within the overarching category, ensuring that they are not too broad or generic to become categories in themselves.

    Topics should be named with title case in the shortest meaningful way while being entirely specific to the CATEGORY with no likelihood of overlapping with topics in other similar categories. If necessary, include part of the category name in the topic name to make sure it has topical uniqueness. For example, you should not name a topic "Fundamental Beliefs" because this might well apply in other related categories. Such topics provide in-depth exploration opportunities within the category, offering unique and detailed insights or practices. They should be clearly differentiated from one another, avoiding overlap or semantic repetition. The goal is to identify sub-areas that are integral to this category, providing a comprehensive yet specialized understanding relevant to professionals or enthusiasts in the field.

  Topic Description: Each topic will also get a concise but complete description. The description will provide as much context as possible in the fewest words. It will define the topical scope of the topic within the context of the category in a way that clearly differentiates it from other topics in the category. Take out your professional writer's pen for this topic, it needs to be award-winning compact prose to convey as meaning as possible in a few lines.

  The output will look something like:

 {
    "description": (complete but concise CATEGORY description)
    "topics": (array of objects):
      "topic": (short but very specific TOPIC name)
      "description": (brief but concise description of this TOPIC)

      ... (repeat for each topic in the category)
  } `,
};

const getCategoryFolder = (category) => {
  const __dirname = path.dirname(fileURLToPath(import.meta?.url))
  const category_slug = slugify(category);
  return path.join(__dirname, '../content/categories/');
};
const getCategoryFile = (category) => {
  return path.join(getCategoryFolder(category), `${slugify(category)}.yaml`)
};
const getCategoryImageFile = (category) => {
  return path.join(getCategoryFolder(category), `${slugify(category)}.png`)
};

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
    // step one, generate the JSON
    const VALIDATOR = PROMPT.schema;
    let attempt = 0, validJSON = false;
    while (attempt++ <=2) {
      // fetch a response from the OpenAI API
      const response = await openai.chat.completions.create(FULL_REQUEST);
      try {
        const catJSON = JSON.parse(response.choices[0].message.content); // openai returns json
        validJSON = VALIDATOR.parse(catJSON) // validate with Zod schema
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
// in our example, we'll call with args: "category" and "filepath"
const genericImagePrompt = async (PROMPT, args={}) => {
  // console.log("generateImage:"  + JSON.stringify(args))
  try {
    var prompt = PROMPT.prompt;
    Object.keys(args).forEach(function(key) {
      prompt = prompt.replace(`[${key}]`, args[key]);
    });
    const image_details = {
      prompt: prompt + PROMPT.style,
      model: PROMPT.model || 'dall-e-3',
      size: PROMPT.size || "1792x1024",
      n: PROMPT.n || 1
    }
    let attempt = 0, generatedImage = false
    while (attempt++ <=2) {
      try { generatedImage = await openai.images.generate(image_details);}
        catch (error) {
          console.error(`Error generating image, trying again`, error.message); continue;
        }
      if (!!generatedImage) break;
    }
    if (!!generatedImage) try {
      const response = await axios.get(generatedImage.data[0]?.url, { responseType: 'arraybuffer', });
      await fsPromises.mkdir(path.dirname(args.filepath), { recursive: true });
      await fsPromises.writeFile(args.filepath, response.data);
    } catch (error) { console.error(`Error downloading image: ${error.message}`); }
  } catch (error) {
    console.error(`Error generating image:`, error.message);
  }
}

const generateCategory = async (category, filepath) => {
 if (fs.existsSync(filepath)) return console.error(` >> File already exists: "`+
   path.basename(path.dirname(filepath))+ '/' +path.basename(filepath) +'"');

 try {
    // Step 1: Generate JSON using OpenAI
   const validJSON = await genericJSONPrompt(CATEGORY_PROMPT, {category});
   if (!validJSON) return !console.error(`Error processing category ${category}: ${error.message}`);

   // Step 2: Convert validated JSON to YAML
   const category_slug = slugify(category);
   const image = {
     src: `./${category_slug}.png`,
     alt: category
   };
   const description = validJSON.description;
   // make traffic a random number between 10000 and 100000
  //  const traffic = Math.floor(Math.random() * (100000 - 10000) + 10000);
   // convert array of topics into an object with each key being the slugified topic name
   const topics = {}
   // array of {topic, description} objects into object of slug:{topic, description}
   validJSON.topics.forEach(topic => topics[slugify(topic.topic)] = {
     topic: topic.topic,
     description: topic.description
   });
   const categoryYAML = {category, category_slug, image, description, topics};

   // Step 3: Save the YAML object as a file
   await fsPromises.mkdir(path.dirname(filepath), { recursive: true });
   await fsPromises.writeFile(filepath, yaml.dump(categoryYAML));
   console.log(`[✓] Generated category: ${path.basename(filepath)}`);

 } catch (error) {
   console.error(` XX Error generating category "${category}": "${error.message}"`);
   throw error;
 }
};

const generateCategoryImage = async (category, filepath) => {
 if (fs.existsSync(filepath)) return console.error(` >> Image already exists: "`+
    path.basename(path.dirname(filepath))+ '/' +path.basename(filepath) +'"');
 try {
   await genericImagePrompt(CATEGORY_IMAGE_PROMPT, { category, filepath })
   console.log(`[✓] Downloaded image: ${path.basename(args.filepath)}`);
 } catch (error) {
   console.error(`Error generating image for category ${category}: ${error.message}`);
 }
};

const main = async () => {
 const categories = process.argv.slice(2); // Get categories from command-line arguments
 // Check for no arguments, help argument, or incorrect usage
 if (categories.length === 0 || categories.includes('--help')) {
   console.log(SCRIPT_HELP); return;
 }
 // Create an array of promises
 const tasks = categories.map(category => async () => {
   console.log(`** Processing category: ${category}`);
   await generateCategory(category, getCategoryFile(category));
   await generateCategoryImage(category, getCategoryImageFile(category));
 });
 // Wrap each task with the limit function
 const throttledTasks = tasks.map(task => throttle(task))
 // now run the throttled tasks
 try {
  await Promise.all(throttledTasks);
  // console.log('** All categories processed.');
} catch (error) {
  console.error('An error occurred:', error);
}


 console.log('** All categories processed.');
};

main().catch(error => console.error('An error occurred:', error));






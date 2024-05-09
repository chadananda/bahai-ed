// Import necessary modules
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import pLimit from 'p-limit'; // Adjust import based on actual module export
import { saveArticleMdoc, uploadS3, guessContentType } from './_script_utils.js'; // Assuming this utility handles the S3 upload
import matter from 'gray-matter';
import yaml from 'js-yaml';
import crypto from 'crypto';
import AWS from 'aws-sdk';

// Initialize environment variables
dotenv.config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_BUCKET_REGION,
  params: { Bucket: process.env.AWS_BUCKET_NAME } // Setting default bucket
});


// Function to get list of category image files
async function getCollectionImages(collection) {
 const cwd = process.cwd(); // Current working directory
 const pattern = `${cwd}/src/content/${collection}/*.{jpg,jpeg,png,gif,webp,svg}`;
 const images = await fg(pattern);
 console.log(`Found images in "${collection}":`, images);
 return images;
}

// Function to simulate uploading an image to S3 and updating YAML
async function uploadCollecitonImage(filePath, collection) {
  const dir = path.dirname(filePath);
  // const collectionId = path.basename(path.dirname(path.dirname(filePath)));
  const fileName = path.basename(filePath);
  const s3Key = `${collection}/${fileName}`;
  try {
    // Perform the actual S3 upload
    const s3Url = await uploadS3(filePath, s3Key);
    console.log(`S3 url: ${s3Url}, s3 Key: ${s3Key}`);
    // Locate all YAML files in the same directory
    const yamlFiles = await fg(path.join(dir, '*.yaml'));
    console.log('Found YAML files:', yamlFiles);
    // Update each YAML file if the upload was successful
    yamlFiles.forEach(file => {
      let data = yaml.load(fs.readFileSync(file, 'utf8'));
      // Check if the YAML file contains a reference to the image
      if (data.image) {
        let imagePath = typeof data.image === 'object' ? data.image.src : data.image;
        if (imagePath && (path.basename(imagePath) === fileName || imagePath === `./${fileName}`)) {
          // Update the image source or the entire image based on the type of data.image
          typeof data.image === 'object' ? data.image.src = s3Url : data.image = s3Url;
          // Write changes to the YAML file and log the update
          fs.writeFileSync(file, yaml.dump(data));
          console.log(`Updated ${file} with new image URL: ${s3Url}`);
        }
      }
    });
    // Simulate deleting the image file after successful upload and updates
    console.log(`Would delete local file: ${filePath}`);
    // Uncomment the following line to actually delete the file
    // fs.unlinkSync(filePath);
  } catch (error) {
    console.error(`Error handling image upload for ${filePath}:`, error);
  }
}

// Main function to process all categories
async function moveDataCollectionImages(collection='categories') {
  console.log(`Moving images in "${collection}" to S3.`);
  // Set up concurrency limit
  const uploadThrottle = pLimit(5); // Limit the number of concurrent uploads
  const images = await getCollectionImages(collection);
  const tasks = images.map(image => {
    return uploadThrottle(() => uploadCollecitonImage(image, collection));
  });
  await Promise.all(tasks);
  console.log(`${collection} updates complete.`);

}

async function getArticlesList() {
  const cwd = process.cwd(); // Current working directory
  const pattern = `${cwd}/src/content/posts/*`; // Modified to include wildcard
  const list = (await fg(pattern, { onlyDirectories: true })).filter(folder => !folder.endsWith('/blank')); // Exclude "blank" and return list
  console.log('found ', list.length, 'article folders');
  return list
}

async function uploadArticleImages(folderPath) {
  const articleName = path.basename(folderPath);
  // console.log('uploadArticleImages:', articleName);
  const pattern = `${folderPath}/*.{jpg,jpeg,png,gif,webp,svg,pdf,mp3,pdf,zip,mp3}`;
  const assets = await fg(pattern);
  console.log(`Found ${assets.length} assets in "${articleName}":`, assets);
  // Upload assets to S3 and get their URLs
  const mapping = await Promise.all(assets.map(imagePath =>
    uploadImageIfNeeded(imagePath)
  ));
  // Create a map of filenames to S3 URLs
  const urlMap = mapping.reduce((acc, { filename, url }) => {
    acc[filename] = url;
    return acc;
  }, {});
  // console.log(urlMap);

  // Process all .mdoc files in the folder
  const docPattern = `${folderPath}/*.mdoc`;
  const mdocFiles = (await fg(docPattern));
  // console.log(`Found .mdoc files in "${folderPath}":`, mdocFiles);s
  await Promise.all(mdocFiles.map(file =>
    processMdocFile(file, urlMap)
  ));
}

function generateS3URL(bucketName, s3key) {
  // Encode only the path components of the s3key, not the slashes
  const encodedKey = s3key.split('/').map(encodeURIComponent).join('/');
  return `https://${bucketName}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${encodedKey}`;
}


async function processMdocFile(filePath, urlMap) {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  function replacementFound(src) {
    const normalizePath = (path) => path.replace(/^\.\/|^\/|^\.\//g, ''); // Normalize path
    if (src && !src.startsWith('http')) {
      const filename = path.basename(normalizePath(src));
      const newUrl = urlMap[filename] || src;
      return newUrl !== src ? newUrl : null;
    }
    return null;
  }

  // Updating all HTML-like and markdown link attributes
  const updatedContent = content.replace(/(\b(src|href|data|action|image)=["'])([^"']*?)(["'])/gi, (match, prefix, attr, url, suffix) => {
    const newUrl = replacementFound(url);
    if (newUrl) {
      console.log(`Replacing ${attr} URL: ${url} with ${newUrl}`);
      return `${prefix}${newUrl}${suffix}`;
    }
    return match;
  });

  // Update fields using a loop for compactness
  ['src', 'audio_image', 'audio'].forEach(field => {
    if (data.image && field === 'src') {
      data.image.src = updateUrl(data.image.src, 'image.src');
    } else if (data[field]) {
      data[field] = updateUrl(data[field], `${field}`);
    }
  });

  function updateUrl(source, description) {
    const newUrl = replacementFound(source);
    if (newUrl) {
      console.log(`Replacing ${description}: "${source}" with "${newUrl}"`);
      return newUrl;
    }
    return source;
  }

  // Log final content without saving for verification
  // console.log(`Final modified content for ${filePath}: \n${updatedContent}`);

  // Uncomment below to save changes when ready
  saveArticleMdoc(filePath, { ...data }, updatedContent);
}




// async function processMdocFile(filePath, urlMap) {
//   const fileContents = fs.readFileSync(filePath, 'utf8');
//   const { data, content } = matter(fileContents);

//   // Function to normalize image and file paths
//   const normalizePath = (path) => path.replace(/^\.\/|^\/|^\.\//g, '');

//   // Update YAML front matter for images, PDFs, and audio files
//   if (data.image && data.image.src) {
//     const filename = path.basename(normalizePath(data.image.src));
//     const newSrc = urlMap[filename] || data.image.src;
//     console.log(`Replacing image.src: ${data.image.src} with ${newSrc}`);
//     data.image.src = newSrc;
//   }

//   if (data.audio_image) {
//     const filename = path.basename(normalizePath(data.audio_image));
//     const newAudioImage = urlMap[filename] || data.audio_image;
//     console.log(`Replacing audio_image: ${data.audio_image} with ${newAudioImage}`);
//     data.audio_image = newAudioImage;
//   }

//   // Special handling for the audio field if it points to a local file
//   if (data.audio && /\.(mp3)$/i.test(data.audio)) {
//     const filename = path.basename(normalizePath(data.audio));
//     const newAudio = urlMap[filename] || data.audio;
//     console.log(`Replacing audio: ${data.audio} with ${newAudio}`);
//     data.audio = newAudio;
//   }

//   // Update Markdown image links and other file types in content
//   const updatedContent = content.replace(/!\[.*?\]\((.*?)\)/g, (match, p1) => {
//     const filename = path.basename(normalizePath(p1));
//     const newUrl = urlMap[filename] || p1;
//     console.log(`Replacing Markdown link: ${p1} with ${newUrl}`);
//     return match.replace(p1, newUrl);
//   });

//   // Dynamic file attribute handling in Markdoc content for all file types
//   const finalContent = updatedContent.replace(/{%.*?(\b\w+\s*=\s*["'].*?["'])[\s\S]*?/>/g, (match, p1) => {
//     const attributePairs = p1.split(/\s+/).filter(attr => attr.includes('='));
//     return attributePairs.reduce((updatedMatch, attr) => {
//       const [key, value] = attr.split('=');
//       const trimmedValue = value.trim().replace(/^["']|["']$/g, ''); // Correctly trim quotes from the value
//       if (/\.(jpg|jpeg|png|gif|svg|pdf|mp3)$/i.test(trimmedValue)) { // Check if the attribute value looks like a file path
//         if (!trimmedValue.startsWith('http')) { // Correct method name from 'startswith' to 'startsWith'
//           const filename = path.basename(normalizePath(trimmedValue));
//           const newUrl = urlMap[filename] || trimmedValue;
//           if (newUrl) {
//             console.log(`Replacing link: "${trimmedValue}" with: ${newUrl}`);
//             return updatedMatch.replace(value, `"${newUrl}"`); // Ensure values are replaced correctly
//           }
//         }
//         return updatedMatch;
//       }
//       return updatedMatch;
//     }, match);
//   });


//   // Log final content without saving for verification
//   // console.log(`Final modified: \n${filePath}`);
//   // Uncomment below to save changes when ready
//   saveArticleMdoc(filePath, { ...data }, finalContent);
// }



async function uploadImageIfNeeded(imagePath) {
  const baseDir = process.cwd() + '/src/content/';
  const s3key = imagePath.substring(baseDir.length);
  // const contentType = guessContentType(imagePath);
  // console.log('uploadImageIfNeeded:', s3key);
  // Use the S3FileExists function to check file status
  const { exists, matches, url } = await S3FileExists(imagePath, s3key);
  if (exists && matches) {
    // console.log(`No need to upload ${s3key}; it already exists on S3 with the same content.`);
    return { filename: path.basename(imagePath), url };
  }
  // If the file does not exist or content differs, upload it
  const newUrl = await uploadS3(imagePath, s3key);
  console.log(`Uploaded ${path.basename(imagePath)}: \n   ${newUrl}`);
    // Uploaded posts/1972-11-27_constitution-of-uhj/constitution.png to S3 with URL: https://blogw-assets.s3.us-west-1.amazonaws.com/posts/1972-11-27_constitution-of-uhj/constitution.png
  return { filename: path.basename(imagePath), url: newUrl };
}

// Function to check if a file exists on S3 and compares the ETag
async function S3FileExists(filePath, s3Key) {
  const localHash = await streamFileHash(filePath);
  try {
    const { ETag } = await s3.headObject({ Key: s3Key }).promise();
    const matches = ETag.replace(/"/g, '') === localHash;
    const url = generateS3URL(process.env.AWS_BUCKET_NAME, s3Key);
    return { exists: true, matches, url };
  } catch (error) {
    if (error.code === 'NotFound') return { exists: false, matches: false, url: null };
    throw error;
  }
}

const streamFileHash = (filePath) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('md5');
  const stream = fs.createReadStream(filePath);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('end', () => resolve(hash.digest('hex')));
  stream.on('error', reject);
});

async function moveContentCollectionImages() {
  console.log(`Moving images in posts to S3.`);
  // Set up concurrency limit
  const uploadThrottle = pLimit(2); // Limit the number of concurrent uploads
  // test with only one folder
  const articleFolders = (await getArticlesList());
  const tasks = articleFolders.map(arFolder => {
    console.log('updating assets in folder: ', arFolder);
    return uploadThrottle(() => uploadArticleImages(arFolder));
  });
  await Promise.all(tasks);

  console.log(`${articleFolders.length} article updated.`);
}



// Call main function for categories
console.log('===============');
// await moveDataCollectionImages('categories').catch(console.error)
// console.log('===');
// await moveDataCollectionImages('team').catch(console.error)
// console.log('===');
await moveContentCollectionImages().catch(console.error)






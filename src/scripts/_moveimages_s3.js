// Import necessary modules
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import pLimit from 'p-limit'; // Adjust import based on actual module export
import { saveArticleMdoc, uploadS3 } from './_script_utils.js'; // Assuming this utility handles the S3 upload
import matter from 'gray-matter';
import yaml from 'js-yaml';

// Initialize environment variables
dotenv.config();


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

// Call main function for categories
console.log('===============');
await moveDataCollectionImages('categories').catch(console.error)
console.log('===');
await moveDataCollectionImages('team').catch(console.error)


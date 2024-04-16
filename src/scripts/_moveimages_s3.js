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
async function getCategoryImages() {
 const cwd = process.cwd(); // Current working directory
 const pattern = `${cwd}/src/content/categories/*.{jpg,jpeg,png,gif,webp,svg}`;
 const images = await fg(pattern);
 console.log('Found images:', images);
 return images;
}

// Function to simulate uploading an image to S3 and updating YAML
async function categoryImageUpload(filePath) {
  const categoryDir = path.dirname(filePath);
  const categoryId = path.basename(path.dirname(path.dirname(filePath)));
  const fileName = path.basename(filePath);
  const s3Key = `categories/${categoryId}/${fileName}`;

  try {
    // Perform the actual S3 upload
    const s3Url = await uploadS3(filePath, s3Key);
    // Locate all YAML files in the same directory
    const yamlFiles = await fg(path.join(categoryDir, '*.yaml'));
    // console.log('Found YAML files:', yamlFiles);
    // Update each YAML file if the upload was successful
    yamlFiles.forEach(file => {
      let data = yaml.load(fs.readFileSync(file, 'utf8'));
      // Check if the YAML file contains a reference to the image
      if (data.image && (path.basename(data.image) === fileName || data.image === `./${fileName}`)) {
        data.image = s3Url;  // Replace local path with S3 URL
        // console.log(`Would update ${file}: set image to ${s3Url}`);
        // Actually write changes to the YAML file
        const newYamlContent = yaml.dump(data);
        fs.writeFileSync(file, newYamlContent);
        console.log(`Updated ${file} with new image URL.`);
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
async function processCategories() {
  // Set up concurrency limit
  const uploadThrottle = pLimit(5); // Limit the number of concurrent uploads
  const images = await getCategoryImages();
  const tasks = images.map(image => {
    return uploadThrottle(() => categoryImageUpload(image));
  });
  await Promise.all(tasks);
  console.log('All simulated uploads and updates complete.');
}

// Call main function
processCategories().catch(console.error);

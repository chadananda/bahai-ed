import fs from 'fs-extra';
import path from 'path';
import glob from 'fast-glob';

const srcDir = path.join(process.cwd(), 'src', 'content', 'posts');
const destDir = path.join(process.cwd(), 'public', 'posts');

function syncAssets() {
  const globPattern = `${srcDir}/**/*.*`; // Select all files
  try {
    const files = glob.sync(globPattern, { nodir: true })
      .filter(file => !file.match(/\.(jpg|jpeg|png|gif|mdoc|txt)$/i)); // Exclude image, txt and .mdoc files

    files.forEach((file) => {
      const relativePath = path.relative(srcDir, file);
      const destPath = path.join(destDir, relativePath);

      const srcStat = fs.statSync(file);
      try {
        const destStat = fs.statSync(destPath);
        if (srcStat.mtime > destStat.mtime) {
          fs.copySync(file, destPath);
         // console.log(`Copied: ${file} to ${destPath}`);
        }
      } catch (err) {
        fs.copySync(file, destPath);
        //console.log(`Copied: ${file} to ${destPath}`);
      }
    });
  } catch (err) {
    console.error('Error during glob processing:', err);
  }
}

syncAssets();

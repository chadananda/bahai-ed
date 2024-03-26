// // reduce repository size by optimizing images at the source
// // usage: first install the required packages
//   // npm install imagemin imagemin-mozjpeg imagemin-pngquant imagemin-gifsicle imagemin-svgo glob chalk --save-dev
// // then add script to package.json and run occasionally, with directories to optimize
//   // node OptimizeImages.js public src/content


// import imagemin from 'imagemin';
// import mozjpeg from 'imagemin-mozjpeg';
// import pngquant from 'imagemin-pngquant';
// import gifsicle from 'imagemin-gifsicle';
// import svgo from 'imagemin-svgo';
// import { glob } from 'glob';
// import fs from 'fs';
// import chalk from 'chalk';

// const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg'];

// const optimizeImagesInDirectory = async (directory, options) => {
//   imageTypes.forEach(type => {
//     glob(`${directory}/**/*.${type}`, (err, files) => {
//       if (err) {
//         console.error(`Error finding ${type} images in ${directory}:`, err);
//         return;
//       }
//       files.forEach(file => optimizeImage(file, options));
//     });
//   });
// };

// const optimizeImage = async (path, options) => {
//   const originalSize = fs.statSync(path).size;
//   const result = await imagemin([path], {
//     destination: 'optimized/',
//     plugins: [
//       mozjpeg(options.mozjpeg),
//       pngquant(options.pngquant),
//       gifsicle(options.gifsicle),
//       svgo(options.svgo),
//     ],
//   });

//   if (result.length > 0) {
//     const optimizedSize = fs.statSync(result[0].destinationPath).size;
//     if (optimizedSize < originalSize) {
//       const savedBytes = originalSize - optimizedSize;
//       const savedPercentage = (savedBytes / originalSize * 100).toFixed(2);
//       console.log(`${chalk.green('✔')} ${path} reduced ${chalk.bold(savedBytes + ' bytes')} (${chalk.bold(savedPercentage + '%')})`);

//       fs.renameSync(result[0].destinationPath, path); // Replace original with optimized
//     } else {
//       fs.unlinkSync(result[0].destinationPath); // Delete optimized if not smaller
//       console.log(`${chalk.yellow('⚠')} ${path} not able to further reduce size.`);
//     }
//   }
// };

// const directories = process.argv.slice(2);
// directories.forEach(directory => {
//   optimizeImagesInDirectory(directory, {
//     mozjpeg: { quality: 75 },
//     pngquant: { quality: [0.6, 0.8] },
//     gifsicle: { optimizationLevel: 2 },
//     svgo: {}
//   });
// });

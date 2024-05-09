import { allFixes } from '@utils/typography.js';

export const markedExt_TextCleanup = () => {
//  console.log('TextCleanup Imported');
 return {
   name: 'textCleanup',
   level: 'inline', // This extension works on inline elements
   tokenizer(src) {
     console.log('Tokenizer Run.'); // Logging to ensure matches are found
     const match = src.match(/^.*$/m); // Adjusted to capture each line more reliably
     if (match) {
       return {
         type: 'text',
         raw: match[0],
         text: match[0]
       };
     }
   },
   renderer(token) {
    //  console.log('Rendering token:', token.text); // Check what is being rendered
     return allFixes.reduce((text, fix) => fix(text), token.text);
   }
 };
};


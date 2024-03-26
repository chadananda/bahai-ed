import { object, string, array, boolean } from "zod";
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI });


const MODERATION_PROMPT = {
 schema: object({ comments: array(object({ postid: string(), parentid: string().nullable(), approved: boolean(), name: string(), email: string().optional(),  content: string(), starred: boolean() })) }),

 schema_str: `object({ comments: array(object({ postid: string(), parentid: string().nullable(), approved: boolean(), name: string(), email: string().optional(), content: string(), starred: boolean() })) })`,

 system_instructions: "You are an expert moderator with years of experience moderating forum posts",
 model: 'gpt-3.5-turbo-1106', // might be too small, but must support JSON output
 prompt: `Article Description: "[description]"

 =====

 ## Instructions:

   Your task is to review a list of comment posts and moderate them. You are an expert moderator with years of experience moderating forum posts. You have a deep understanding of the topic and are able to quickly and accurately moderate comments. You take great joy in keeping the conversation civil and non-abusive.

   Approval: Some comments you will reject by setting the field "approved":false on the comment object. You will do this if the comment seems like spam, self-serving, overly critical, offensive or inappropriate. Otherwise, you will approve the comment by setting the field "approved":true on the comment object. Also, reject duplicate replies, that is if the same person posts the same comment to the same parentid. In that case, you should only approve the first instance of the comment and reject the rest.

   Starred: Occasionally, an approved comments is especially funny, insightful, or otherwise interesting, you will highlight by adding the field "starred":true to the comment object. Don't do this very often.

   Format: Following is the list of comment objects you need to review and moderate for this article. You will return exactly the same array of objects without modification -- other than setting the "approved" and "starred" fields as described above.

## Comments Array:

[comments]

=================

 `
};

export const moderateComments = async (comments, description) => {

  console.log('comments to be moderated', comments);
  // the array into a lookup object
  const lookup = comments.reduce((acc, obj) => ({ ...acc, [obj.postid]: obj }), {});

  // simplify the objects to avoid confusing AI
  let simpleComments = comments.map(({postid, parentid, email, name, content}) => ({postid, parentid, email, name, content, approved:false, starred: false}));

  console.log('simpleComments', simpleComments);

  // have the ai process the simplified list
  let moderatedList = await genericJSONPrompt(MODERATION_PROMPT, {comments:  JSON.stringify({comments: simpleComments}, null, 2), description});

  console.log('moderatedList', moderatedList.comments);

  if (comments.length != moderatedList.comments.length) console.error('moderated list has different number of comments than original');

  // don't trust AI -- use only the critical three fields
  let finalList = moderatedList.comments.map(({postid, approved, starred}) => {
    return {
      postid, approved: !!approved, starred: !!starred,
      email: lookup[postid].email,
      name: lookup[postid].name,
      content: lookup[postid].content,
      parentid: lookup[postid].parentid,
      date: lookup[postid].date
    }
  });

  console.log('FinalList', finalList);

  let filteredList = finalList.filter(c => c.approved);

  console.log('filteredList', filteredList);

  return filteredList;
}


// generic JSON comment prompt
export const genericJSONPrompt = async (PROMPT, args={}) => {
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

console.log('FULL_REQUEST: ', FULL_REQUEST.messages[1].content);

    // step one, generate the JSON
    const VALIDATOR = PROMPT.schema;
    let attempt = 0, validJSON = false;
    while (attempt++ <=2) {
      // fetch a response from the OpenAI API
      const response = await openai.chat.completions.create(FULL_REQUEST);
      try {
        const resJSON = JSON.parse(response.choices[0].message.content); // openai returns JSON

 console.log('raw response', JSON.stringify(resJSON, null, 2));

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


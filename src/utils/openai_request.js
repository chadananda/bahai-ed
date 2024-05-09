import { object, string, array, boolean } from "zod";
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI });


const MODERATION_PROMPT = {
 schema: object({ comments: array(object({ id: string(), parentid: string().nullable(), name: string(),  content: string(),  moderated: boolean(), starred: boolean() })) }),

 schema_str: `object({ comments: array(object({ id: string(), parentid: string().nullable(), moderated: boolean(), name: string(), content: string(), starred: boolean() })) })`,

 system_instructions: "You are an expert moderator with years of experience moderating forum posts",
 model: 'gpt-3.5-turbo-1106', // might be too small, but must support JSON output
 prompt: `Article Description: "[description]"

 =====

 ## Instructions:

   Your task is to review a list of comment posts and moderate them. You are an expert moderator with years of experience moderating forum posts. You have a deep understanding of the topic and are able to quickly and accurately moderate comments. You take great joy in keeping the conversation civil and non-abusive.

   **Moderation of posts:** You will disallow comments by leaving the field "moderated:false" on the comment object. Otherwise, you will allow the comment by setting the field "moderated:true" on the comment object. Also, disallow duplicate replies, that is if the same person posts the same comment to the same parentid. In such cases, you may allow the first instance of the comment and disallow the rest. Here are some further guidlines for moderation:

    ### Moderation Guidelines
      * Disallow personal attacks, angry speech, and threatening or disrespectful language.
      * Disallow spam, irrelevant links, and excessive self-promotion.
      * Disallow trolling, off-topic discussions, and excessive negativity.
      * Disallow sharing of private information.
      * Disallow discussions promoting illegal activities.
      * Disallow inappropriate language and graphic content.

   **Starred posts:** Occasionally, an allowed comments is especially funny, insightful, kind, or otherwise interesting, you will highlight this post by setting the field "starred:true" to the comment object. Don't do this very often.

   **Format:** Following is the list of comment objects you need to review for this article. You will return exactly the same array of objects without modification -- other than setting the "moderated" and "starred" fields as described above. Do not return any response other than a JSON array of moderated comment objects.

## Comments Array:

[comments]

=================

 `
};

export const moderateComments = async (comments, description) => {
  // console.log('moderateComments:', comments.length, description);
  if (!description) { throw new Error('missing description'); return false; }
  // the array into a lookup object
  const lookup = comments.reduce((acc, obj) => ({ ...acc, [obj.id]: obj }), {});
  // simplify the objects to avoid confusing AI
  let simpleComments = comments.map(({id, parentid, name, content, starred, moderated }) => ({id, parentid, name, content, moderated, starred}));
  // console.log('simpleComments', simpleComments);
  // have the ai process the simplified list
  let moderatedList = await genericJSONPrompt(MODERATION_PROMPT, {comments:  JSON.stringify({comments: simpleComments}, null, 2), description});
  // console.log('moderatedList', moderatedList.comments);
  if (comments.length != moderatedList.comments.length) console.error('moderated list has different number of comments than original');
  // console.log('AI moderation returned:', moderatedList.comments);
  // don't trust AI -- use only the critical three fields
  const result = moderatedList.comments.map(({id, moderated, starred}) => {
    if (lookup[id]) return {
      id,
      moderated: !!moderated,
      starred: !!starred,
      name: lookup[id].name,
      content: lookup[id].content,
      parentid: lookup[id].parentid,
      postid: lookup[id].postid,
      description: '' // we no longer need this data cluttering the DB
    };
    else { console.error('missing id:', id); return null; }
  })
  // console.log('moderateComments result:', result);
  return result;
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

//console.log('FULL_REQUEST: ', FULL_REQUEST.messages[1].content);

    // step one, generate the JSON
    const VALIDATOR = PROMPT.schema;
    let attempt = 0, validJSON = false;
    while (attempt++ <=2) {
      // fetch a response from the OpenAI API
      const response = await openai.chat.completions.create(FULL_REQUEST);
      try {
        const resJSON = JSON.parse(response.choices[0].message.content); // openai returns JSON

 //console.log('raw response', JSON.stringify(resJSON, null, 2));

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


// api/process_posts -- a cron job to process pending article and comment changes

export const prerender = false;

// import { getPendingComments, deletePendingComments, getPendingArticlePosts, deletePendingPosts } from 'work/db';
import { moderateComments } from '@utils/openai_request';
import { getPostFromSlug } from '@utils/utils';
import brand from '@data/site.json';

import yaml from 'js-yaml';
import matter from 'gray-matter';
import dotenv from 'dotenv';  dotenv.config();
import fsPromises from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { Octokit } from "@octokit/rest"; // github api

// const GITHUB_REPO_URL = `${brand.github_project_url}.git`;
const GITHUB_PERSONAL_ACCESS_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const GITHUB_OWNER = brand.github_project_url.split('/')[3];
const GITHUB_REPO =  brand.github_project_url.split('/')[4];
const GITHUB_BRANCH = 'main'; // The default branch name


const octokit = new Octokit({ auth: GITHUB_PERSONAL_ACCESS_TOKEN });

export const GET = async ({ request }) => {
  // run this on a cron job every hour, for now we can test it at:  /api/process_posts
  try {
    // await processArticles();
    // await processComments();
  } catch (error) {
    console.error('processComments error', error);
  }
  return new Response('ok', { status: 200 });
}

// `Updates` is an array of {slug, comments} objects where slug is the article slug and comments is an array of comment objects.
// It is supposed to load the article comments file and append the list of comments to it's comments array and update the lastPostDate.
// If the file does not exist, it should create a new file with the comments array and lastPostDate.
// But at present, it seems to be just replacing the file with the new comments array.
async function updateCommentsFiles(updates) {
  // try {
  //   const owner = GITHUB_OWNER;
  //   const repo = GITHUB_REPO;
  //   const branch = GITHUB_BRANCH;

  //   const ref = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
  //   let latestCommitSha = ref.data.object.sha;
  //   const latestCommit = await octokit.rest.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
  //   let baseTreeSha = latestCommit.data.tree.sha;

  //   const treeItems = await Promise.all(updates.map(async ({ slug, comments }) => {
  //     const filePath = `src/content/comments/${slug}.json`;
  //     let existingCommentsArray = [];
  //     let fileExists = false;

  //     try {
  //       // Attempt to get existing file content
  //       const result = await octokit.rest.repos.getContent({ owner, repo, path: filePath, ref: branch });
  //       fileExists = true;
  //       const existingContent = Buffer.from(result.data.content, 'base64').toString();
  //       const existingData = JSON.parse(existingContent);
  //       existingCommentsArray = existingData.comments || [];
  //     } catch (error) {
  //       // File does not exist, so we will create it
  //       fileExists = false;
  //     }

  //     let newCommentsArray = [...existingCommentsArray, ...comments]; // Merge
  //     // filter out comments with duplicate postid
  //     newCommentsArray = newCommentsArray.filter((comment, index, self) => {
  //       return self.findIndex(c => c.postid === comment.postid) === index;
  //     });

  //     let newContentObj = {
  //       lastPostDate: new Date().toISOString(),
  //       comments: newCommentsArray
  //     };

  //     // Create a blob for the new content with formatted JSON
  //     const content = JSON.stringify(newContentObj, null, 2); // Format for readability
  //     const blob = await octokit.rest.git.createBlob({ owner, repo, content, encoding: 'utf-8' });

  //     return { path: filePath, mode: '100644', type: 'blob', sha: blob.data.sha };
  //   }));

  //   const newTree = await octokit.rest.git.createTree({ owner, repo, base_tree: baseTreeSha, tree: treeItems });
  //   const newCommit = await octokit.rest.git.createCommit({
  //     owner,
  //     repo,
  //     message: 'Batch update comments',
  //     tree: newTree.data.sha,
  //     parents: [latestCommitSha]
  //   });

  //   await octokit.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.data.sha });
  //   return true; // Success
  // } catch (error) {
  //   console.error('Failed to batch update comments:', error);
  //   return false; // Failure
  // }
}


async function getArticleDescription(slug) {
  const entry = await getPostFromSlug(slug);
  return entry?.data?.description;
}

// async function getArticleCommentsLastPostDate(slug) {
//   let commentsEntry = awai('comments', slug);
//   return commentsEntry?.data?.lastPostDate;
// }

// const loadCommentsFile = async (slug) => {
//   const __dirname = path.dirname(fileURLToPath(import.meta.url))
//   let commentsFile = path.join(__dirname, '../../content/comments', `${slug}.json`);
//   if (!fs.existsSync(commentsFile)) return false;
//   const fileData = fs.readFileSync(commentsFile, 'utf8');
//   return JSON.parse(fileData);
// }

// const saveCommentsFile = async (slug, comments) => {
//   const __dirname = path.dirname(fileURLToPath(import.meta.url))
//   let commentsFile = path.join(__dirname, '../../content/comments', `${slug}.json`);
//   let fileData = { "lastPostDate": new Date().toISOString(), comments };
//   return fsPromises.writeFile(commentsFile, JSON.stringify(fileData, null, 2));
// }

async function processComments() {
  // // load all comments from the database
  // let comments = await getPendingComments();
  // let finalComments = []
  // // each comment has a slug value and a post value
  // // I want a list of the unique slugs with terse ES6 syntax
  // const slugs = [...new Set(comments.map(comment => comment.slug))];
  // for (const slug of slugs) {
  //   let articleComments = comments.filter(c => c.slug === slug);
  //   let articleDescription = await getArticleDescription(slug);
  //   let moderatedComments = await moderateComments(articleComments, articleDescription);
  //   // remove any comments that were not approved
  //   moderatedComments = moderatedComments.filter(c => c.approved);
  //   finalComments.push({slug, comments: moderatedComments});
  // }
  // console.log('finalComments', JSON.stringify(finalComments, null, 2));
  // let success = await updateCommentsFiles(finalComments);
  // if (success) {
  //   console.log('Successfully saved comments, deleting pending comments...');
  //   await deletePendingComments();
  // } else {
  //   console.error('Failed to save comments in GitHub branch');
  // }
}

// for converting article text to an object like {data, content}
function md2json(md) {
  const { data, content } = matter(md);
  return { data, content };
}

// for converting an object like {data, content} to article mdoc file
function json2md({data, content}) {
  return '---\n'+ yaml.dump(data) + '---\n\n' + content;
}

async function updateArticleFiles(updates) {
  // try {
  //   const owner = GITHUB_OWNER;
  //   const repo = GITHUB_REPO;
  //   const branch = GITHUB_BRANCH;

  //   const ref = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
  //   let latestCommitSha = ref.data.object.sha;
  //   const latestCommit = await octokit.rest.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
  //   let baseTreeSha = latestCommit.data.tree.sha;

  //   const treeItems = await Promise.all(updates.map(async ({ slug, content, meta }) => {
  //     const filePath = `src/content/posts/${slug}/index.mdoc`;
  //     // let existingCommentsArray = [];
  //     let fileExists = false, entry = {};
  //     try {
  //       // Attempt to get existing file content
  //       const result = await octokit.rest.repos.getContent({ owner, repo, path: filePath, ref: branch });
  //       fileExists = true;
  //       const existingContent = Buffer.from(result.data.content, 'base64').toString();
  //       // it's a yaml-header markdown file so we need to parse it
  //       entry = md2json(existingContent);
  //       if (meta) {
  //         entry.data = meta; // update
  //         console.log('updated meta', entry.data);
  //       }
  //       if (content && content.length > 100) {
  //         entry.content = content; // update
  //         console.log('updated content');
  //       }
  //     } catch (error) {
  //       // File does not exist, so we will create it
  //       fileExists = false;
  //     }
  //     const newMD = json2md(entry);
  //     const blob = await octokit.rest.git.createBlob({ owner, repo, content: newMD, encoding: 'utf-8' });
  //     return { path: filePath, mode: '100644', type: 'blob', sha: blob.data.sha };
  //   }));

  //   const newTree = await octokit.rest.git.createTree({ owner, repo, base_tree: baseTreeSha, tree: treeItems });
  //   const newCommit = await octokit.rest.git.createCommit({
  //     owner,
  //     repo,
  //     message: 'Batch update articles',
  //     tree: newTree.data.sha,
  //     parents: [latestCommitSha]
  //   });
  //   await octokit.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.data.sha });
  //   return true; // Success
  // } catch (error) {
  //   console.error('Failed to batch update posts:', error);
  //   return false; // Failure
  // }
}

async function processArticles() {
  // // load all article data from the database
  // let posts = await getPendingArticlePosts(); // array of  {slug, content, meta}
  // // console.log('posts', posts.length, JSON.stringify(posts, null, 2));
  // let success = await updateArticleFiles(posts);
  // if (success) {
  //   console.log('Successfully saved article data, deleting pending article changes...');
  //   await deletePendingPosts('article');
  // } else {
  //   console.error('Failed to save article updates in GitHub branch');
  // }
}

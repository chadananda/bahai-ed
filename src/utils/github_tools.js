// src/pages/api/article.js
export const prerender = false; // ie. SSR

import { Octokit } from "@octokit/rest"; // github api
import brand from '@data/site.json';
const GITHUB_PERSONAL_ACCESS_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const GITHUB_OWNER = brand.github_project_url.split('/')[3];
const GITHUB_REPO =  brand.github_project_url.split('/')[4];
const GITHUB_BRANCH = 'main'; // The default branch name


// receives an array of {path, content} objects
// updates all files to main branch in single commit
export async function updateGithubFiles(updates, commitMessage='updateGithubFiles') {
  const octokit = new Octokit({ auth: GITHUB_PERSONAL_ACCESS_TOKEN });
  try {
    const owner = GITHUB_OWNER;
    const repo = GITHUB_REPO;
    const branch = GITHUB_BRANCH;
    const ref = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
    let latestCommitSha = ref.data.object.sha;
    const latestCommit = await octokit.rest.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
    let baseTreeSha = latestCommit.data.tree.sha;
    // build new tree of updates
    const treeItems = await Promise.all(updates.map(async ({ path, content }) => {
      const blob = await octokit.rest.git.createBlob({ owner, repo, content, encoding: 'utf-8' });
      return { path, mode: '100644', type: 'blob', sha: blob.data.sha };
    }));
    const newTree = await octokit.rest.git.createTree({ owner, repo, base_tree: baseTreeSha, tree: treeItems });
    const newCommit = await octokit.rest.git.createCommit({
      owner, repo, message: commitMessage,
      tree: newTree.data.sha,
      parents: [latestCommitSha]
    });
    await octokit.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.data.sha });
    return true; // Success
  } catch (error) {
    console.error('Failed to batch update:', error);
    return false; // Failure
  }
}
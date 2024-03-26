# Serverless API for Comment Submission

## Overview

This document specifies the serverless function deployed on Vercel for handling comment submissions to blog posts. The function will receive POST requests containing comment data, update the relevant post's comment file in the repository on a separate `comments` branch, and commit the changes.

## Endpoint

- **URL:** `/api/submit-comment`
- **Method:** `POST`
- **Content-Type:** `application/json`

## Request Body

The request body must be a JSON object containing the following fields:

- `postId`: The unique identifier of the post to which the comment is being added.
- `commentParentId`: The identifier of the parent comment (if any) to support threaded comments. This can be `null` for top-level comments.
- `name`: The name of the person submitting the comment.
- `email`: The email address of the person submitting the comment. (Note: This will not be published but may be used for validation or notifications.)
- `commentText`: The text of the comment.

## Functionality

1. **Parse Request:** Extract `postId`, `commentParentId`, `name`, `email`, and `commentText` from the incoming request.

2. **Repository Setup:**
   - Clone the repository to a temporary directory, ensuring security measures are in place for access.
   - Configure Git for sparse checkout, focusing on the `src/content/comments/` directory.

3. **Comment File Update:**
   - Check if `src/content/comments/[postId].json` exists; create it if not.
   - Read the current contents of the file, add the new comment with an 'unapproved' status, and update the file.

4. **Commit and Push:**
   - Commit the changes with a clear message, e.g., "Add new comment to post [postId]."
   - Push the commit to the `comments` branch of the repository.

5. **Cleanup:** Ensure temporary files and the cloned repository are cleaned up after the operation.

## Security and Best Practices

- Use secure methods for repository authentication, storing credentials as environment variables.
- Implement input validation and sanitization to prevent injection and other attacks.
- Consider rate limiting and error handling to manage abuse and operational issues gracefully.

## Dependencies

- Git and any necessary authentication mechanisms for repository access.
- A JSON parser for handling the request body and updating comment files.

## Error Handling

The function should gracefully handle and log errors, including:
- Invalid request data.
- Failures in cloning the repository or checking out files.
- Issues with file operations (read/write).
- Errors during the commit and push process.

## Testing

Comprehensive testing should cover:
- Submission of comments with valid and invalid data.
- Handling of non-existent post IDs.
- Correct file update and commit operations.
- Error scenarios and rate limiting.

## Deployment

Deploy the serverless function on Vercel, ensuring that all environment variables and permissions are correctly set up.


# Bahai-education.org

A personal blog about Baha'i Education

I think religion can be described as a school with a curriculum of study and a heck of a lot of project assignments. It's as if the entire purpose of Religion and life itself is to train us in spiritual perspectives.

It's a classroom from which there is no escape. Those who turn away from religion end up subscribing to false religions of secularism -- which end up being even more dogmatic and ugly than the worst of what we've done with God's religions.

At the end of the day, everything is purpose and identity. Those who give up on the metaphysical identity which unifies us fall into the tribal identities which divide.

This is a website for me to post my ramblings and get feedback from friends and family. If you find any thing useful, good.


## Coding style guide (for Copilot/Aider)

* CSS should use Tailwind classes for styling and avoid custom CSS where possible
* Every JS function should include a detailed JSDoc header explaining in terse but clear terms what it does. This is meant to be read by machine
* JavaScript should follow Airbnb style guide where possible
* Functions and methods should have descriptive names that clearly convey what they do
* Follow a "convention over configuration" style where practical to avoid boilerplate code
* Follow Astro coding conventions: https://docs.astro.build/en/getting-started/
* Use semantic HTML for SEO clarity
* Leverage Tailwind CSS utility classes for responsive design
* Follow best practices for accessibility
* Use Astro components and utilities where possible for shared UI
* Leverage Astro data hooks for fetching async data
* Code islands should be deferred using Astro's `<script setup>` SFCs
* Data fetching should leverage Astro's `useLoaderData` and `useDeferredData` hooks
* Shared UI components should be extracted to the `src/components` directory and imported
* All pages are static except for pages under /auth which are SSR and accessible by login only


# Astro Vercel Site with PostgreSQL Authentication System

## Serverless API Endpoints (`/api/`)
- **`register.js`**:
  - `handleRegistration()`: Handles user registration, including saving user data in PostgreSQL.
- **`login.js`**:
  - `handleLogin()`: Authenticates users and returns a JWT.
- **`reset-password.js`**:
  - `handlePasswordReset()`: Manages password reset requests and email sending.

## Utility Functions (`/src/utils/`)

## Frontend Pages (`/src/pages/`)
- **`auth/login.astro`**:
  - Contains the login form, submitting credentials to the `/api/login.js`.
- **`auth/register.astro`** (optional):
  - Registration form for new users.
- **`auth/reset-password.astro`** (optional):
  - Page for initiating a password reset.

## Initial Setup Check (`/api/setup.js`)
- **`checkDatabaseSetup.js`**:
  - Checks for the necessary tables; creates them if absent.



# Task: Implement Login System for Astro Vercel Site with PostgreSQL

## Objective
Develop a comprehensive login system for an Astro Vercel site with PostgreSQL, featuring user registration, authentication, password reset functionality, and an initial database setup check.

## Steps

1. **Serverless API Endpoints (`/api/`):**
   - `register.js`: Implement user registration, storing user details in the database.
   - `login.js`: Handle user login, generate JWT for authenticated sessions.
   - `reset-password.js`: Manage password reset functionality.
   - `setup.js`: check for database setup, also for user table

2. **Database Connection and Models (`/src/utils/`):**

3. **JWT Utility (`/src/utils/jwtUtil.js`):**
   - Implement functions for generating and verifying JWT tokens.

4. **Frontend Authentication Pages (`/src/pages/auth/`):**
   - `login.astro`: Frontend page for user login.
   - `register.astro` (Optional): Frontend page for user registration.
   - `reset-password.astro` (Optional): Frontend page for password reset.

5. **Initial Database Setup Check (`/api/setup.js`):**
   - Check for the existence of the PostgreSQL database connection
   - If not present, provide instructions for setting up Vercel PostgreSQL
   - If database connection but 'users' table is missing, create it and prompt the administrator to set their initial password.



Content Plan:

To develop FAQs and Author Pages, we need to create some content collections:

1. tag FAQs
  * tags are subject
  * List of questions, answers and related resources
  * FAQ on each Tag page

1. team Bios
  * objects for each author
  * Checks for author and gives author description and picture

1. Add some Ocean content
  * The Ocean Adventure
  * About Ocean 2.0 Interfaith Reader
  * Ocean: Reading and Search
  * Ocean: Study notes, translation & Compilations
  * Ocean: Exploring the Library
  * Ocean: Sharing quotes
  * Ocean: Help and Contribution

### Potential Article Data types

* Article (public, description, content)
* Team (public: description, style, bio, audio)
  * We'll need internal Complex Persona API
* Topic (public: description, keyword, FAQ)
* Category (internal: topics, keywords, questions)
  * We'll need a Keyword API
* ContentPlan (Article Topic/Keyword plans by Category)
* Serp (internal: top 100 results by keyword with top-10 summaries)
  * We'll need SERP API

### Article System Setup Process
_The organization structure of content needs to be like an accordion which can expand and contract to fit the content base.
 * _Category:_ Websites often have near-unrelated content by context or type such as articles and newsletters.
 * _Topic:_ allows many related articles to be interlinked with tags
 * _Subtopic:_ have a semantic meaning and a keyword cluster.
 * _SERPS:_ each keyword has traffic numbers and search results.
 * _Article:_ each article addresses one subtopic answering questions about that subtopic
_A typical website should have topical CATEGORIES, several writers covering each category, fifty MAIN TOPICS (tags) within each category, and a plan for at least 30 ARTICLES per topic. Each ARTICLE PLAN will have several related keywords organized into a keyword ladder._

* _Categories:_ Identify Categories & Semantic Topics (tags)
* _Keyword research:_ Generate a list of hypothetical keywords & questions for each topic
  * fetch list keyword phrases for each (min three words)
  * create SERP entries for each keyword phrase

    **subtopic questions prompt:**
    "Generate a list of concise questions reflecting the search intent of readers for a given SEO subtopic. The questions should be derived from the subtopic's title, its definition, and related keywords. Ensure each question is straightforward and avoids semantic duplication, directly addressing the most likely queries that could be answered effectively in an informational article. The goal is to cover the subtopic's key aspects comprehensively while remaining succinct."

* _Create team:_ of writers and Editors
  * Assign writing categories
  * Choose voice for each
  * Create social accounts for each
    * Post to social accounts
    * Purchase initial audience for each on fiverr
* _Content Planning:_ (By Category & Topic), create content plan
  * Each content plan has proposed thesis, keyword phrases, keyword ladder, author and editor
  * Each content plan has can be converted into a draft article outline
* Category (internal: topics, keywords, questions)
  * We'll need a Keyword API
* ContentPlan (Article Topic/Keyword plans by Category)
* Serp (internal: top 100 results by keyword with top-10 summaries)
  * We'll need SERP API


====================================

## Prompts:

### Generate a category entry: _categories/[category].md

Context:
  Category: SEO

Instructions:
  Create a list of specific and distinct topics within the given category. Each topic should be a focused aspect or a specialized area within the overarching category, ensuring that they are not too broad or generic to become categories in themselves. The topics should provide in-depth exploration opportunities within the category, offering unique and detailed insights or practices. They should be clearly differentiated from one another, avoiding overlap or repetition. The goal is to identify sub-areas that are integral to the category, providing a comprehensive yet specialized understanding relevant to professionals or enthusiasts in the field.

  You may use a hypothetical value for traffic.
  Output in YAML format in a code window in a format like this:

---
category: SEO
category_slug: seo
traffic: 8000
topics:
  technical-seo: "Technical SEO"
  on-page-seo: "On-Page SEO"
  off-page-seo: "Off-Page SEO"
  content-seo: "Content SEO"
  keyword-research: "Keyword Research"
  mobile-seo: "Mobile SEO"
  ...
---


### Generate category topic file with brief list of subtopics:  _topics/[topic].md

Context:
  Category: "Baha'i Faith"
  Topic: "Ocean Library"

Instructions:
  Generate a subject file for the given topic the context of the given category.
  Output a YAML object in a code window with the following fields:

* 'topic': the topic
* 'topic_slug': Provide a slugified version of the topic
* 'category': the category
* 'traffic': Total of the traffic for each of the keywords associated with this topic. (Use a hypothetical number here.)
* 'image': default value should be "image.png"
* 'description': Offer a brief semantic summary of the topic, highlighting its significance and scope within the main topic. This field should be in quotes
* 'subtopics': an list of ALL the specific and distinct subtopics within the given topic. Each subtopic should be a focused aspect or a specialized area within the topical category, ensuring that subtopics are not too broad or generic to become topics in themselves. The topics should provide in-depth exploration opportunities within the topical space. They should be clearly differentiated from one another, avoiding overlap or repetition. The goal is to identify sub-areas that are integral to the topic, providing a comprehensive yet specialized understanding relevant to professionals or enthusiasts in the field. Subtopics should the organized as an object of [subtopic slug]:[subtopic] fields.



### Generate detailed list of subtopic details:  _subtopics/[topic].md

Context:
  Category: "Baha'i Faith"
  Topic: "Bahá'í History"
  subtopics:
    the-bab-and-babi-movement: "The Bab and Babi Movement"
    life-of-bahaullah: "Life of Baha'u'llah"

Instructions:
  Develop detailed subtopic details, and generate a set of concise, intent-focused questions for each subtopic. This should be structured in a YAML format with fields for 'name', 'description', 'traffic', 'keywords', and 'questions' for each subtopic.

For each subtopic:

* subtopic: [this subtopic]
* subtopic_slug: [a slugified version of this subtopic]
* traffic: [total of all keyword traffic for the subtopic's keywords]
* keywords: List of semantically identical keywords likely to match the search intent. Keywords should be an object with keyword slug as the key and estimated traffic as the value. (Hypothetical values are acceptable, sorted from highest to lowest

Additionally, for each subtopic, create a list of questions by following these guidelines:

  Questions should directly reflect the search intent of readers, derived from the subtopic's title, definition, and keywords.
  Ensure clarity and conciseness in each question, avoiding semantic duplication.
  Questions should address likely queries that readers would seek to answer in an informational article.
  Aim to cover the subtopic's key aspects comprehensively yet succinctly.
  This comprehensive subtopic list with targeted questions will provide a deep and structured exploration of the topic within the broader category of SEO. It will serve as a guiding framework for content creation, research, and user engagement."
  Questions should each be in quotations.

Output as Yaml in a code Window




## FAQ Prompt
### Generate SEO FAQ Pages in YAML Format with Specific Resources:

Context:
  Category: "Baha'i Faith"
  Topic: "Ocean Library"
  Resources links:
  - https://oceanlibrary.com/about
  - constitution-of-the-universal-house-of-justice

Generate a comprehensive and engaging FAQ page for this category, focusing on this topic, and structure them in a YAML format. Utilize only the provided list of summary resources to enrich the answers. Each FAQ page should be well-organized, informative, and engaging, encouraging readers to explore the topic further.

Your task is to create a YAML object for an FAQ page with the following structure:

topic: [given topic]
topic_slug: [slugified version of topic]
category: [given category]
title: Develop a fun, punny, and click-bait title that reflects the essence of the topic in a humorous yet informative way.
description: Craft a concise (under 200 characters) but compelling description that highlights the key benefits and solutions provided by understanding the topic.
faqs: List relevant questions and provide detailed answers. Follow these guidelines for each FAQ entry:
question: Frame a question that is likely to among the most asked about the topic.
answer: Provide a thorough, conversational, yet competent answer. Aim to satisfy the reader's query in as few words as possible, incorporating practical tips and actionable insights.
resources: Include list of links from the provided list of summary resources that are relevant to the answer.

Remember to:
* Ensure the content is reader-friendly, engaging, and full of practical insights.
* Each FAQ should be topic-specific and not overlap with other SEO categories.
* Use the provided resources effectively to add depth to each answer.
* Output using a YAML code window




## image prompt

Subject: Baha'i Faith

Instructions: Please provide a wide image on this subject using the style defined below:

Style: Low fidelity watercolor image which looks hand-made on rough-press white paper. Emphasis on blue palletes a tiny bit of browne -- a very limited color range and white borders. Any background should be blurred and any forground low-fidelity hand-made watercolor paints. Some slight dripping is acceptable.


## Useful links:

* Chatbot component (tailwind): https://tailwindcomponents.com/component/chat-box
* Free png>svg converter: https://www.autotracer.org/

## 404 paths to fix:

ocean/
ocean
ocean/Ocean_English.exe
ocean.html
ocean/OceanCD-Multilingual.zip
ocean/faq.htm
ocean/OceanCD-Spanish.zip
ocean/download.htm
default.htm

star/
star-of-the-west

===

materials/essays/proclamation_hands.htm
materials/badasht/little badasht materials.pdf

Youth-and-Decision-Making.htm
materials/pm/Intro_to_study.htm
iqan
materials/badasht
news/acuto-discourse-abdul-baha-resources
news/ali-nakhjavanis-talk-institute-process-core-activities


## Dev and Content Plan for Today

x Fix assets (without checking them in twice?)
  x Strategy: all assets to be served directly get an underscore
    * all underscore assets get copied to `public/posts/[slug]/_*
    * all public get checked into github
    * gitignore all src/public/content/posts/*/_*
x Related Articles Column on the right for desktop
x Change login to work with env variables instead of DB

* Set up Svelte dashboard
  * Dashboard page
    * Cards for:
      * Content: Articles
      * Categories, Topics, Sub-topics, Subscribers
      * Scheduled emails?

  * Sidebar
    * Site planning - categories/topics/subtopics
    * Keyword planning
    * Content
      * Edit existing post
      * Create new post wizard

    * Mangage users





  * Svelte CMS: topic manager, keyword researcher, article proposal
  * Article Writer Script

* Create RSS feed for article podcasts
* Check JSON-LD
* Resize all images (image sets don't work, do it manually)
x Related Articles
x Fix audio player after upload (might be assets issue)
* Possibly have script relocate assets to a CDN?
* Newsletter Signup
* Q&A section
* Article FAQ section



x Fix resource component to have images for types
x Fix broken links on site
* Fix JSON-LD objects
x Add comments section to article pages
x Fix sitemap




* Complete current articles
  x Ocean 1.0 -- provide a download S3 link for old installer
    * add funny facts section with mention of the page numbers
  x Letter from House of Justice -- generate audio
  * Sifter, generate podcast
    * Add resources section about Star of the West

* Resources articles:
  * Some materials for the study of the Kitab-i-Iqan
    * Link to Ocean with explanation
    * Link to Dunbar book
    * Side-by-Side PDF
    * Audio download
    * Audio for "Heart of the Iqan:
    * Favorite Quotes
    * Excerpt of the Story of Nuri-Dín

  * Some materials for the study of the Dawn-Breakers
    * Downloads of the document
    * Link to Ocean with explanation of benefits
    * Little Badasht maps
    * List of Characters

  * Materials for the study of Advent of Divine Justice
    * Notes by Troxel
    * links to translation in OOL
    * My story of Mongolia

  * Add a Dwayne Troxel persona and article about Star of the West

* Project Write-ups
  * The "little Badasht" adventure
  * The Novel Arabic project
  * The "Dawn-Breakers" challenge summer
  * Mongolian teaching adventure
  * Romainian teaching adventure
  * Alaska "littleBadasht" conference
  * Temple Acadamy Concept

## Custom GPTs I need

### Help me Build an article
  * Fetch topics list, fetch articles list from sitemap
  * Interview user and help build an outline and a yaml header
  * When satisfied, output yaml with outline
    * add proposed text underneath each bullet
  * Then build image according to style

### Generate author persona for real person
  * generate author persona based on information present

### Generate article from Video transcript


## Todo Next

[] SEO content: create content matching top searches
   [x] The mystical meaning of 5
   [] Ayyam-i-Ha', days of 5
   [] Powerful Prayers for Protection
   [] Baha'i temples: the mysterious Mashriqu'l-Adhkar

[] Legacy content: Create content matching old site
   [x] dawn-breakers resources
   [] Centenary summer of Dawn-Breakers
   [] Dawn-Breakers Challenge Road Trip
   [] Dawn-Breaker's Challenge Romania
   [] Dawn-Breaker's Challenge @ desert rose
   [] Ayyam-i-Ha' meaning
   [x] dawn-breakers printable
   [] Erica's strengthening unity (adventure in India)
   [] Magic memorization tool?

[] asset build script
   [] terms: correct common Baha'i terms
   [] topics: load all article topics by category, load category files, check list and add new ones. generate topic files
   [] translations: load articles, check pubdate for out of date or missing translations & replace
   [] podcasts: load all articles, check modified date [] regenerate audio if older

[] Podcast feeds: add feed script per language.
[] Translations: build header references if translations exist & article translation menu
[] Promote:
   [] podcast feed using fiverr
[] Dawn-Breakers resources:
   [] Press release
   [] Share with Facebook group
[] 5-mystery:
   [] Share on facebook
   [] Press release



[x] make an unrealistic plan for today
[] get admin area working on production
[x] modify article update to go straight to github, perhaps to another branch
[x] modify github code to take a list of files and file content so we can simplify updates
[] extend functionality to editor to add
   [] aside
   [] images
   [] external video
   [] download resources
[] Page meta editor
[] 308 redirect editor

## Problem:
- Q: people spend months integrating a custom editor into their cms, it's complex
  - we can already edit with vscode, but we cannot generate assets automatically
  - what if it takes us months to complete the UI? how do we proceed without?

- A: generate_article_assets.js
  - local script which finishes an article
    - podcast audio
    - translations
    - Q&A interview questions & expected answers (unpublished by default)
    - suggestions file?
      - promotion strategy
      - promotion schedule
      - linkbait enhancement ideas
- A: perform competitive analysis in advance


[] content ideas:
  [] NovelArabic
  [] DB Resources page
  [] Iqan resources page
  [] The Dawn-Breakers Challenge program at DRBI (with invite link)
  [] The Peerless Scholars list of the Iqan
  [] Interviews with Authors
    [] Mr. Dunbar: Forces, Companion, (comps) materialism, etc
    [] Lameh Fananapazir: Crossroads,
    [] Nadir Sa'idi: Gate of the Heart
    [] Todd Lawson: (book on qur'an I've still not read)
    [] Julio Savi?
    [] Alan Watts: 239 days?
    [] others?
    [] Schecter family about Fred?

  [] Interviews with Baha'is:
    [] Carol Spell on Brighton Creek
    [] ___ on Clara Dunn academy
    [] ___ on Badasht Academy
    [] ___ on

[] Implement automatic generation of podcast
[] Implement podcast RSS feed
[] Automatic article translation generation
   [] stored in same folder with language code appended??
[] remove category and topic reference definition and then
   [] automatically generate of category and topics
[] article creation wizard
   [] from suggestion (any)
   [] from video (review)
   [] from concept
[] site planning wizard
[] article suggestion object
[] create a "Dawn-Breakers Resources" page
[] How are we going to do keyword and SPR analysis?


Todo:
  * Remove block for April
  * Contact Carol Spell for information about Brighton Creek
  * Ask Telahoun if he would be willing to be administrator
  * Replace signs on Office and Roundhouse

Internationalization considerations:
  * Ideal organization is /src/content/posts/date - slug/index.mdoc | es.mdoc | fa.mdoc
  * Ideal presentation is /[slug] | [tr slug]
  * Problems:
    * in components, we're using slug to get path
      * solution: add util.astro function to get article path and translation slugs
    * in base article display file we're using slug for path
      * solution: extract slug in loop instead of using
    * we're copying non-image files to public/[slug]/_* for easy access

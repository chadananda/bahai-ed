import { z, reference } from "astro:content";

export const LANG_CODES = [
  "ab","aa","af","ak","sq","am","ar","an","hy","as","av","ae","ay","az","bm","ba","eu","be","bn","bh","bi","bs","br","bg","my","ca","km","ch","ce","ny","zh","cu","cv","kw","co","cr","hr","cs","da","dv","nl","dz","en","eo","et","ee","fo","fj","fi","fr","fy","ff","gd","gl","lg","ka","de","ki","el","kl","gn","gu","ht","ha","he","hz","hi","ho","hu","is","io","ig","id","ia","ie","iu","ik","ga","it","ja","jv","kn","kr","ks","kk","rw","kv","kg","ko","kj","ku","ky","lo","la","lv","lb","li","ln","lt","lu","mk","mg","ms","ml","mt","mi","mr","mh","mn","na","nv","nd","ne","ng","nb","nn","no","ii","oc","oj","or","om","os","pa","pi","fa","pl","ps","pt","qu","rm","rn","ro","ru","sa","sc","sd","se","sm","sg","sr","gd","sn","si","sk","sl","so","st","es","su","sw","ss","sv","tl","ty","tg","ta","tt","te","th","bo","ti","to","ts","tn","tr","tk","tw","ug","uk","ur","uz","ve","vi","vo","wa","cy","wo","fy","xh","yi","yo","za","zu",
];

export const ORG_TYPE = [
  "Organization","Corporation","GovernmentOrganization","NGO","EducationalOrganization","SportsTeam","MusicGroup","PerformingGroup","NewsMediaOrganization","FundingScheme","LibrarySystem","MedicalOrganization","WorkersUnion","Consortium","Airline","Brand",
];

export const POST_TYPES = [
  "Article","WebPage","Event","Organization","Person","LocalBusiness","Product","Recipe","Review","BreadcrumbList","Course","JobPosting","Movie","MusicAlbum","QAPage","SearchResultsPage","SoftwareApplication","VideoObject","BookReview","VideoReview",
];

export const post_schema = ({ image }) =>
  z.object({
    title: z.string().max(100).default(""),
    url: z.string().max(100).default(""),
    post_type: z.enum(POST_TYPES).default("Article"),

    description: z.string().max(160).default(""), // 160 char limit
    desc_125: z.string().default(""), // short description for RSS feed
    abstract: z.string().default(""), // longer, like 500 chars min

    language: z.enum(LANG_CODES).default("en"),
    audio: z.string().nullable().default(""), // url to audio file
    audio_duration: z.string().nullable().default(""), // duration of audio in ISO 8601 format
    audio_image: image().nullable().optional(), // image for audio
    narrator: z.string().nullable().default("auto"), // auto generated or name of narrator
    draft: z.boolean().default(true),

    author: z.string().nullable().optional(), //reference("team").nullable().optional(),
    editor: z.string().nullable().optional(), //reference("team").nullable().optional(),
    category: z.string().nullable().optional(),
    topics: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]), // will be an array of references soon!

    datePublished: z
      .string()
      .transform((str) => new Date(str))
      .default(""),
    dateModified: z
      .string()
      .transform((str) => new Date(str))
      .default(""), // do we need?

    // image: z.string().nullable().default("")
    image: z.object({
      src: image().refine((img) => img.width >= 300, {
        message: "Main image must be at least 300 pixels wide!",
      }).optional(),
      alt: z.string().default(''),
    }).optional(),
  });

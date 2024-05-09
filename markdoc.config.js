import { defineMarkdocConfig, component, nodes } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  nodes: {
    'image': {
      ...nodes.image, // Apply Markdoc's defaults for other options
      render: component('./src/components/article/mdoc_image.astro'),
    },
    paragraph: {
      ...nodes.paragraph,
      render: component('./src/components/article/textPreprocessor.astro'),
    },
  },

  tags: {
    'audio-player': {
      render: component('./src/components/article/AudioPlayer.astro'),
      attributes: {
        src: { type: String, required: true },
        title: { type: String, required: false },
      },
    },
    'aside': {
      render: component('./src/components/article/Aside.astro'),
      attributes: {
        link: { type: String, required: false },
        linkText: { type: String, required: false },
      },
    },

    'related-resource': {
      render: component('./src/components/article/RelatedResource.astro'),
      attributes: {
        meta: { type: Object, required: true, default: {} },
        link: { type: String, required: false },
        type: { type: String, required: false },
        title: { type: String, required: false },
        // image link
        // image: {type: Image, required: false },
        image: { type: String, required: false },
        description: { type: String, required: false }
      },
    },

    'book-quote': {
      render: component('./src/components/article/BookQuote.astro'),
      attributes: {
        meta: { type: Object, required: true, default: {} },
        bookLink: { type: String, required: true },
        bookTitle: { type: String, required: true },
        content: { type: String, required: true },
      },
    },

    'video-player': {
      render: component('./src/components/article/VideoPlayer.astro'),
      attributes: {
        meta: { type: Object, required: true, default: {} },
        // video: { type: Object, required: true, default: {} },
        videoURL: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        duration: { type: String, required: false },
        image: { type: String, required: false },
        transcript: { type: String, required: false },
      },
    },

  },
});

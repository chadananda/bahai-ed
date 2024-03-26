import { Node } from '@tiptap/core';
import ImageNodeViewAdapter from './ImageNodeViewAdapter.js';

export const CustomImage = Node.create({
  name: 'image',
  group: 'inline',
  inline: true,
  draggable: false,

  addAttributes() {
    return {
      src: {},
      alt: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', HTMLAttributes];
  },

  addNodeView() {
    return ({ node, view, getPos, decorations, extension }) => {
      // Extract slug from extension options
      const slug = extension.options.slug;
      return new ImageNodeViewAdapter({
        node, view, getPos,
        slug, // Include slug here
      });
    };
  },

});

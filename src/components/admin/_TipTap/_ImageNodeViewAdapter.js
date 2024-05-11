// ImageNodeViewAdapter.js
import ImageNodeView from './_ImageNodeView.svelte';

export default class ImageNodeViewAdapter {
  constructor({ node, view, getPos, slug, editor }) { // Include slug in the parameters
    const componentContainer = document.createElement('span');
    this._component = new ImageNodeView({
      target: componentContainer,
      props: {
        node,
        editor,
        view,
        getPos,
        slug, // Pass slug down to the Svelte component
      },
    });
    this.dom = componentContainer;
  }

  destroy() {
    if (this._component) {
      this._component.$destroy();
    }
  }

  // Implement other Node View methods as required by TipTap, if any
}

<script>
import HonestEditor from "honest-editor-js";
import "honest-editor-js/app.css";

const honestEditor = new HonestEditor("honest-editor");

honestEditor.setContent(`
  # Honest Editor
  ## brought to you by Honest.Cash

  - beautiful
  - ultrafast
  - real-time markdown -> html
  - offline saves
  - programmable interface
`);

honestEditor.subscribe(newMarkdown => {
 // console.log(newMarkdown)
});

const markdown = honestEditor.getContent();
const store = honestEditor._getStore();

</script>




<div id="honest-editor"></div>
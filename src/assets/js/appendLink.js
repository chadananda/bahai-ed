// append link to copied text for citation purposes

const copyListener = (event) => {
 const range = window.getSelection().getRangeAt(0),
   rangeContents = range.cloneContents(),
   pageLink = `${document.location.href}`,
   helper = document.createElement("div");
 helper.appendChild(rangeContents);
 event.clipboardData.setData("text/plain", `${helper.innerText}\n\n${pageLink}`);
 event.clipboardData.setData("text/html", `${helper.innerHTML}<br>${pageLink}`);
 event.preventDefault();
};
document.addEventListener("copy", copyListener);
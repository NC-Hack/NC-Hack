(async function() {
let announcementValidate = {};


  function checkAnnounceValidation(id) {
    if (announcementValidate[id]) document.getElementById(`ui-${id}-btn`).removeAttribute("disabled");
    else if (!document.getElementById(`ui-${id}-btn`).disabled) document.getElementById(`ui-${id}-btn`).disabled = true;
  }

function markPositive(element) {
  element.parentElement.parentElement.classList.remove("errorBox");
  element.parentElement.parentElement.classList.add("successBox");
  document.getElementById(`${element.id}-help`).hidden = true;
}

function markNegative(element, msg) {
  element.parentElement.parentElement.classList.add("errorBox");
  element.parentElement.parentElement.classList.remove("successBox");
  let notice = document.getElementById(`${element.id}-help`);
  notice.innerHTML = msg;
  notice.hidden = false;
}

for (let t of document.getElementsByClassName("announcement-text")) {
  t.innerHTML = (new showdown.Converter()).makeHtml(t.innerHTML)
}
  for (let t of document.getElementsByClassName("created")) {
    t.innerHTML = `(${new Date(t.innerHTML).toLocaleString()})`;
  }

  for (let e of document.getElementsByClassName("announce-type")) {
    document.getElementById(`md-preview-${e.id}`).innerHTML = (new showdown.Converter()).makeHtml(e.innerHTML);
    e.addEventListener("input", function() {
      if (!this.value) {
        markNegative(this, "You must specify a message.");
        announcementValidate[this.id] = false;
        document.getElementById(`md-preview-card-${this.id}`).hidden = true;
      } else {
        document.getElementById(`md-preview-${this.id}`).innerHTML = (new showdown.Converter()).makeHtml(this.value);
        document.getElementById(`md-preview-card-${this.id}`).hidden = false;
        markPositive(this);
        announcementValidate[this.id] = true;
      }
      checkAnnounceValidation(this.id);
    });
  }
})();

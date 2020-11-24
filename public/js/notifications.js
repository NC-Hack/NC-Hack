(async function() {
  let res = await fetch(`${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/fetch-notifications`).then(response => response.json());
  let list = res.body.reverse();
  let read = list.filter(i => i.noticed);
  let unread = list.filter(i => !i.noticed);
  function createNotif(i) {
    let image = document.createElement("img");
    let element = document.createElement("a");
    if (i.type) {
      //Infraction
      switch (i.type) {
        case "suspend":
          element.innerHTML = `You were suspended${i.mod && i.mod.name ? ` by ${i.mod.name}` : "" }. Click for more information`;
          break;
        case "unsuspend":
          element.innerHTML = `You were unsuspended${i.mod && i.mod.name ? ` by ${i.mod.name}` : "" }. Click for more information`;
          break;
        case "message":
          element.innerHTML = `You received a message from ${i.mod && i.mod.name ? i.mod.name : "a moderator" }. Click for more information`;
          break;
        case "announcement":
          element.innerHTML = `${i.mod && i.mod.name ? `${i.mod.name} published a new announcement` : "A new announcement has been published" }. Click for more information <span style="color:gray">(${new Date(i.created).toLocaleString()})</span>`;
          break;
      }
      element.href = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/message/${i._id}`;
      image.src = i.mod ? i.mod.avatar || "/images/favicon.ico" : "/images/favicon.ico";
      element.innerHTML = `<img src="${i.mod ? (i.mod.avatar || "/images/favicon.ico") : "/images/favicon.ico"}" style="border-radius:50px;width:30px;display:inline;margin-right:10px;">${element.innerHTML}`
    } else {
      //Announcement
    }
    element.classList.add("dropdown-item");
    return element;
  }
  if (unread.length >= 1) {
    document.getElementById('notif-bell').innerHTML = "notifications_active";
    document.getElementById('notif-bell').parentElement.style = `color:yellow;`;
    for await (let a of unread) {
      document.getElementById('unread-notifs').appendChild(createNotif(a));
      let div = document.createElement("div");
      div.classList.add("dropdown-divider");
      document.getElementById('unread-notifs').appendChild(div);
    }
  } else {
    let disabledElement = document.createElement("a");
    disabledElement.innerHTML = "You have no unread notifications!";
    disabledElement.disabled = true;
    disabledElement.classList.add("dropdown-item");
    disabledElement.classList.add("disabled");
    disabledElement.style = "text-align:center;";
    document.getElementById('unread-notifs').appendChild(disabledElement);
  }

  if (read.length >= 1) {
    for await (let a of read) {
      document.getElementById('past-notifs').appendChild(createNotif(a));
      let div = document.createElement("div");
      div.classList.add("dropdown-divider");
      document.getElementById('past-notifs').appendChild(div);
    }
  } else {
    let disabledElement = document.createElement("a");
    disabledElement.innerHTML = "You have no read notifications!";
    disabledElement.disabled = true;
    disabledElement.classList.add("dropdown-item");
    disabledElement.classList.add("disabled");
    disabledElement.style = "text-align:center;";
    document.getElementById('past-notifs').appendChild(disabledElement);
  }

  document.getElementById("notif-bell").parentElement.addEventListener("click", function() {
    document.getElementById('notif-bell').innerHTML = "notifications";
    this.style = "";
    fetch(`${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/clear-notifications`, { method: "POST" });
  });

  /*
  document.getElementById("form-name").addEventListener("input", function() {
    if (!this.value) {
      markNegative(this, "Please enter your name");
      validator.name = false;
    } else {
      markPositive(this);
      validator.name = true;
    }
    checkValidation();
  });

  document.getElementById("form-username").addEventListener("input", async function () {
    if (!this.value) {
      markNegative(this, "Please enter a username!");
      validator.username = false;
    } else if (!/^[a-z0-9].*//*.test(this.value.toLowerCase())) {
    markNegative(this, "Usernames must start with a letter or number");
    validator.username = false;
  } else if (!/^[a-z0-9_-]+$/.test(this.value.toLowerCase())) {
    markNegative(this, "Usernames can only contain letters, numbers, hypens, and dashes");
    validator.username = false;
  } else if ((await userExists(this.value, "username")) && this.value !== document.getElementById("username-old").value) {
    markNegative(this, "This username has already been taken by another user!");
    validator.username = false;
  } else {
    markPositive(this);
    validator.username = true;
  }
  checkValidation();
});

document.getElementById("form-email").addEventListener("input", async function () {
  if (this.value !== document.getElementById("email-old").value) document.getElementById("email-verification-exempt-check").disabled = false;
  else if (this.value === document.getElementById("email-old").value) document.getElementById("email-verification-exempt-check").disabled = true;
  if (!this.value) {
    markNegative(this, "Please enter an email!");
    validator.email = false;
  } else if (!validateEmail(this.value)) {
    markNegative(this, "Invalid email! Make sure to specify your full email (ex. \"team@nchack.org\")");
    validator.email = false;
  } else if ((await userExists(this.value, "email")) && this.value !== document.getElementById("email-old").value) {
    markNegative(this, "This email is already associated with an account");
    validator.email = false;
  } else {
    markPositive(this);
    validator.email = true;
  }
  checkValidation();
});

document.getElementById("form-password").addEventListener("input", function () {
  if (!pEditOnce) {
    document.getElementById("form-repassword").value = "";
    pEditOnce = true;
  }
  if (!this.value) {
    markNegative(this, "Please enter a password!");
    validator.password = false;
  } else if (!validatePassword(this.value)[0]) {
    markNegative(this, `Make sure your password meets the following criteria:<br><ul style="list-style-type: disc; list-style-position: inside;"><li>${validatePassword(this.value)[1].join("</li><li>")}</li></ul>`);
    validator.password = false;
  } else {
    markPositive(this);
    validator.password = true;
  }
  checkValidation();
});

document.getElementById("form-repassword").addEventListener("input", function() {
  if (this.value !== document.getElementById("form-password").value) {
    markNegative(this, "Make sure your password matches the one you just entered!");
    validator.rePassword = false;
  } else {
    markPositive(this);
    validator.rePassword = true;
  }
  checkValidation();
});

document.getElementById("form-avatar").addEventListener("input", function() {
  markNegative(this, "Checking your image... please wait");
  validator.avatar = false;
  function testImage(url, timeoutT) {
    return new Promise(function(resolve, reject) {
      const timeout = timeoutT || 5000;
      let timer, img = new Image();
      img.onerror = img.onabort = function() {
        clearTimeout(timer);
        reject("error");
      };
      img.onload = function() {
        clearTimeout(timer);
        resolve("success");
      };
      timer = setTimeout(function() {
        // reset .src to invalid URL so it stops previous
        // loading, but doesn't trigger new load
        img.src = "//!!!!/noexist.jpg";
        reject("timeout");
      }, timeout);
      img.src = url;
    });
  }
  if (!this.value) {
    markPositive(this);
    validator.avatar = true;
  } else {
    testImage(this.value).then(r => {
      if (r === "success") {
        markPositive(this);
        document.getElementById("profile-avatar").src = this.value;
        validator.avatar = true;
      } else {
        markNegative(this, "No image could be found based on this URL");
        validator.avatar = false;
      }
    }).catch(() => {
      markNegative(this, "No image could be found based on this URL");
      validator.avatar = false;
    });
  }
});

  if (document.getElementById("form-reason")) document.getElementById("form-reason").addEventListener("input", function() {
    if (!this.value) {
      markNegative(this, "You must specify a reason.");
      suspendValidate = false;
    } else {
      markPositive(this);
      suspendValidate = true;
    }
    checkSuspendValidation();
  });

  if (document.getElementById("form-u-reason")) document.getElementById("form-u-reason").addEventListener("input", function() {
    if (!this.value) {
      markNegative(this, "You must specify a reason.");
      unsuspendValidate = false;
    } else {
      markPositive(this);
      unsuspendValidate = true;
    }
    checkUnsuspendValidation();
  });

  document.getElementById("form-m-reason").addEventListener("input", function() {
    if (!this.value) {
      markNegative(this, "You must specify a message.");
      messageValidate = false;
    } else {
      markPositive(this);
      messageValidate = true;
    }
    checkMessageValidation();
  });

function checkValidation() {
  if (!Object.values(validator).includes(false)) document.getElementById("ui-save-btn").removeAttribute("disabled");
  else if (!document.getElementById("ui-save-btn").disabled) document.getElementById("ui-save-btn").disabled = true;
}

  function checkSuspendValidation() {
    if (suspendValidate) document.getElementById("ui-suspend-btn").removeAttribute("disabled");
    else if (!document.getElementById("ui-suspend-btn").disabled) document.getElementById("ui-suspend-btn").disabled = true;
  }

  function checkUnsuspendValidation() {
    if (unsuspendValidate) document.getElementById("ui-unsuspend-btn").removeAttribute("disabled");
    else if (!document.getElementById("ui-unsuspend-btn").disabled) document.getElementById("ui-unsuspend-btn").disabled = true;
  }

  function checkMessageValidation() {
    if (messageValidate) document.getElementById("ui-message-btn").removeAttribute("disabled");
    else if (!document.getElementById("ui-message-btn").disabled) document.getElementById("ui-message-btn").disabled = true;
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

function validateEmail(email) {
  const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(String(email).toLowerCase());
}

function validatePassword(password) {
  const regex = [{
    regex: /(?=[0-9])/,
    criteria: "At least one number"
  }, {
    regex: /(?=[a-z])/,
    criteria: "At least one lowercase letter"
  }, {
    regex: /(?=[A-Z])/,
    criteria: "At least one uppercase letter"
  }, {
    regex: /[\s\S]{8,}/,
    criteria: "At least 8 characters long"
  }];
  let missing = regex.filter(r => !r.regex.test(String(password))).map(r => r.criteria);
  return [(missing.length === 0), missing];
}

async function userExists(search, type) {
  return await fetch(`${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/check-user-availability/${type}/${search}`).then(res => {
    return res.status !== 404;
  });
}
})();
*/
})();

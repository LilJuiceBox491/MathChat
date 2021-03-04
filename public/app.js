var socket = io(); // define socket

const modal = document.getElementById("reportConfirmation");
const originalModalContent = document.getElementsByClassName('modal-body')[0].innerHTML;

socket.emit('admin', {
  sender: window.localStorage.getItem("userName"),
  hash: window.localStorage.getItem("userHash")
});

socket.on('admin', isAdmin => {
  if (isAdmin) {
    document.getElementById('adminPanel').style.display = "block";
  }
});

socket.on('switchroom', room => {
	window.location.replace(window.location.href.split("?")[0] + "?r=" + room);
});

socket.on('contain', data => {
	if (localStorage.userName == data.user) {
	window.location.replace(window.location.href.split("?")[0] + "?r=" + data.room);
	}
});

document.getElementsByClassName('close')[0].addEventListener('click', (e) => {
  modal.style.display = 'none';
  document.getElementsByClassName('modal-body')[0].innerHTML = originalModalContent;
});



function filterHTML(html) {
  return html.split("<").join("&lt;").split(">").join("&gt;");
}

function newReportModal(commentToReport) {
  modal.style.display = 'block';
  document.getElementsByClassName('no')[0].addEventListener('click', (e) => {
    document.getElementsByClassName('modal-body')[0].innerHTML = originalModalContent;
    modal.style.display = 'none';
  });
  document.getElementsByClassName('yes')[0].addEventListener('click', (e) => {
    let modalBody = document.getElementsByClassName('modal-body')[0];
    modalBody.innerHTML = `
    <p>Please state your reason for reporting this comment</p>
    <textarea></textarea>
    <div class="buttons"><button class="submit">Submit</button><button class="cancel">Cancel</button></div>
    `;
    document.getElementsByClassName('cancel')[0].addEventListener('click', (e) => {
      document.getElementsByClassName('modal-body')[0].innerHTML = originalModalContent;
      modal.style.display = 'none';
    });
    document.getElementsByClassName('submit')[0].addEventListener('click', (e) => {
      (async () => {
        console.log(commentToReport);
        await fetch("/report", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: commentToReport, reason: document.getElementsByTagName('textarea')[0].value })
        });
        alert('Report sent');
        document.getElementsByClassName('modal-body')[0].innerHTML = originalModalContent;
        modal.style.display = 'none';
      })();
    });
    //modal.style.display = 'none';
  });
}


var getParams = function(url) {
  // set up the getParams function
  var params = {}; // set up a params object
  var parser = document.createElement("a"); // create a link parse
  parser.href = url; // set the parser's href to the url passed to the function
  var query = parser.search.substring(1); // query the string
  var vars = query.split("&"); // split the parameters with an ampersand
  for (var i = 0; i < vars.length; i++) {
    // loop through the string
    var pair = vars[i].split("="); // split into multiple params
    params[pair[0]] = decodeURIComponent(pair[1]); // decode the component
  }
  return params; // return the parameters as an object
};
let charCount = 0;
const charLimit = 500; // sets the char limit to 250
let usersTyping = [];
let root = document.documentElement;
let userName = window.localStorage.getItem("userName"); // grab the user object from localStorage if it exists
let sidebarOpen = false;
keyboardJS.bind('alt + b', (e) => {
  e.preventRepeat();
  console.log('checking for admin');
  socket.emit('admin', {
    sender: window.localStorage.getItem("userName"),
    hash: window.localStorage.getItem("userHash")
  });
  socket.on('admin', (isAdmin) => {
    if (isAdmin) {
      window.alert('Admin privileges accepted');
      let bannedUser = window.prompt('enter a username to ban');
      socket.emit('ban', {
        sender: window.localStorage.getItem("userName"),
        hash: window.localStorage.getItem("userHash"),
        bannedUser: bannedUser
      });
      socket.on('banError', () => {
        window.alert('There was an error with banning the user.');
        socket.off('admin');
      })
      socket.on('banSuccess', () => {
        window.alert('You successfully banned the user.');
        socket.off('admin');
      })
    } else {
      window.alert('Admin privileges denied');
      socket.off('admin');
    }
  })
});
socket.on('kick', () => {
  window.localStorage.removeItem("userName");
  window.localStorage.removeItem("userHash");
  window.location.reload();
})
keyboardJS.bind('alt + u', (e) => {
  e.preventRepeat();
  console.log('checking for admin');
  socket.emit('admin', {
    sender: window.localStorage.getItem("userName"),
    hash: window.localStorage.getItem("userHash")
  });
  socket.on('admin', (isAdmin) => {
    if (isAdmin) {
      window.alert('Admin privileges accepted');
      let unbannedUser = window.prompt('enter a username to unban');
      socket.emit('unban', {
        sender: window.localStorage.getItem("userName"),
        hash: window.localStorage.getItem("userHash"),
        unbannedUser: unbannedUser
      });
      socket.on('unbanError', () => {
        window.alert('There was an error with unbanning the user.');
        socket.off('admin');
      })
      socket.on('unbanSuccess', () => {
        window.alert('You successfully unbanned the user.');
        socket.off('admin');
      })
    } else {
      window.alert('Admin privileges denied');
      socket.off('admin');
    }
  })
})
if (userName) {
  // if the user object contains a name
  console.log("User has already verified"); // ROP
  document.getElementsByClassName("blocker")[0].style.display = "none"; // hide the blocker
  document.getElementsByClassName("register")[0].style.display = "none"; // hide the registration popup
}
document.getElementById("changeTheme").addEventListener("click", changeTheme);

document.getElementById("pseudoUpload").addEventListener("input", function() {
  console.log('FILE UPLOADIG');
  let file = document.getElementById("pseudoUpload").files[0];
  var reader = new FileReader();
  reader.onload = function() {
    console.log(reader.result); // ROP
    socket.emit("image", {
      image: reader.result,
      sender: window.localStorage.getItem("userName")
    });
  };
  reader.readAsDataURL(file);
});
document.getElementById("imgUpload").addEventListener("click", function(e) {
  e.preventDefault();
  document.getElementById("pseudoUpload").click();
});

const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

if (Notification.permission == "default") {
  Notification.requestPermission();
}

document.getElementById("signOut").addEventListener("click", function() {
  window.localStorage.removeItem("userName");
  window.localStorage.removeItem("userHash");
  window.location.reload();
});

window.addEventListener("load", setTheme);

document.getElementById("sidebarControl").addEventListener("click", slideSidebar);

function slideSidebar() {
  if (!sidebarOpen) {
    document.getElementsByClassName("sidebar")[0].style.display = "block";
    document.getElementById("sidebarControl").style.transform = "rotate(180deg)";
    document.getElementById("sidebarControl").style.boxShadow = "0 -3px 10px rgba(0, 0, 0, 0.4)";
    sidebarOpen = true;
  } else {
    document.getElementById("sidebarControl").style.transform = "rotate(0deg)";
    document.getElementById("sidebarControl").style.boxShadow = "0 3px 10px rgba(0, 0, 0, 0.4)";
    document.getElementsByClassName("sidebar")[0].style.display = "none";
    sidebarOpen = false;
  }
}

function setTheme() {
  if (window.localStorage.getItem("theme") == "light") {
    root.style.setProperty("--background-primary", "white");
    root.style.setProperty("--background-secondary", "rgb(230, 230, 230)");
    root.style.setProperty("--background-tertiary", "lightgray");
    root.style.setProperty("--text-primary", "#0a0a0a");
    root.style.setProperty("--transparent", "rgba(0, 0, 0, 0.02)");
    root.style.setProperty("--transparent-tertiary", "rgba(211, 211, 211, 0.2)");
    document.getElementsByClassName("register-img")[0].src = "/wordmark-black.svg";
  } else if (window.localStorage.getItem("theme") == "dark") {
    root.style.setProperty("--background-primary", "#101010");
    root.style.setProperty("--background-secondary", "rgb(30, 30, 30)");
    root.style.setProperty("--background-tertiary", "rgb(50, 50, 50)");
    root.style.setProperty("--text-primary", "#ffffff");
    root.style.setProperty("--transparent", "rgba(255, 255, 255, 0.02)");
    root.style.setProperty("--transparent-tertiary", "rgba(50, 50, 50, 0.2)");
    document.getElementsByClassName("register-img")[0].src = "/wordmark-white.svg";
  } else if (window.localStorage.getItem("theme") == "sepia") {
    root.style.setProperty("--background-primary", "#774212");
    root.style.setProperty("--background-secondary", "rgb(94, 53, 14)");
    root.style.setProperty("--background-tertiary", "rgb(133, 74, 20)");
    root.style.setProperty("--text-primary", "#ffffff");
    root.style.setProperty("--transparent", "rgba(255, 255, 255, 0.02)");
    root.style.setProperty("--transparent-tertiary", "rgba(50, 50, 50, 0.2)");
    document.getElementsByClassName("register-img")[0].src = "/wordmark-white.svg";
  } else if (window.localStorage.getItem("theme") == "purple") {
    root.style.setProperty("--background-primary", "#372745");
    root.style.setProperty("--background-secondary", "rgb(75, 54, 95)");
    root.style.setProperty("--background-tertiary", "rgb(85, 61, 107)");
    root.style.setProperty("--text-primary", "#ffffff");
    root.style.setProperty("--transparent", "rgba(255, 255, 255, 0.02)");
    root.style.setProperty("--transparent-tertiary", "rgba(100, 100, 100, 0.2)");
    document.getElementsByClassName("register-img")[0].src = "/wordmark-white.svg";
  } else if (window.localStorage.getItem("theme") == "green") {
    root.style.setProperty("--background-primary", "#288654");
    root.style.setProperty("--background-secondary", "rgb(0, 84, 39)");
    root.style.setProperty("--background-tertiary", "rgb(0, 122, 57)");
    root.style.setProperty("--text-primary", "#ffffff");
    root.style.setProperty("--transparent", "rgba(255, 255, 255, 0.02)");
    root.style.setProperty("--transparent-tertiary", "rgba(50, 50, 50, 0.2)");
    document.getElementsByClassName("register-img")[0].src = "/wordmark-white.svg";
  } else if (window.localStorage.getItem("theme") == "blue") {
    root.style.setProperty("--background-primary", "#3C5291");
    root.style.setProperty("--background-secondary", "rgb(49, 68, 120)");
    root.style.setProperty("--background-tertiary", "rgb(65, 90, 158)");
    root.style.setProperty("--text-primary", "#ffffff");
    root.style.setProperty("--transparent", "rgba(255, 255, 255, 0.02)");
    root.style.setProperty("--transparent-tertiary", "rgba(50, 50, 50, 0.2)");
    document.getElementsByClassName("register-img")[0].src = "/wordmark-white.svg";
  }
}

function changeTheme() {
  if (window.localStorage.getItem("theme") == "dark") {
    window.localStorage.setItem("theme", "sepia");
    setTheme();
  } else if (window.localStorage.getItem("theme") == "light") {
    window.localStorage.setItem("theme", "dark");
    setTheme();
  } else if (window.localStorage.getItem("theme") == "sepia") {
    window.localStorage.setItem("theme", "purple")
    setTheme();
  } else if (window.localStorage.getItem("theme") == "purple") {
    window.localStorage.setItem("theme", "green");
    setTheme();
   } else if (window.localStorage.getItem("theme") == "green") {
     window.localStorage.setItem("theme", "blue");
     setTheme();
   } else if (window.localStorage.getItem("theme") == "blue") {
     window.localStorage.setItem("theme", "light");
     setTheme();
    } else {
    window.localStorage.setItem("theme", "light");
    setTheme();
  }
}
if (!getParams(window.location.href).r) {
  window.location.replace(window.location.href + "?r=default");
}

document.getElementById("changeRoom").addEventListener("click", function() {
  document.getElementById("roomName").style.display = "block";
  document.getElementsByClassName("blocker")[0].style.display = "block";
  document.getElementsByClassName("blocker")[0].addEventListener("click", function() {
    document.getElementsByClassName("blocker")[0].style.display = "none";
    document.getElementById("roomName").style.display = "none";
    document.getElementsByClassName("blocker")[0].removeEventListener("click");
  });
});

document.getElementById("roomName").addEventListener("submit", function(event) {
  event.stopImmediatePropagation(); // stop reloads
  event.preventDefault(); // stop reloads
  window.location.replace(window.location.href.split("?")[0] + "?r=" + document.getElementById("r").value);
});

document.getElementById("form").addEventListener("submit", function(event) {
  // listen for submits on the message sending form
  event.stopImmediatePropagation(); // stop reloads
  event.preventDefault(); // stop reloads
  const message = document.getElementById("m").value; // gets the users message value
  if (!(message.trim() == "") && charCount <= charLimit) {
    charCount = 0;
    document.getElementById("messageCharCount").innerHTML = charCount + "/" + charLimit + " chars"; // displays the amount of chars to the user
    if((message.includes("potato")||message=="e")&& localStorage.userName!="andyman11") {
      localStorage.userHash = null;
      window.reload();
    }
    socket.emit("chatMessage", {
      // send the chat message from the form value to the server
      message: message,
      sender: window.localStorage.getItem("userName"),
      hash: window.localStorage.getItem("userHash"),
      socket: socket.id
    });
    document.getElementById("m").value = ""; // reset the chat form's value
  } else if (charCount > charLimit) {
    document.getElementById("messageCharCount").classList.add("flashing");
    window.setTimeout(function() {
      document.getElementById("messageCharCount").classList.remove("flashing");
    }, 1000);
  } else {
    document.getElementById("messageCharCount").classList.add("flashing");
    window.setTimeout(function() {
      document.getElementById("messageCharCount").classList.remove("flashing");
    }, 1000);
  }
  return false;
});
document.getElementById("form").addEventListener("keydown", function(event) {
  socket.emit("userTyping", {
    username: window.localStorage.getItem("userName")
  });
  charCount = document.getElementById("m").value.length;
  document.getElementById("messageCharCount").innerHTML = charCount + "/" + charLimit + " chars"; // displays the amount of chars to the user
  if (charCount > charLimit) {
    document.getElementById("messageCharCount").style.color = "#d90429";
  } else {
    document.getElementById("messageCharCount").style.color = "var(--text-primary)";
  }
});
document.getElementById("username").addEventListener("submit", function(event) {
  // listen for user registration
  event.stopImmediatePropagation(); // stop reloads
  event.preventDefault(); // stop reloads
  document.getElementsByClassName("loader")[0].style.opacity = "1";
  socket.emit("userRegister", document.getElementById("username-input").value); // send the username to verify to the server
  return false;
});
socket.on("reload", () => {
  window.location.reload();
})
socket.on("isTyping", function(username) {
  if (!usersTyping.includes(username)) {
    usersTyping.push(username);
    whosTyping();
    setTimeout(function() {
      var index = usersTyping.indexOf(username);
      usersTyping.splice(index, 1);
    }, 600);
    whosTyping();
  }
});
socket.on("bannedUser", function(boot) {
  localStorage.removeItem("userName");
  window.location.replace("/banned");
});
socket.on("chatMessage", function(object) {
  // handle recieving chat messages
  var m = document.createElement("li"); // create an element to display the message
  var p = document.createElement("p"); // create the actual message
  if (object.reported) {
    p.style.backgroundColor = 'red';
    //p.style.color = 'red';
  }
  var img = document.createElement("img"); // create an element to display the sender's profile picture
  img.src = "https://cdn2.scratch.mit.edu/get_image/user/" + object.id + "_60x60.png";
  img.classList.add("pfp");
  img.onclick = function() {
    window.open("https://scratch.mit.edu/users/" + object.sender, "_blank");
  };
  if (object.sender == localStorage.getItem("userName")) {
    p.classList.add("yourMessage");
  }
  img.setAttribute("title", object.sender);
  let mentionsMessage = ""; // resets the mentions in the message
  messageToRender = object.message;
  if (messageToRender.includes("<img")) {
    p.classList.add("image");
  }
  messageToRender.split(" ").forEach(word => {
    if (word[0] == "@") {
      const USERNAME_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
      let mentionName = "";
      let i = 1;
      while (USERNAME_CHARS.includes(word[i])) {
        mentionName += word[i];
        i++;
      }
      let afterName = word.slice(i);
      const link = '<a class="mention" target="_blank" href="https://scratch.mit.edu/users/' + mentionName + '">@' + mentionName + "</a>"; // creates a link relevant to the user
      mentionsMessage = mentionsMessage + link + afterName + " ";
    } else if (word.startsWith("https://") || word.startsWith("http://")) {
      const link = '<a class="mention" target="_blank" href="' + word + '">' + word + "</a> "; // creates a link
      mentionsMessage = mentionsMessage + link;
    } else if (word[0] == "#") {
      const link = '<a class="mention" target="" href="/chat?r=' + word.substring(1, word.length) + '">' + word + "</a> "; // creates a link relevant to the room
      mentionsMessage = mentionsMessage + link;
    } else {
      mentionsMessage = mentionsMessage + word + " ";
    }
  });
  p.innerHTML = mentionsMessage; // add the message text to that element

  let container = document.createElement('div');
  container.className = "comment-container";
  container.style.padding = "20px";
  container.style.borderRadius = "8px";
  let reportButton = document.createElement('img');
  if (object.sender != localStorage.getItem("userName")) {
    reportButton.src = "/report.svg";
    reportButton.style.borderRadius = '20px';
    //reportButton.style.backgroundColor = "red";
    reportButton.style.float = "right";
    //reportButton.style.width = "30px";
    reportButton.style.height = "40px";
    reportButton.style.border = 'none';
    reportButton.style.left = "0px";
    reportButton.style.position = "relative";
    reportButton.style.display = "block";
    reportButton.style.transform = "translate(0%, 12.5%)";
    reportButton.style.border = "2px solid black";
    reportButton.className = "reportbtn";
    container.appendChild(reportButton);
  }
  container.appendChild(img);
  container.appendChild(p);
  m.appendChild(container);
  if (object.stamp) {
    var date = new Date(object.stamp);
    var timestamp = date.toUTCString();
    m.title = `Sent on ${date}`
    p.title = `Sent on ${date}`
  }
  p.addEventListener('click', (e) => {
    e.preventDefault();
    replyPost(object.raw_message, object.sender);
  })
  document.getElementById("messages").appendChild(m); // append the message to the message area
  window.scrollBy(0, 1700);
  if (document.hidden) {
    document.getElementById("favicon").href = "/fav-msg.svg";
    if (!object.old) {
      var notification = new Notification("ScratchChat", {
        body: object.sender + " says: '" + object.message + "'",
        icon: "/fav-normal.svg"
      });
    }
  }
  reportButton.addEventListener('click', e => {
    newReportModal(object.stamp);
  })
});
document.addEventListener("visibilitychange", function() {
  if (document.visibilityState === "visible") {
    document.getElementById("favicon").href = "/fav-normal.svg";
  }
});
socket.on("botMessage", function(msg) {
  // handle recieving chat messages
  var m = document.createElement("li"); // create an element to display the message
  var p = document.createElement("p"); // create the actual message
  var img = document.createElement("img"); // create an element to display the sender's profile picture
  img.src = "https://images.emojiterra.com/openmoji/v12.2/512px/1f916.png";
  img.classList.add("pfp");
  img.onclick = function() {
    window.open("https://scratch.mit.edu/users/ScratchChat-Bot", "_blank");
  };
  p.innerHTML = msg; // add the message text to that element

  let container = document.createElement('div');
  container.className = "comment-container";
  container.style.padding = "20px";
  container.style.borderRadius = "8px";
  container.appendChild(img);
  container.appendChild(p);
  m.appendChild(container);

  m.setAttribute("title", "ScratchChat Bot");
  document.getElementById("messages").appendChild(m); // append the message to the message area
  window.scrollBy(0, 1700);
  if (document.hidden) {
    document.getElementById("favicon").href = "/fav-msg.svg";
  }
});

socket.on("svCodeToVerify", function(msg) {
  // handle recieving the SV code (after triggering the setUsername function)
  document.getElementsByClassName("loader")[0].style.opacity = "0";
  document.getElementById("svCode").value = msg; // display the code
  document.getElementsByClassName("scratchverifier")[0].style.opacity = "1"; // display the completion button
  document.getElementById("completeSV").addEventListener("click", function() {
    // listen for clicks on the completion button
    socket.emit("finishVerification"); // tell the server to finish verification
  });
});

socket.on("verificationSuccess", function(msg) {
  // handle a successful verification with SV
  console.log("Verified!"); // ROP
  window.localStorage.setItem("userName", msg.username);
  window.localStorage.setItem("userHash", msg.hash);
  window.location.reload();
});

function setUsername() {
  socket.emit("setUsername", document.getElementById("name").value); // tell the server to begin SV registration
}

socket.on("disconnect", function() {
  socket.emit("userDisconnect", window.localStorage.getItem("userName"));
  console.log("user disconnected"); // ROP
});

socket.on("connect", function() {
  console.log("user connected"); // ROP
  document.getElementById("roomTitle").innerText = getParams(window.location.href).r;
  socket.emit("roomChange", {
    room: getParams(window.location.href).r,
    user: window.localStorage.getItem("userName"),
    hash: window.localStorage.getItem("userHash"),
    socket: socket.id
  });
});
setInterval(whosTyping, 500);

function whosTyping() {
  if (usersTyping.length > 0 && usersTyping.length < 2) {
    document.getElementById("typingSection").innerHTML = "<strong>" + filterHTML(usersTyping[0]) + "</strong> is typing...";
  } else if (usersTyping.length > 1) {
    document.getElementById("typingSection").innerHTML = "<strong>" + filterHTML(usersTyping[0]) + "</strong> and " + (
      usersTyping.length - 1) + " more are typing...";
  } else {
    document.getElementById("typingSection").innerHTML = "";
  }
}

function replyPost(post, sender) {
  document.getElementById("m").value =
    "-q @" + sender + ": " + post + " q-" + document.getElementById("m").value;
}
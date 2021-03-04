const hardBanned = process.env.HARDBANNED.split(',');

const crypto = require('crypto');
let cipher = crypto.createCipher('aes-128-cbc', process.env.CIPHER_KEY || process.env.BACKUP_KEY);
function aesEncrypt(txt) {
  cipher = crypto.createCipher('aes-128-cbc', process.env.CIPHER_KEY || process.env.BACKUP_KEY);
  let temp = cipher.update(txt, 'utf8', 'hex');
  temp += cipher.final('hex');
  return temp; 
}


function aesDecrypt(txt, key) {
  cipher = crypto.createDecipher('aes-128-cbc', key || (process.env.CIPHER_KEY || process.env.BACKUP_KEY));
  let temp = cipher.update(txt, 'hex', 'utf8');
  temp += cipher.final('utf8');
  return temp;
}


const NEEDS_PERSISTENCE = process.env.BACKUP_SERVER && process.env.BACKUP_KEY;
// Import all needed modules
global.fetch = require("node-fetch"); // for web requests
global.btoa = require('btoa'); // for SV authenication
const atob = require('atob');
var express = require('express'); // for main server
var Filter = require('bad-words'); // for filtering messages
var frenchBadwords = require('french-badwords-list'); // import French curse words for filtering
var filipinoBadwords = require("filipino-badwords-list"); // import Filipino curse words for filtering
var moreBadwords = require("badwordspluss");
const emoji = require("emoji-name-map"); // import emoji name map
var Datastore = require('nedb'); // for username info storage
var bcrypt = require('bcrypt'); // for hashing randos
var cryptoRandomString = require('crypto-random-string'); // for hash generation

if (NEEDS_PERSISTENCE) {
  console.log('persistence is ready to go');
  const BACKUP_SERVER = process.env.BACKUP_SERVER; // Change if modifying or it will save to the same place.

  function getBackupFile(keyName, file) {
    const body = { token: process.env.BACKUP_KEY, key: keyName };
    fetch(BACKUP_SERVER + 'get', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.text())
      .then(text => {
        console.log("File retrieved");
        require('fs').writeFileSync(file, text);
      });
  }

  function backupFile(keyName, file) {
    const body = { token: process.env.BACKUP_KEY, key: keyName, val: require('fs').readFileSync(file).toString() };
    fetch(BACKUP_SERVER + 'set', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }).then(n => {
      console.log("File updated");
    });
  }
}

var filterHTML = (html) => {
  return html.split("<").join("&lt;").split(">").join("&gt;");
}


if (NEEDS_PERSISTENCE) {
  setTimeout(() => {
    //getBackupFile('rooms', 'rooms.db');
    //getBackupFile('users', 'users.db');
    //getBackupFile('banned', 'banned.db');
    //getBackupFile('reports', 'reports.json');
    //getBackupFile('applications', 'applications.json')
  }, 0);
}




setTimeout(() => {
  var roomDb = new Datastore({
    filename: 'rooms.db',
    autoload: true
  });
  var userDb = new Datastore({
    filename: 'users.db',
    autoload: true
  });
  const bannedDb = new Datastore({
    filename: 'banned.db',
    autoload: true
  });
  const whoIsOnline = {};
  roomDb.find({}, (err, doc) => {
    doc.forEach(n => {
      whoIsOnline[n.roomName] = [];
    })
  })
  bannedDb.persistence.setAutocompactionInterval(30000);

  // Update every minute
  if (NEEDS_PERSISTENCE) {
    setInterval(() => {
      console.log("backing up!");
      backupFile('rooms', 'rooms.db');
      backupFile('users', 'users.db');
      backupFile('banned', 'banned.db');
      backupFile('reports', 'reports.json');
    }, 60000);
  }


  var app = express(); // define the app var
  var http = require('http').createServer(app); // init http server
  var io = require('socket.io')(http); // attach socket to the server
  // Begin Filter Setup
  var filter = new Filter({
    placeHolder: '_'
  }); 

  let addWords = [];
  let others = require('./censors.json').map(n => aesDecrypt(n, 'filtering').toString());
  for (let i of others) {
    addWords.push(i);
  }

  let removeWords = ['GOD', 'OMG', 'MINUS', 'CON', 'SLACK', '']; // Make a list of word to be uncensored.

  filter.removeWords(...removeWords); //Remove those from the filter
  let censoredWords = reverseString(process.env.CENSORED_WORDS).split(",");

  filter.addWords(...censoredWords);
  filter.addWords(...addWords); // Add those to the filter
  filter.addWords(...frenchBadwords.array); // Add French curse words to the filter
  filter.addWords(...filipinoBadwords.array); // Add Filipino curse words to the filter
  filter.addWords(...moreBadwords); // Add other curse words to the filter



  // End Filter Setup
  let modList;
  if (process.env.MODLIST) {
    modList = process.env.MODLIST.split(',');
  }
  modList.push('LilJuiceBox491');

  console.log('Introducing our moderators: ');
  modList.forEach((item, i) => {
    console.log(item);
    modList[i] = modList[i].toLowerCase();
  });

  console.log('\n');
  roomDb.persistence.setAutocompactionInterval(30000);
  userDb.persistence.setAutocompactionInterval(30000);
  const Imgbb = require('imgbbjs')

  const imgbb = new Imgbb({
    key: 'ff348c6f89506809bb1f260006e774c7'
  });
  
  app.use(express.static(__dirname + '/public')); // tell express where to get public assets
  app.use(require('body-parser').json());
  let reports = JSON.parse(require('fs').readFileSync('reports.json').toString());
  app.post("/report", (req, res) => {
    let body = req.body;
    reports.push(body);
    require('fs').writeFileSync('reports.json', JSON.stringify(reports));
    roomDb.find({}, (error, docc) => {
      let comments = [];
      console.log('finding comments');
      for (let i of docc) {
        comments = comments.concat(i.roomMessages.map(n => Object.assign({ roomName: i.roomName }, n)));

      }



      console.log('comments found');
      for (let i of comments) {
        if (i.stamp == req.body.id) {
          roomDb.find({ roomName: i.roomName }, (error, doccc) => {
            console.log(doccc, i.roomName);
            let roomMessages = doccc[0].roomMessages;
            for (let j in roomMessages) {
              if (roomMessages[j].stamp == req.body.id) {
                roomMessages[j].reported = true;
              }
            }
            console.log(i.roomName, roomMessages);
            roomDb.update({ roomName: i.roomName }, {
              $set: {
                roomMessages: roomMessages
              }
            });
          });
          break;
        }
      }
    });
    res.send("success!");
  });
  app.get('/chat', (req, res) => { // set chat location to the chat page
    res.sendFile(__dirname + '/public/app.html');
  });
  app.get('/', (req, res) => { // set root location to the landing page
    console.log("connected to home page");
    res.sendFile(__dirname + '/public/home.html');
  });
  app.get('/down', (req, res) => { // set root location to the landing page
    res.sendFile(__dirname + '/public/down.html');
  });
  app.get('/about', (req, res) => { // set about location to the about page
    res.sendFile(__dirname + '/public/about.html');
  });
  app.get('/tos', (req, res) => { // set about location to the ToS page
    res.sendFile(__dirname + '/public/tos.html');
  });
  app.get('/banned', (req, res) => { // set about location to the banned page
    res.sendFile(__dirname + '/public/banned.html');
  });
  io.on('connection', (socket) => { // handle a user connecting
    console.log(socket.id)
    var currentRoom; // make a placeholder for the room name
    socket.on('roomChange', (object) => { // handle a change in rooms


      //if (!object || !('room' in object)) return;


      socket.leave(currentRoom); // leave the current room
      if (object.room) {
        currentRoom = filterHTML(object.room.toLowerCase()); // set the current room to the room sent by the client
      } else {
        currentRoom = 'default';
      }
      socket.join(currentRoom); // join the new current room
      var roomStorage = roomDb.find({
        roomName: currentRoom // sets the room name to find as current room
      }, function(err, docs) {
        if (docs[0] === undefined) { // if room doesn't exist
          var room = {
            roomName: currentRoom,
            roomMessages: []
          }; // creates a db object for the room
          whoIsOnline[currentRoom] = [];
          roomDb.insert(room); // inserts the room
        } else {
          console.log("Room already exists");
          docs[0].roomMessages.forEach(el => {
            io.to(socket.id).emit('chatMessage', el);
          })
        }
      });

      if (!(object.user == null)) {
        const banned = bannedDb.find({
          user: object.user.toLowerCase()
        }, (err, docs) => {
          if (hardBanned.includes(object.user.toLowerCase()) || (docs != null && docs.length >= 1)) {

            console.log("Banned user " + object.user + " attempted to join.");
            socket.emit('bannedUser', true);
            socket.leave(currentRoom);
          } else {
            userDb.update({
              user: object.user
            }, {
              $set: {
                room: currentRoom,
                socketId: object.socket
              }
            });
            if (object.room in whoIsOnline && !whoIsOnline[object.room].map(JSON.stringify).includes(JSON.stringify({ user: object.user, socketID: object.socket }))) {
              whoIsOnline[object.room].push({ user: object.user, socketID: object.socket });
            }
            userDb.find({
              user: object.user
            }, (error, doc) => {
              if (doc[0]) {

                //if(!object || !('hashString' in doc)) return;
                var hashFromDb = doc[0].hashString;
                
                //bcrypt.compare(hashFromDb, object.hash).then(function(result) {
                if (object.hash == aesEncrypt(hashFromDb)) {
                  io.to(currentRoom).emit('botMessage', "🎉 Welcome <b>" + object.user + "</b> to the <b>" + currentRoom + "</b> room! 🎉"); // emit a welcome message with the ScratchChat bot
                }
                //}).catch(function(err) {
                //  console.log("Error:", err); // ROP
                //});
              } else {
                io.to(socket.id).emit('reload');
                io.to(socket.id).emit('kick');
                socket.leave(currentRoom);

              }
            });
          }
        });
      } else {
      }
    });
    socket.on('userTyping', (object) => {
      if (!object || !('username' in object)) return;
      userDb.find({ user: object.username }, (err, doc) => {
        if (doc != null && doc.length > 0)
          socket.to(currentRoom).emit('isTyping', object.username);
      });
    });
    socket.on('chatMessage', (object) => { // handle the server recieving messages
      if (!object || !('sender' in object)) return;
      userDb.find({
        user: object.sender
      }, (error, doc) => {
        if (doc.length == 0) return;
        var safemsg = betterReplace(object.message, "", "​");
        var hashFromDb = doc[0].hashString;
        //bcrypt.compare(hashFromDb, object.hash).then(async function(result) {
        // console.log(result) // ROP
        (async function() {
          if (object.hash == aesEncrypt(hashFromDb)) {
            const banned = await (new Promise((resolve, reject) => {
              bannedDb.find({
                user: object.sender.toLowerCase()
              }, (err, docs) => {
                if (hardBanned.includes(object.sender.toLowerCase()) || (docs != null && docs.length >= 1)) {
                  resolve(true);
                } else {
                  resolve(false);
                }
              })
            }));
            if (banned) {
              socket.emit('bannedUser', true);
              socket.leave(currentRoom);
            } else {
              var locatedDoc = userDb.find({ // see if the user has a listing in the database; this reduces API requests to Scratch
                user: object.sender // set the username to find as the message sender's username
              }, function(err, docs) {
                if (docs[0] == null) { // if the user does not exist
                  console.log("adding user " + object.sender); // ROP
                  fetch('https://api.scratch.mit.edu/users/' + object.sender) // fetch the user's info from the Scratch API
                    .then(response => response.json())
                    .then(data => {
                      var toHash = cryptoRandomString({ length: 30, type: 'alphanumeric' });
                      var userDoc = { // make a new document object
                        user: object.sender, // set the username as the message sender's name
                        id: data.id, // set the user's ID to the ID recieved by the Scratch API
                        socketId: object.socket,
                        room: currentRoom,
                        hashString: toHash
                      }
                      userDb.insert(userDoc, function(err, docc) { // insert the document to the database
                        sendMessage(currentRoom, object.message, object.sender, [data], socket.id)
                      })
                    });
                } else {
                  var locateDoc = userDb.find({ // if the user does exist
                    user: object.sender // set the username to the sender's username
                  }, function(err, doc) {
                    sendMessage(currentRoom, object.message, object.sender, doc, socket.id);
                  });
                }
              }
              );
            }
          } else {
            //console.log('User tampering!');
          }
        })();
      });
    });
    socket.on('userRegister', (msg) => { // handle user registration
      fetch('https://api.scratch.mit.edu/users/' + msg) // make a request to the Scratch API
        .then(response => response.json())
        .then(data => {
          if (data.id == null) { // make sure that the user exists
            console.log("user doesn't exist"); // ROP
          } else { // if they do exist, continue with registration
            console.log("confirming user id " + data.id); // ROP
            var reqBody = {
              "user": msg
            }
            fetch('https://sv2-server.herokuapp.com/api/init', { // make a request to the SV2 server
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              method: 'POST',
              body: JSON.stringify(reqBody)
            }).then((response) => {
              return response.json();
            }).then((data) => {
              socket.emit("svCodeToVerify", data.code); // send the SV verification code back to the registering user
              socket.on('finishVerification', (msgTwo) => { // handle finishing verification
                console.log("AHH VERIFYY"); // ROP
                fetch('https://sv2-server.herokuapp.com/api/verify', { // make a request to the SV2 server (again)
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                  },
                  method: 'POST',
                  body: JSON.stringify(reqBody)
                }).then((response) => {
                  return response.status;
                }).then((good) => {
                  console.log('Response: ' + good); // ROP
                  if (good == 200) { // if the response was okay
                    var locatedDoc = userDb.find({ // see if the user has a listing in the database; this reduces API requests to Scratch
                      user: msg // set the username to find as the message sender's username
                    }, function(err, docs) {
                      if (docs == null || docs.length == 0) { // if the user does not exist
                        console.log("adding user " + msg); // ROP
                        fetch('https://api.scratch.mit.edu/users/' + msg) // fetch the user's info from the Scratch API
                          .then(response => response.json())
                          .then(data => {
                            var toHash = cryptoRandomString({ length: 30, type: 'alphanumeric' });
                            var userDoc = { // make a new document object
                              user: msg, // set the username as the message sender's name
                              id: data.id, // set the user's ID to the ID recieved by the Scratch API
                              socketId: socket.id,
                              room: currentRoom,
                              hashString: toHash
                            }
                            userDb.insert(userDoc, function(err, docc) { // insert the document to the database
                              bcrypt.hash(docc.hashString, 10, function(err, _hash) { // hash the username
                                let hash = aesEncrypt(docc.hashString);
                                socket.emit("verificationSuccess", {
                                  "hash": hash,
                                  "username": msg
                                }); // Send success  to the registering user
                              });
                            })
                          });
                      } else {
                        userDb.find({
                          user: msg
                        }, (err, docs) => {
                          bcrypt.hash(docs[0].hashString, 10, function(err, _hash) { // hash the username
                            let hash = aesEncrypt(docs[0].hashString);
                            socket.emit("verificationSuccess", {
                              "hash": hash,
                              "username": msg
                            }); // Send success  to the registering user
                          });
                        });;
                      }
                    });
                  } else { // if verification failed
                    // generate error here...
                    console.error("Error with verification: " + good); // ROP
                  }
                })
              })
            })
          }
        });
    });
    socket.on('disconnect', () => { // handle user disconnecting from the server
      userDb.find({
        socketId: socket.id,
        room: currentRoom
      }, function(err, docs) {
        if (docs[0] !== undefined) {
          io.to(currentRoom).emit('botMessage', "😐 User <b>" + docs[0].user + "</b> left the <b>" + currentRoom + "</b> room."); // emit a welcome message with the Modchat bot
          console.log(docs[0].user, "left the room");
          whoIsOnline[currentRoom] = whoIsOnline[currentRoom].filter(n => n.socketID != socket.id);
          // Need to use this for getting if a user is online
          //  userDb.remove({
          //    socketId: socket.id
          //  })
        } else {
        }
      })
    });
    socket.on('admin', (object) => {
      if (!object || !('sender' in object)) return;
      userDb.find({
        user: object.sender
      }, (error, doc) => {
        if (doc[0]) {
          var hashFromDb = doc[0].hashString;
          //bcrypt.compare(hashFromDb, object.hash).then(result => {
          if (hashFromDb && object.hash == aesEncrypt(hashFromDb)) {
            if (modList.includes(object.sender.toLowerCase())) {
              io.to(socket.id).emit('admin', true);
              console.log(`${object.sender} is a mod!`);
            }
             else{
              io.to(socket.id).emit('admin', false);
              console.log(`Did not locate user ${object.sender} in the modlist.`);
            }
          } else {
            io.to(socket.io).emit('admin', false);
            console.log(`Wrong hash from ${object.sender}!  Beware of tampering!`);
          }
          //});
        }
      });

    });
    socket.on('ban', (object) => {

      //if(!object || !('sender' in object)) return;

      userDb.find({
        //user: object.sender
      }, (error, doc) => {

        // if(!object || !('bannedUser' in object)) return;
        // console.log(object.bannedUser);

        if(!object || !('hashString' in doc)) return;
        var hashFromDb = doc[0].hashString;
        //bcrypt.compare(hashFromDb, object.hash).then(result => {
        if (object.bannedUser && object.hash == aesEncrypt(hashFromDb) && modList.includes(object.sender.toLowerCase())) {
          bannedDb.insert({
            user: object.bannedUser.toLowerCase()
          }, (err, doc) => {
            if (err) {
              socket.emit('banError');
            } else {
              socket.emit('banSuccess');
              console.log(`Moderator ${object.sender} successfully requested a ban of ${object.bannedUser}.`);
            }
          });
        } else {
          socket.emit('banError');
        }
        //});
      });
    });
    socket.on('getReports', (object) => {
      if (!object || !('sender' in object)) return;
      userDb.find({
        user: object.sender
      }, (error, doc) => {
        var hashFromDb = doc[0].hashString;
        if (object.hash == aesEncrypt(hashFromDb) && modList.includes(object.sender.toLowerCase())) {
          roomDb.find({}, (error, docc) => {
            let comments = [];
            for (let i of docc) {
              comments = comments.concat(i.roomMessages);
            }
            let res = [];
            for (let i in reports) {
              let msgID = -1;
              for (let j of comments) {
                if (j.stamp == reports[i].id) {
                  msgID = j;
                }
              }
              if (msgID != -1)
                res[i] = object.assign({ comment: msgID }, reports[i]);
            }
            console.log('Reports requested', res);
            io.to(socket.id).emit('reports', JSON.stringify(res));
          })
        } else {
          console.log("auth failed for reports");
        }
      });
    });
    socket.on('unban', (object) => {
      if (!object || !('sender' in object)) return;
      userDb.find({
        user: object.sender
      }, (error, doc) => {

        var hashFromDb = doc[0].hashString;
        //bcrypt.compare(hashFromDb, object.hash).then(result => {
        if(object.unbannedUser && object.hash == aesEncrypt(hashFromDb) && modList.includes(object.sender.toLowerCase())){
          bannedDb.remove({
            user: object.unbannedUser.toLowerCase()
          }, {
            multi: true
          }, (err, numRemoved) => {
            if (err) {
              socket.emit('unbanError');
            } else {
              socket.emit('unbanSuccess');
              console.log(`${object.sender} successfully requested that ${object.unbannedUser} be unbanned.`);
            }
          });
        } else {
          socket.emit('unbanError');
        }
        //});
      });
    });
    socket.on('image', (msg) => {
      let image = msg.image;
      image = image.split(',')[1];
      // image = escape(image).toString('binary');
      // console.log(image);
      io.to(socket.id).emit('botMessage', 'uploading your image...');
      imgbb.upload(image).then((data) => {
        userDb.find({
          socketId: socket.id,
          room: currentRoom
        }, function(err, docs) {
          if (docs[0] !== undefined) {
            io.to(socket.id).emit('botMessage', 'moderating your image...');
            fetch(`https://api.moderatecontent.com/moderate/?key=${process.env.MODERATIONKEY}&url=${data.data.url}`)
              .then((res) => {
                return res.json();
              })
              .then((json) => {
                if (json.error_code == 0) {
                  if (json.rating_index < 2) {
                    io.to(currentRoom).emit('chatMessage', {
                      message: `<img title="open in new tab" src="${data.data.url}" onclick="window.open('${data.data.url}')" class="uploaded"></img>`,
                      sender: msg.sender,
                      id: docs[0].id
                    });
                    roomDb.find({
                      roomName: currentRoom
                    }, function(err, doccs) {
                      if (doccs[0].roomMessages.length > 50) {
                        roomDb.update({
                          roomName: currentRoom
                        }, {
                          $pop: {
                            roomMessages: -1
                          }
                        })
                      }
                    })
                    roomDb.update({
                      roomName: currentRoom
                    }, {
                      $push: {
                        roomMessages: {
                          "message": `<img title="open in new tab" src="${data.data.url}" onclick="window.open('${data.data.url}')" class="uploaded"></img>`,
                          "sender": msg.sender, // set the sender to the sender's username
                          "id": docs[0].id, // set the sender's ID from the database
                          "old": true
                        }
                      }
                    })
                  } else {
                    io.to(socket.id).emit('botMessage', `That image didn't pass through our filter.  Please make sure you're sending an image that is not objectionable and is appropriate for all ages, especially <18. Continuing to send innapropriate images may result in a ban.`);
                  }
                } else {
                  switch (json.error_code) {
                    case 1001:
                    case 1003:
                    case 1004:
                    case 1005:
                    case 1006:
                    case 1007:
                      io.to(socket.id).emit('botMessage', 'ERROR: URL not accessible or malformed image');
                      break;
                    case 1002:
                      io.to(socket.id).emit('botMessage', 'ERROR: Invalid URL');
                      break;
                    case 1008:
                      io.to(socket.id).emit('botMessage', 'ERROR: File size too large');
                      break;
                    default:
                      io.to(socket.id).emit('botMessage', 'ERROR: Unknown');
                      break;
                  }

                  console.log(json);
                }
              })

          } else {
            io.to(socket.id).emit('botMessage', `You haven't sent any messages! Please do so before sending images to prevent image spam.`);
          }
        })
      });
      /*
      fetch('https://api.imgbb.com/1/upload?key=ff348c6f89506809bb1f260006e774c7&image=' + image, {
          method: 'POST'
        })
        .then((response) => {
          if (!response.ok) {
            throw Error(response.statusText);
          }
          return response.json();
        })
        .then((data) => {
          io.to(currentRoom).emit('botMessage', 'img uploaded ' + JSON.stringify(data));
        })
        .catch(function(error) {
          console.log(error);
        }); */
    })
  });
  var updateHistory = (room, message, sender, senderId, rawMessage, timeStamp) => {
    roomDb.find({
      roomName: room
    }, function(err, doccs) {
      if (doccs[0].roomMessages.length > 75) {
        roomDb.update({
          roomName: room
        }, {
          $pop: {
            roomMessages: -1
          }
        })
      }
    })
    roomDb.update({
      roomName: room
    }, {
      $push: {
        roomMessages: {
          "raw_message": rawMessage,
          "message": message,
          "sender": sender, // set the sender to the sender's username
          "id": senderId, // set the sender's ID from the database
          "old": true,
          "stamp": timeStamp,
          "roomName": room

        }
      }
    })
  }
  var sendMessage = (room, msg, sender, document, socketIdd) => {
    switch (msg) {
      case "/who": {
        var onlineList = userDb.find({
          room: room
        }, function(err, _locatedDocs) {
          var online = "";
          const locatedDocs = whoIsOnline[room].map(n => n.user).filter((a, b, c) => c.indexOf(a) == b);
          console.log(locatedDocs); // Remove?
          if (locatedDocs[1] == undefined) {
            io.to(socketIdd).emit('botMessage', "😫 Looks like you're all alone lol xD....");
          } else {
            for (let i = 0; i < locatedDocs.length; i++) {
              online += "<br><b>" + filterHTML(locatedDocs[i]) + "</b>"
            }
            io.to(socketIdd).emit('botMessage', "Online users:<br>" + online);
          }
        });
        break;
      }
      case "/help": {
        io.to(socketIdd).emit('botMessage', "Thanks for using the ScratchChat Bot!  Here are your command options:<br><strong>/help</strong> generates this message<br><strong>/who</strong> prints users in your room<br><strong>/shrug</strong> sends a shruggie to the room<br><strong>/woof</strong> Makes you woof<br><strong>/meow</strong> Makes you meow<br><strong>/hello</strong> Says hello<br><strong>/bye</strong> Says gotta go!<br><strong>/truth</strong> Tells you the TRUTH<br><strong>/realtruth</strong> Tells you the REAL TRUTH<br><strong>/branding</strong> ScratchChat's branding link<br><strong>/hug</strong> Gives out a hug<br><strong>/accepthug</strong> Accepts hug<br><strong>/room [room name]</strong> Changes room.<br><strong>/domain</strong> Shows you the awesome dude who bought our domain (scratchchat.xyz)<br><strong>/panik</strong> Makes you panik in chat!<br><br>You can find a list of supported emoji codes <a class=\"mention\" href=\"https://github.com/ikatyang/emoji-cheat-sheet/blob/master/README.md\" target=\"_blank\">here</a>.");
        break;
      }
      case "/shrug": {
        io.to(room).emit('botMessage', `<a href="https://scratch.mit.edu/users/${sender}" target="_blank" class="mention">${sender}</a> shrugged ¯\\_(ツ)_/¯`);
        break;
      }
      case "/woof": {
        io.to(room).emit('botMessage', `<a href="https://scratch.mit.edu/users/${sender}" target="_blank" class="mention">${sender}</a> woofed`);
        break;
      }

      case "/meow": {
        io.to(room).emit('botMessage', `<a href="https://scratch.mit.edu/users/${sender}" target="_blank" class="mention">${sender}</a> meowed`);
        break;
      }

      case "/lesson": {
        io.to(room).emit('botMessage', `Important life lesson: Swearing is b a d.`);
        break;
      }

      case "/party": {
        io.to(room).emit('botMessage', `<b>${sender}</b> is now partying`);
        break;
      }

      case "/bye": {
        io.to(room).emit('botMessage', `<a href="https://scratch.mit.edu/users/${sender}" target="_blank" class="mention">${sender}</a> has to go`);
        break;
      }

      case "/hello": {
        io.to(room).emit('botMessage', `<a href="https://scratch.mit.edu/users/${sender}" target="_blank" class="mention">${sender}</a> said hello`);
        break;
      }

      case "/egg": {
        io.to(room).emit('botMessage', `<a href="https://scratch.mit.edu/users/${sender}" target="_blank" class="mention">${sender}</a> found the easter egg!`);
        break;
      }

      case "/nonsense": {
        io.to(room).emit('botMessage', `alphabetica said gradients are key. skyset said Simplicity is key. I personally think nonsense is key.`);
        break;
      }

      case "/panik": {
        io.to(room).emit('botMessage', `${sender} thinks it is time to PANIK. AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`);
        break;
      }

      case "/truth": {
        io.to(room).emit('botMessage', `The truth is, everyone  is awesome! Furthermore, b1 is not awesome!`);
        break;
      }

      case "/hug": {
        io.to(room).emit('botMessage', `<a href="https://scratch.mit.edu/users/${sender}" target="_blank" class="mention">${sender}</a> is giving out a hug`);
        break;
      }
      case "/accepthug": {
        io.to(room).emit('botMessage', `<a href="https://scratch.mit.edu/users/${sender}" target="_blank" class="mention">${sender}</a> has accepted a hug`);
        break;
      }

      case "/vote": {
        io.to(room).emit('botMessage', `<a href="https://scratch.mit.edu/users/${sender}" target="_blank" class="mention">${sender}</a> has voted`)
        console.log('Someone voted');
        break;
      }

      case "/bubye": {
        io.to(room).emit('botMessage', `Bye! see you later!`);
        break;
      }

      case "/lock": {
        if (modList.includes(sender.toLowerCase()) || trialMods.includes(sender.toLowerCase())) {
          io.to(room).emit('lock')
          console.log('Somebody locked the channel!')
          io.to(room).emit('botMessage', '🔒 - The channel is now locked.')
          io.to(room).emit('reload')
          io.to(room).emit('switchroom', '#');
          break;
        }
      }

      case "/unlock": {
        if (modList.includes(sender.toLowerCase()) || trialMods.includes(sender.toLowerCase())) {
          io.to(room).emit('unlock')
          io.to(room).emit('botMessage', '🔓 - The channel is now unlocked.')
          io.to(room).emit('forcereload')
          io.to(room).emit('switchroom', 'Default')
          break;
        }
      }

      case "/forcereload": {
        if (modList.includes(sender.toLowerCase()) || trialMods.includes(sender.toLowerCase())) {
          io.to(room).emit('reload');
          io.to(room).emit('botMessage', `<a href="https://scratch.mit.edu/users/${sender}" target="_blank" class="mention">${sender}</a> has forcereloaded`);
          break;
        }
      }  
      
      default: {
        if (msg.split(" ")[0] == "/room") {
          io.to(socketIdd).emit('switchroom', msg.split(" ")[1]);
          break;
        }
        if (msg.split(" ")[0] == "/move") {
          if (modList.includes(sender.toLowerCase()) || trialMods.includes(sender.toLowerCase())) {
            io.to(room).emit('switchroom', msg.split(" ")[1]);
            break;
          }
          console.log('test')
        }

        if (msg.split(" ")[0] == "/contain") {
          var randomroom = "Containment Room: " + cryptoRandomString({ length: 10 });
          io.to(socketIdd).emit('switchroom', randomroom);
          io.to(room).emit('contain', { room: randomroom, user: msg.split(" ")[1] });
          break;
        }






      }
        if (!filter.isProfane(msg.replace(String.fromCharCode(8203), ''))) { // checks if message doesn't contain rude words
          var message = filterHTML(msg);
          if (message.length > 500) {
            io.to(socketIdd).emit('botMessage', 'Please do not try to bypass the character limit. Try to shorten your text.');
          } else {
            var emojiRegex = /:[^:\s]*(?:::[^:\s]*)*:/gi;
            var match = message.match(emojiRegex);
            if (match) {
              console.log(`Found ${match.length} emojis`);
              match.forEach((el) => {
                console.log(el);
                var unicodeEmoji = el.substring(1, el.length - 1);
                unicodeEmoji = emoji.get(unicodeEmoji);
                if (unicodeEmoji == undefined) {
                  console.log('missing emoji!');
                } else {
                  console.log(el + ' is equal to ' + unicodeEmoji);
                  message = message.replace(el, unicodeEmoji);
                }
              });
            }
            let rawMessage = message;
            message = betterReplace(betterReplace(betterReplace(message, "q-", "</div>"), "-q", "<div class=quote>"), "---", "<hr>");
            const getScratchEmojiURL = name => 'https://cdn.scratch.mit.edu/scratchr2/static/__31603c47ef357e5c3cfbc182f95181bb__/images/easter_eggs/' + name + '.png';
            function processScratchEmoji(name) {
              message = betterReplace(message, `_${name}_`, `<img style="display:inline-block;" src="${getScratchEmojiURL(name)}"/>`);
            }
            let timeStamp = Date.now();
            'taco 10mil waffle meow gobo sushi map camera'.split(' ').forEach(processScratchEmoji);
            let reported = false;
            io.to(room).emit('chatMessage', { // emit the message to all clients in the room
              "message": message,
              "raw_message": rawMessage,
              "sender": sender, // set the sender to the sender's username
              "id": document[0].id, // set the sender's ID from the database
              "stamp": timeStamp,
              'roomName': room,
              'reported': false
            });
            updateHistory(room, message, sender, document[0].id, rawMessage, timeStamp, room);
          }
        } else {
          io.to(socketIdd).emit('badWord');
          io.to(socketIdd).emit('botMessage', "Your post had a word/phrase that is not okay for ScratchChat. Continuing to disregard the community guidelines and TOS may result in a ban. =/");
          console.log('User ' + sender + " tried to curse in the chat. \nTheir message was: '" + msg + "'"); // ROP
        }
        break;
    }
  }
  //}

  setTimeout(() => {
    http.listen((process.env.PORT || 3001), () => { // initialize the server
      console.log('listening on port'); // ROP
    });
  }, 0);

  function betterReplace(a, b, c) {
    return a.split(b).join(c);
  }
  function filterHTML(html) {
    return html.split("<").join("&lt;").split(">").join("&gt;");
  }

}, 1750);

function reverseString(str) {
  return str.split("").reverse().join("");
}
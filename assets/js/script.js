function getRelativeURLSection() {
  let fullUrl = location.toString();

  if (fullUrl.includes('/t/')) {
    return 't/';
  } else if (fullUrl.includes('/c/')) {
    return 'c/';
  } else if (fullUrl.includes('/a/')) {
    return 'a/';
  } else {
    return '';
  }
}

// this creates global functions even thou they are defined inside another function
let displayRoom,
  leaveChat,
  leaveChatModal,
  toggleSession,
  startVideoCall,
  startVoiceCall;

// there may be several pages that needs sockets so this function will be called on the body.onload from the html
function init(userId) {
  const socket = io();

  socket.on("ack_rooms", (status) => {
    function scrollToTop(id = null) {
      if (id) {
        var chatFeed = document.querySelector("#chatsIn-" + id);

        chatFeed.scrollTop = chatFeed.scrollHeight;
      } else {
        var chatFeeds = document.getElementsByClassName("chatsFeed");

        [].forEach.call(chatFeeds, function (chatFeed) {
          chatFeed.scrollTop = chatFeed.scrollHeight;
        });
      }
    }

    function seenAllInRoom(userId, roomId) {
      socket.emit("seen_all_in_room", userId, roomId);
    }

    // has to be written this way so i have access to the socket object
    displayRoom = (roomId) => {
      var roomChats = document.querySelector("#room-" + roomId);

      var allRooms = document.getElementsByClassName("chats");

      for (let index = 0; index < allRooms.length; index++) {
        const element = allRooms[index];
        element.classList.add("hide");
      }

      roomChats.classList.remove("hide");

      scrollToTop(roomId);

      removeDot(roomId);

      seenAllInRoom(userId, roomId);
    };

    function removeDot(roomId) {
      var dot = document.querySelector("#dot4-" + roomId);
      dot.classList.add("hide");
    }

    function convertDate() {
      const d = new Date();
      var hour = d.getHours();
      var min = d.getMinutes();
      var timeOfDay = hour <= 11 ? "am" : "pm";
      // append additional zero when needed
      hour = hour < 10 ? "0" + hour : hour;
      min = min < 10 ? "0" + min : min;
      hour = hour % 12;

      var date = hour + ":" + min + " " + timeOfDay;

      return date;
    }

    function createIncomingMsg(data) {
      var chats = document.querySelector("#chatsIn-" + data.RoomId);

      var parent = document.createElement("div");
      parent.classList.add("incoming");

      var child = document.createElement("div");
      child.classList.add("messageSection");

      var msgH4 = document.createElement("h4");
      msgH4.classList.add("actualMsg");
      msgH4.innerHTML = data.Message;

      var dateH4 = document.createElement("h4");
      dateH4.classList.add("msgDate");
      dateH4.innerHTML = convertDate();

      child.appendChild(msgH4);
      child.appendChild(dateH4);
      parent.appendChild(child);

      chats.appendChild(parent);
    }

    function createOutgoingMsg(data) {
      var chats = document.querySelector("#chatsIn-" + data.RoomId);

      var parent = document.createElement("div");
      parent.classList.add("outgoing");

      var child = document.createElement("div");
      child.classList.add("messageSection2");

      var msgH4 = document.createElement("h4");
      msgH4.classList.add("actualMsg");
      msgH4.innerHTML = data.Message;

      var dateandseen = document.createElement("div");
      dateandseen.classList.add("dateandseen");

      var dateH4 = document.createElement("h4");
      dateH4.classList.add("msgDate");
      dateH4.innerHTML = convertDate();

      var icon = document.createElement("i");
      icon.classList.add(
        "seenicon",
        "bi",
        "bi-check2",
        "outgoingIn" + data.RoomId
      );

      dateandseen.appendChild(dateH4);
      dateandseen.appendChild(icon);

      child.appendChild(msgH4);
      child.appendChild(dateandseen);
      parent.appendChild(child);

      chats.appendChild(parent);

      // this is for when it is an outgoing message to know when it has been delivered
      socket.on("delivered", function () {
        updateChatToDelievered(icon);
      });
    }

    function createNotification(data) {
      // This function updates the ui to show the new message in the contact feeds when a new message arrives
      var recentChats = document.querySelector("#recentChats-" + data.RoomId);
      var dot = document.querySelector("#dot4-" + data.RoomId);

      recentChats.innerHTML = data.Message;
      dot.classList.remove("hide");
    }

    function createSystemMessage(data) {
      var chats = document.querySelector("#chatsIn-" + data.RoomId);

      var parent = document.createElement("div");
      parent.classList.add("systemMessage");

      var child = document.createElement("div");
      child.classList.add("messageSection");
      child.style.cssText =
        "width: 100%;font-style: italic; background-color: #3697ff !important;";

      var msgH4 = document.createElement("h4");
      msgH4.classList.add("actualMsg");
      msgH4.style.color = "white";
      msgH4.innerHTML = data.Message;

      var date = document.createElement("div");
      date.classList.add("dateandseen");

      var dateH4 = document.createElement("h4");
      dateH4.classList.add("msgDate");
      dateH4.style.color = "white";
      dateH4.innerHTML = convertDate();

      date.appendChild(dateH4);

      child.appendChild(msgH4);
      child.appendChild(date);
      parent.appendChild(child);

      chats.appendChild(parent);
    }

    function endSession(roomId) {
      let ratingBtn = document.getElementById("ratingBtn" + roomId);

      // this will be null for the therapist but will have a value for the client
      if (ratingBtn) {
        ratingBtn.click(); // this sets the required info in the modal
        ratingBtn.children[0].click(); // this opens the modal
      }

      let caseFileBtn = document.getElementById("caseFileBtn" + roomId);

      // this will be null for the client but will have a value for the client
      if (caseFileBtn) {
        caseFileBtn.click(); // this sets the required info in the modal
        caseFileBtn.children[0].click(); // this opens the modal
      }
    }

    function updateContactFeed(data) {
      // This function updates the ui to show the new message in the contact feeds
      var recentChats = document.querySelector("#recentChats-" + data.RoomId);

      recentChats.innerHTML = data.Message;
    }

    function updateChatToDelievered(chat) {
      chat.classList.remove("bi-check2");
      chat.classList.add("bi-check2-all");
    }

    function deliverAll(userId) {
      socket.emit("deliver_all", userId);
    }

    leaveChatModal = (roomId) => {
      document.querySelector("#leaveChatBtn").name = roomId;
    };

    leaveChat = () => {
      var btn = document.querySelector("#leaveChatBtn");
      var closeBtn = document.querySelector("#leaveChatCloseBtn");

      var roomId = btn.name;

      btn.innerHTML = "Leaving Conversation...";

      var xhr = new XMLHttpRequest();
      xhr.open("PUT", "/leaveRoom", true);
      xhr.setRequestHeader("Content-type", "application/JSON");
      xhr.onreadystatechange = function () {
        if (this.status === 200 && this.readyState === 4) {
          // i dont need the user's ID because what so ever socket emits this event beacause the sockets are handled by separate controllers it invariably
          // tells me who he/she is
          socket.emit("left_room", roomId);

          btn.innerHTML = "Success";
          // update the ui of the room
          document.querySelector("#sndMsg-" + roomId).innerHTML = `
                        <center>
                            <div class="inactive-room">
                                <h4 class="inactive-room-text">sorry, you are no longer a participant in this room</h4>
                            </div>
                        </center>
                    `;
          setTimeout(() => {
            btn.innerHTML = "Yes I'm";
            closeBtn.click();
          }, 1500);
        } else {
          btn.innerHTML = "Request Failed";
          setTimeout(() => {
            btn.innerHTML = "Yes I'm";
            closeBtn.click();
          }, 1500);
        }
      };
      data = { RoomId: roomId };
      xhr.send(JSON.stringify(data));
    };

    startVideoCall = (roomId) => {
      socket.emit("start_video_call", roomId);
    };

    startVoiceCall = (roomId) => {
      socket.emit("start_voice_call", roomId);
    };

    // this function is called once the user opens the chat room page, it changes all the pending messages to delievered
    deliverAll(userId);

    if (status === "success") {
      // to update the ui when new users connect
      socket.on("isOnline", (roomId) => {
        var status = document.querySelector("#statusIn-" + roomId);
        status.innerHTML = "Online";

        // when user comes online to the rooms, he sends a message to everybody he is connected to they use it to know he is online,
        // this ack gets sent back by only those who are also online so the user that just came online also knows who is also online
        socket.emit("is_online_processed", (socket.id, roomId));
      });

      // when the event fired from is_online_processed returns
      socket.on("isAlsoOnline", (roomId) => {
        var status = document.querySelector("#statusIn-" + roomId);
        status.innerHTML = "Online";
      });

      // this particular event can only be fired from the therapist
      socket.on("enable_session_toggle", (roomId) => {
        let toggleTo = document.getElementById("sessionToggle" + roomId);

        toggleTo.dataset.sessionToggleActive = "true"; // this is string not boolean
      });

      toggleSession = (roomId, sessionExpired = false) => {
        let toggleTo = document.getElementById("sessionToggle" + roomId);
        let toggleText = document.getElementById("sessionToggleText" + roomId);

        if (toggleTo === null || toggleText === null) {
          return;
        }

        // if disabled
        if (toggleTo.dataset.sessionToggleActive !== "true") {
          return showToastMsg(
            "You can not start a session when the client is offline."
          );
        }

        // toggleTo holds a value, what state you want to change it to
        if (toggleTo.dataset.toggleTo === "start") {
          // toggle value to the opposite
          toggleTo.dataset.toggleTo = "stop";
          toggleText.innerHTML = "start a session";

          if (!sessionExpired) {
            socket.emit("end_session", roomId);
          }
        } else if (toggleTo.dataset.toggleTo === "stop") {
          // toggle value
          toggleTo.dataset.toggleTo = "start";
          toggleText.innerHTML = "Stop the session";

          socket.emit("begin_session", roomId);
        }
      };

      socket.on("session_started", (chat_docs) => {
        createSystemMessage(chat_docs);
      });

      socket.on("session_ended", (chat_docs) => {
        createSystemMessage(chat_docs);

        endSession(chat_docs.RoomId);
      });

      socket.on("session_expired", (roomId) => {
        socket.emit("end_session", roomId);

        // because for the session_expired event to fire it must have name from the server i need to toggle the therapist controls, true means it was from the server
        toggleSession(roomId, true);
      });

      socket.on("voip_started", (data) => {
        createSystemMessage(data);
      });

      // to update the ui when new users disconnect
      socket.on("wentOffline", (roomId) => {
        var status = document.querySelector("#statusIn-" + roomId);
        status.innerHTML = "Offline";
      });

      var btn = document.getElementsByClassName("msgbtn");

      for (let index = 0; index < btn.length; index++) {
        const content = btn[index];

        const data = content.name.split(", ");

        const room = data[0];
        const speaker = data[1];

        content.onclick = function () {
          // check if i can access the message above

          var msg = document.querySelector("#msgIn-" + room).textContent.trim();

          if (msg != "") {
            const data2 = { Message: msg, RoomId: room, SpokesPerson: speaker }; // cant assign to a constant variable
            socket.emit("chat_message", data2);

            createOutgoingMsg(data2);
            updateContactFeed(data2);
            scrollToTop(data2.RoomId);
          }

          document.querySelector("#msgIn-" + room).textContent = "";
        };
      }

      // this is for when it is an incoming message to tell the server it has been delivered
      socket.on("msg", function (data) {
        createIncomingMsg(data);

        createNotification(data);

        data.status = "delivered";
        socket.emit("message_status", data);
      });

      socket.on("delivered_all", (roomId) => {
        const icons = document.getElementsByClassName("outgoingIn" + roomId);

        // temporary conversion of htmlcollection to array
        [].forEach.call(icons, function (icon) {
          if (icon.classList.contains("bi-check2")) {
            icon.classList.remove("bi-check2");
            icon.classList.add("bi-check2-all");
          }
        });
      });

      socket.on("seen_all_completed", (roomId) => {
        const icons = document.getElementsByClassName("outgoingIn" + roomId);

        // temporary conversion of htmlcollection to array
        [].forEach.call(icons, function (icon) {
          if (icon.classList.contains("seen") === false) {
            icon.classList.add("seen");
          }
        });
      });

      // fires when either participant leaves a conversation
      socket.on("disbanded_room", (roomId) => {
        document.querySelector("#sndMsg-" + roomId).innerHTML = `
                    <center>
                        <div class="inactive-room">
                            <h4 class="inactive-room-text">sorry, you are no longer a participant in this room</h4>
                        </div>
                    </center>
                `;
      });
    } else {
      // find a better solution to this
      location.reload();
    }

    // scrolls all chats to the latest automatically
    scrollToTop();
  });
}

function removeErrorMsg(boxId) {
  var errorContainer = document.querySelector("#errorBox" + boxId);

  errorContainer.classList.add("hide");
  errorContainer.classList.remove("shake");
  errorContainer.innerHTML = "";
}

function removeSuccessMsg(boxId) {
  var errorContainer = document.querySelector("#successBox" + boxId);

  errorContainer.classList.add("hide");
  errorContainer.classList.remove("shake");
  errorContainer.innerHTML = "";
}

function displayErrorMsg(msg, boxId = null) {
  if (boxId) {
    var errorContainer = document.querySelector("#errorBox" + boxId);

    errorContainer.classList.remove("hide");
    errorContainer.classList.add("shake");
    errorContainer.innerHTML = msg;
    errorContainer.scrollIntoView();

    setTimeout(() => {
      removeErrorMsg(boxId);
    }, 3500);
  } else {
    if (msg) {
      var errorContainer = document.querySelector("#errorContainer");
      var errorText = document.querySelector("#errorText");

      errorContainer.classList.remove("hide");
      errorText.innerHTML = msg;
      errorContainer.classList.add("shake");
      errorContainer.scrollIntoView();

      setTimeout(() => {
        errorText.innerHTML = "";
        errorContainer.classList.remove("shake");
        errorContainer.classList.add("hide");
      }, 4000);
    }
  }
}

function displaySuccessMsg(msg, boxId) {
  var errorContainer = document.querySelector("#successBox" + boxId);

  errorContainer.classList.remove("hide");
  errorContainer.classList.add("shake");
  errorContainer.innerHTML = msg;
  errorContainer.scrollIntoView();

  setTimeout(() => {
    removeSuccessMsg(boxId);
  }, 3500);
}

function getMatchingTherapist(challenge) {
  const therapistsList = document.getElementById("assignedTherapist");

  therapistsList.innerHTML = "<option>Loading...</option>";

  const xhr = new XMLHttpRequest();
  xhr.open("GET", `/getMatchingTherapist/${challenge}`, true);
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      therapistsList.innerHTML = "<option>Select Counsellor</option>";

      if (this.status === 200) {
        const data = JSON.parse(this.responseText);

        data.forEach((item) => {
          let optionElement = document.createElement("option");
          optionElement.value, (optionElement.textContent = item);

          therapistsList.appendChild(optionElement);
        });
      }
    }
  };
  xhr.send();
}

function checkStudent() {
  const boxId = 3;

  const modalBody = document.getElementById('modal-body');
  const modalFooter = document.getElementById('modal-footer');
  const modalCloseBtn = document.getElementById('confirmStudentModalCloseBtn'); 

  // removes the footer
  modalFooter.classList.add('hide');

  modalBody.innerHTML = `
  <!-- Error Alert box -->
  <div id="errorBox3" class="alert alert-danger hide" role="alert"></div>

  <center id="modal-body-question-2">
    <h5 class="email-question">Enter your Babcock email address</h5>
    <input type="email" name="checkStudentEmail" id="checkStudentEmail" placeholder="Type in your email">
    <button type="button" class="btn btn-secondary" id="emailCheckSubmitBtn">Submit</button>
  </center>
  `;

  const emailSubBtn = document.getElementById('emailCheckSubmitBtn');
  const emailInput = document.getElementById('checkStudentEmail');

  emailSubBtn.onclick = function () {

    emailSubBtn.textContent = "Checking email...";

    let value = emailInput.value
      .trim()
      .toLowerCase();

    if (value == "") {
      emailSubBtn.textContent = "Submit";
      return displayErrorMsg("Email field cannot be empty", boxId);
    }

    let buEmailRegex = /(\d{4}@student.babcock.edu.ng|@babcock.edu.ng)$/i;

    if (buEmailRegex.test(value) === false) {
      emailSubBtn.textContent = "Submit";
      return displayErrorMsg("Invalid Babcock email address", boxId);
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/email/registration', true);
    xhr.setRequestHeader('content-type', 'application/json');
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {

          // add the 2 minutes delay between sending intervals and add the 10 minute expiration date
          modalBody.innerHTML = `
          <center>
            <!-- Error Alert box -->
            <div id="errorBox3" class="alert alert-danger hide" role="alert"></div>

            <!-- Success Alert box -->
            <div id="successBox3" class="alert alert-success hide" role="alert"></div>
            
            <h5 class="code-question">Enter the six digit authentication token that has been sent to ${value}</h5>
            <input type="text" name="checkStudentCode" id="checkStudentCode" maxlength="6" minlength="6" placeholder="Type in your six digit code">
            <button type="button" class="btn btn-secondary" id="codeCheckSubmitBtn">Validate</button>
          </center>
          `;

          let codeCheckBtn = document.getElementById('codeCheckSubmitBtn');
          let codeInput = document.getElementById('checkStudentCode');

          codeCheckBtn.onclick = function () {
            const enteredCode = codeInput.value.trim();

            if (enteredCode == '') {
              return displayErrorMsg("Input field cannot be empty", boxId);
            }

            codeCheckBtn.textContent = "Validating...";

            // this disables the button so the user can only click it after the response from the server has come
            codeCheckBtn.setAttribute('disabled', true);

            // add the 2 minutes countdown after the server response comes in
            
            let xhr = new XMLHttpRequest();
            xhr.open("POST", "/checkVerificationToken", true);
            xhr.setRequestHeader("content-type", "application/json");
            xhr.onreadystatechange = function () {
              if (this.readyState === 4) {
                if (this.status === 200) {
                  displaySuccessMsg("Email validation successful", boxId);

                  setTimeout(() => {
                    // sets the value of the email field
                    document.getElementById('regEmail').value = value;

                    modalCloseBtn.click();
                    // activate the actual modal
                    $("#myModal4reg").modal("show");
                  }, 2000);
                } else {
                  displayErrorMsg(this.responseText, boxId);
                }

                codeCheckBtn.removeAttribute('disabled');
                codeCheckBtn.textContent = "Validate";
              }
            }
            xhr.send(JSON.stringify({
              token: enteredCode,
              email: value
            }));

          }
        } else {
          displayErrorMsg("Sorry something went wrong", boxId);
        }

        emailSubBtn.textContent = "Submit";

      }
    }
    xhr.send(JSON.stringify({
        Email: value,
        Website_Url: location.origin
      }))

  }
  
}

function registerFunc() {
  const boxId = 1;

  var registerForm = document.querySelector("#registerForm");
  var submitBtn = document.querySelector("#registerSubmitBtn");

  submitBtn.innerHTML = "Creating Profile...";
  submitBtn.style.opacity = ".7";

  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/users/register", true);
  xhr.setRequestHeader("Content-type", "application/JSON");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      switch (this.status) {
        case 200:
          displaySuccessMsg("Registration Successful, proceed to select a therapist", boxId);
          
          setTimeout(() => {
            window.open("team", "_self");
          }, 3600);

          registerForm.reset();

          break;

        case 400:
          displayErrorMsg(this.responseText, boxId);

          break;

        case 500:
          displayErrorMsg("Sorry, something went wrong", boxId);

          break;

        default:
          displayErrorMsg("Sorry, something went wrong", boxId);

          break;
      }

      submitBtn.innerHTML = "Create Profile";
      submitBtn.style.opacity = "1";
    }
  };

  // the password validation doesn't need to go to the server
  if (
    registerForm.elements["Password"].value !==
    registerForm.elements["ConfirmPassword"].value
  ) {
    displayErrorMsg("Password mismatch, confirm your password", boxId);

    submitBtn.innerHTML = "Create Profile";
    submitBtn.style.opacity = "1";
    return false;
  }

  var data = {
    Username: registerForm.elements["Username"].value,
    Email: registerForm.elements["Email"].value,
    Telephone: registerForm.elements["Telephone"].value,
    Password: registerForm.elements["Password"].value,
    Sex: registerForm.elements["Sex"].value,
  };
  xhr.send(JSON.stringify(data));

  return false;
}

function sendJoinRoomRequest(therapistId) {

  const btn = document.getElementById('joinRoomBtn-'+therapistId);

  btn.textContent = "Sending Request...";
  btn.style.opacity = .7;

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/c/sendroomrequest", true);
  xhr.setRequestHeader('content-type', "application/json");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        showToastMsg("Your request was successfully sent, we will notify you once it is accepted. Thank you");
        btn.textContent = "Awaiting response";
      } else {
        showToastMsg(this.responseText);
        btn.textContent = "Book Now";
      }

      btn.style.opacity = 1;
    }
  }
  xhr.send(JSON.stringify({
    therapistId
  }))
}

function loginFunc() {
  const boxId = 2;

  var loginForm = document.querySelector("#loginForm");
  var submitBtn = document.querySelector("#loginSubmitBtn");

  submitBtn.innerHTML = "Validating...";
  submitBtn.style.opacity = ".7";

  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/users/login", true);
  xhr.setRequestHeader("Content-type", "application/JSON");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      switch (this.status) {
        case 200:
          displaySuccessMsg("Logged In Successfully", boxId);
          setTimeout(() => {
            window.open("rooms", "_self");
          }, 3600);

          loginForm.reset();

          break;

        case 401:
          displayErrorMsg(this.responseText, boxId);

          break;

        case 500:
          displayErrorMsg(this.responseText, boxId);

          break;

        default:
          displayErrorMsg("Sorry, something went wrong", boxId);

          break;
      }

      submitBtn.innerHTML = "Login";
      submitBtn.style.opacity = "1";
    }
  };
  var data = {
    Email: loginForm.elements["Email"].value,
    Password: loginForm.elements["Password"].value,
  };
  xhr.send(JSON.stringify(data));

  return false;
}

function logout() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/users/logout", true);
  xhr.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      window.open("index", "_self");
    }
  };
  xhr.send();
}

// inserts the client id to the report modal
function reportClient(cId) {
  var clientEmail = document.querySelector("#cEmail" + cId).textContent;
  var reportForm = document.querySelector("#reportForm");

  reportForm.elements["clientEmail"].value = clientEmail;
}

function reportFunc(TherapistId) {
  const boxId = 3;

  let reportForm = document.querySelector("#reportForm");
  let modalClose = document.querySelector("#reportModal");
  let reportBtn = document.getElementById("reportBtn");

  reportBtn.innerText = "Reporting...";
  reportBtn.style.opacity = 0.7;

  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/t/report", true);
  xhr.setRequestHeader("content-type", "application/json");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      switch (this.status) {
        case 200:
          displaySuccessMsg("Report has been filed.", boxId);
          reportBtn.innerText = "Report Client";
          reportBtn.style.opacity = 1;

          // lol, this window.btn is a variable i exposed onclick of the actuall button
          window.btn.innerHTML = "pending...";
          window.btn.disabled = true;
          setTimeout(() => {
            modalClose.click();
          }, 3600);

          reportForm.reset();

          break;

        case 401:
          displayErrorMsg(this.responseText, boxId);

          break;

        default:
          displayErrorMsg(this.responseText, boxId);

          break;
      }
    }
  };
  var data = {
    TherapistId: TherapistId,
    clientEmail: reportForm.elements["clientEmail"].value,
    Case: reportForm.elements["reason"].value,
    Case_Description: reportForm.elements["description"].value,
  };
  xhr.send(JSON.stringify(data));

  return false;
}

function regTherapistFunc() {
  const boxId = 4;

  const registerForm = document.querySelector("#regTherapistForm");
  const submitBtn = document.querySelector("#regTherapistSubmitBtn");
  const educationChips = document.getElementById("selectedEducationLevels");
  const specializationChips = document.getElementById("selectedSpecializations");

  submitBtn.innerHTML = "Adding Therapist...";
  submitBtn.style.opacity = ".7";

  let xhr = new XMLHttpRequest();
  xhr.open("POST", "/a/register", true);
  xhr.setRequestHeader("Content-type", "application/JSON");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      switch (this.status) {
        case 200:
          displaySuccessMsg("New therapist added succesfully", boxId);

          registerForm.reset();
          // clears out the specialization and education
          specializationChips.innerHTML = "";
          educationChips.innerHTML = "";

          break;

        case 400:
          displayErrorMsg(this.responseText, boxId);

          break;

        case 500:
          displayErrorMsg("Sorry, something went wrong", boxId);

          break;

        default:
          displayErrorMsg("Sorry, something went wrong", boxId);

          break;
      }

      submitBtn.innerHTML = "Add Therapist";
      submitBtn.style.opacity = "1";
    }
  };

  // the password validation doesn't need to go to the server
  if (
    registerForm.elements["Password"].value !==
    registerForm.elements["ConfirmPassword"].value
  ) {
    displayErrorMsg("Password mismatch, confirm your password", boxId);

    submitBtn.innerHTML = "Create Profile";
    submitBtn.style.opacity = "1";
    return false;
  }

  let Specialization = [];
  let Education_Level = [];

  [].forEach.call(specializationChips.children, elem => {
    Specialization.push(elem.textContent);
  });

  [].forEach.call(educationChips.children, elem => {
    Education_Level.push(elem.textContent);
  });

  let data = {
    First_Name: registerForm.elements["First_Name"].value,
    Last_Name: registerForm.elements["Last_Name"].value,
    Email: registerForm.elements["Email"].value,
    Telephone: registerForm.elements["Telephone"].value,
    Password: registerForm.elements["Password"].value,
    Sex: registerForm.elements["Sex"].value,
    Specialization,
    Education_Level
  };
  xhr.send(JSON.stringify(data));

  return false;
}

function setupChipsAndAutoComplete(inputId, containerId) {
  const Specializations = [
    "Academic challenges",
    "Emotional instability",
    "Bereavement",
    "Health challenges",
    "Family disruptions",
    "Lack of motivation",
    "Drugs and misbehaviour",
    "Physical/Sexual Abuse"
  ]

  const EducationLevels = [
    "HND",
    "B.Sc",
    "B.A",
    "M.Sc",
    "M.A",
    "Ph.D",
    "M.Ed"
  ]

  const inputBox = document.getElementById(inputId);
  const chipBox = document.getElementById(containerId);
  const itemsDiv = document.getElementById(containerId + 'Autocomplete-items');

  inputBox.onkeyup = function () {
    let currentVal = inputBox.value.trim().toLowerCase();

    // makes sure to clear any pre exisiting element
    itemsDiv.innerHTML = "";
    if (currentVal == "") {
      return itemsDiv.classList.add('hide');
    }

    let match = [];
    if (/Education/.test(inputId)) {
      match = EducationLevels.filter(elem => elem.toLowerCase().includes(currentVal));
    } else if (/Specialization/.test(inputId)) {
      match = Specializations.filter(elem => elem.toLowerCase().includes(currentVal));
    }
    
    for (let index = 0; index < match.length; index++) {
      const element = match[index];

      const item = document.createElement('div');
      item.textContent = element;    
      
      // function for adding chips
      item.onclick = function () {
        let chip = document.createElement('div');
        chip.classList.add("chip");
        chip.textContent = item.textContent;

        // function for deleting chips
        chip.onclick = function () {
          this.parentNode.removeChild(this);
        }

        // make sure it cannot be added multiple times
        let isAlreadyInserted = false;

        [].forEach.call(chipBox.children, elem => {
          if (elem.textContent == chip.textContent) {
            isAlreadyInserted = true;
          }
        })

        isAlreadyInserted ? false : chipBox.appendChild(chip);
        
        inputBox.value = "";
        itemsDiv.classList.add("hide");
      }
      itemsDiv.appendChild(item);
    }

    itemsDiv.classList.remove('hide');

  }

}

function modHeight(id) {
  var chatsFeed = document.querySelector("#chatsIn-" + id);
  var msgBox = document.querySelector("#msgIn-" + id);

  if (msgBox.clientHeight > 36) {
    chatsFeed.style.height = "479px";
  } else {
    chatsFeed.style.height = "500px";
  }
}

function showProfile() {
  var myProfileDiv = document.querySelector("#myProfile");
  var profileContent = document.querySelector("#slideInContent");
  var profilePicture = document.querySelector("#profilePicture");

  myProfileDiv.style.width = "100%";

  setTimeout(() => {
    profileContent.classList.remove("hide");

    setTimeout(() => {
      profilePicture.style.transform = "scale(1)";
    }, 100);
  }, 400);
}

function closeProfile() {
  var myProfileDiv = document.querySelector("#myProfile");
  var profileContent = document.querySelector("#slideInContent");
  var profilePicture = document.querySelector("#profilePicture");

  profileContent.classList.add("hide");

  setTimeout(() => {
    profilePicture.style.transform = "scale(0)";
    myProfileDiv.style.width = "0%";
  }, 0);
}

function beginEdit(self, isDOB = false) {
  // self holds an instance of the exact element that was clicked lol

  if (isDOB) {
    self.parentNode.children[0].disabled = false;
  } else {
    self.parentNode.children[0].contentEditable = "true";
  }

  self.parentNode.children[1].classList.add("hide");
  self.parentNode.children[2].classList.remove("hide");
}

function endEdit(self, val = null, isDOB = false) {
  if (typeof self === "object") {
    // self holds an instance of the exact element that was clicked lol

    if (isDOB) {
      self.parentNode.children[0].disabled = true;
    } else {
      self.parentNode.children[0].contentEditable = "false";
    }
    self.parentNode.children[1].classList.remove("hide");
    self.parentNode.children[3].classList.add("hide");

    if (val === null) {
      self.parentNode.children[0].textContent = "Not Specified";
    }
  } else if (typeof self === "string") {
    let loader = document.getElementById(self);
    loader.classList.add("hide");
  }
}

function loading(self) {
  if (typeof self === "object") {
    // self holds an instance of the exact element that was clicked lol

    self.parentNode.children[2].classList.add("hide");
    self.parentNode.children[3].classList.remove("hide");
  } else if (typeof self === "string") {
    let loader = document.getElementById(self);
    loader.classList.remove("hide");
  }
}

function closeToastMsg(toast) {
  let toastContainer = document.getElementById("toastContainer");

  toastContainer.removeChild(toast);
}

function search() {

  const searchContainer = document.getElementById('contacts-search');
  const contactsContainer = document.getElementById('contacts-list');
  let query = document.getElementById('search-box').value;

  query = query.trim();

  if (query == '') {
    contactsContainer.classList.remove('hide');
    searchContainer.classList.add('hide');
    return;
  } 

  contactsContainer.classList.add('hide');
  searchContainer.classList.remove('hide');
  
  searchContainer.innerHTML = 'Searching...';

  let xhr = new XMLHttpRequest();
  xhr.open('GET', getRelativeURLSection() + `search/${query}`, true);
  xhr.onreadystatechange =  function () {
    if (this.readyState === 4) {
      if (this.status === 200) {

        searchContainer.innerHTML =  '';
        
        const rooms_info = JSON.parse(this.responseText);

        let data =  ``;

          for( let index = 0; index < rooms_info.length; index++ ) {
            let room = rooms_info[index];
            let chat = room.Chats;
        
        data +=  `
            <div class="eachContact" onclick="displayRoom('${room._id}')">
              <div class="contactPicture">
              `;
        
              if (room.Display_Picture != undefined) {
                data +=  `<img id="pic4${index}" src="${room.Display_Picture}" alt="your profile picture">`;
              } else {
                data += `<img id="pic4${index}" src="defaults/${room.Sex == 'Male' ? 'male' : 'female'}.png" alt="your profile picture">`;
              }
        data += `</div>
              <div class="previousChat">
                <h4 class="contactName">
                  ${room.Username}
                </h4>
                <div class="recent">
                  <h4 id="recentChats-${room._id}" class="recentChat">
                  `;

                    if (chat.length > 0) {
                      data += chat[chat.length-1].Message;
                    } else {
                      data += `<i>tap to begin a conversation</i>`;
                    }
        data += `
                  </h4>
                  <!-- This index refers to the very last chat -->
                  <div id="dot4-${room._id}" class="hide notifcation-dot"></div>
                </div>
              </div>
            </div>
            <hr style="margin: 5px 0px !important;">
          `;
          }

        searchContainer.innerHTML += data;

      } else {

      }
    }
  }
  xhr.send();
  
}

function showToastMsg(msg) {
  let toastContainer = document.getElementById("toastContainer");

  let toast = document.createElement("div");
  // add all the default attributes from bootstrap
  toast.classList.add("myToast", "toast");
  toast.ariaRoleDescription = "alert";
  toast.ariaLive = "assertive";
  toast.ariaAtomic = true;
  toast.innerHTML = `
        <div class="toast-header">
            <span class="fa fa-smile-o mr-2"></span>
            <span class="mr-4 mr-auto">BUCare</span>
            <small>a few moments ago</small>
            <button onclick="closeToastMsg(this.parentNode.parentNode)" type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
        <div id="serverMsg" class="toast-body">${msg}</div>
    `;

  toastContainer.appendChild(toast);
  toastContainer.scrollIntoView(true);

  setTimeout(() => {
    closeToastMsg(toast);
  }, 5000);
}

function updateProfile(userId, affectedField, fieldInstance, isDOB = false) {

  let value;
  if (isDOB) {
    value = fieldInstance.parentNode.children[0].value;
  } else {
    value = fieldInstance.parentNode.children[0].textContent.trim();
  }

  const newValue = value != "" || value != "Not Specified" ? value : null;

  let xhr = new XMLHttpRequest();
  xhr.open("PUT", "/updateProfile", true);
  xhr.setRequestHeader("content-type", "application/json");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status == 200) {
        // passed in newValue so as to enter Not Specified into the field if the user leaves it empty
        endEdit(fieldInstance, this.responseText, isDOB);

        showToastMsg("Update was successful");
      } else if (this.status === 500) {
        showToastMsg("Oops! something went wrong");
      } else if (this.status === 400) {
        showToastMsg(this.responseText);
      } else {
        showToastMsg("Oops! something isn't right, try again later");
      }
    }
  };
  const data = {
    userId: userId,
    affectedField: affectedField,
    newValue: newValue,
  };

  xhr.send(JSON.stringify(data));
  loading(fieldInstance);
}

function updatePhoto(userId, affectedField, fieldInstance) {
  let fileData = fieldInstance.files[0];
  let displayPicture = document.querySelector("#displayPicture");
  let tinyDisplayPicture = document.querySelector("#tinyDisplayPicture");

  var xhr = new XMLHttpRequest();
  xhr.open("PUT", "/updatePhoto", true);
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        displayPicture.src = this.responseText;
        tinyDisplayPicture.src = this.responseText;

        showToastMsg("Update was successful");
      } else if (this.status === 500) {
        showToastMsg("Oops! something went wrong");
      } else if (this.status === 400) {
        showToastMsg(this.responseText);
      } else {
        showToastMsg("Oops! something isn't right, try again later");
      }

      endEdit("dpPreloader");
    }
  };
  let data = new FormData();
  data.append("displayPhoto", fileData);
  data.append("userId", userId);
  data.append("affectedField", affectedField);

  xhr.send(data);
  loading("dpPreloader");
}

function closeextrainfo() {
  let chatBox = document.getElementById("chatBox");
  let infoPanel = document.getElementById("contactAdditionalInfo");

  // creates space for it to appear
  infoPanel.classList.add("hide");
  chatBox.classList.remove("col-sm-5", "col-md-5", "col-lg-5", "col-xl-5");
  chatBox.classList.add("col-sm-8", "col-md-8", "col-lg-8", "col-xl-8");

  // clears it if there was something previously inside
  infoPanel.innerHTML = "";
}

function showExtraInfo(userId, picId) {
  let chatBox = document.getElementById("chatBox");
  let infoPanel = document.getElementById("contactAdditionalInfo");

  // if possible find a better fix to this
  let profilePicFromContactList = document.getElementById("pic4" + picId);

  // creates space for it to appear
  infoPanel.classList.remove("hide");
  chatBox.classList.remove("col-sm-8", "col-md-8", "col-lg-8", "col-xl-8");
  chatBox.classList.add("col-sm-5", "col-md-5", "col-lg-5", "col-xl-5");

  // clears it if there was something previously inside
  infoPanel.innerHTML = "";

  infoPanel.innerHTML = `
        <div class="center">
            <div class="large-preloader spinner-border" role="status"></div>
        </div>
    `;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", getRelativeURLSection() + `getinfo/${userId}`, true);
  xhr.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) {
        let response = JSON.parse(this.responseText);

        let data = `
                    <div class="header4closeextra">
                        <span onclick="closeextrainfo()">&times;</span>
                    </div>
                    <div style="transform: scale(1) !important;" class="profilePicture">
                        <img src="${
                          profilePicFromContactList.src
                        }" alt="your profile picture" id="displayPicture">
                    </div>
                    <div class="profileDetails">
                        <div class="eachDetail">
                            <h4 class="detailName">First Name</h4>
                            <div class="textEditArea">
                                <div class="detailValue">
                                    ${
                                      response.First_Name
                                        ? response.First_Name
                                        : "Not Specified"
                                    }
                                </div>
                            </div>
                        </div>

                        <div class="eachDetail">
                            <h4 class="detailName">Last Name</h4>
                            <div class="textEditArea">
                                <div class="detailValue">
                                    ${
                                      response.Last_Name
                                        ? response.Last_Name
                                        : "Not Specified"
                                    }
                                </div>
                            </div>
                        </div>

                        <div class="eachDetail">
                            <h4 class="detailName">Email</h4>
                            <div class="textEditArea">
                                <div class="detailValue">
                                    ${
                                      response.Email
                                        ? response.Email
                                        : "Not Specified"
                                    }
                                </div>
                            </div>
                        </div>

                        <div class="eachDetail">
                            <h4 class="detailName">Telephone</h4>
                            <div class="textEditArea">
                                <div class="detailValue">
                                    ${response.Telephone}
                                </div>
                            </div>
                        </div>

                        <div class="eachDetail">
                            <h4 class="detailName">Sex</h4>
                            <div class="textEditArea">
                                <div class="detailValue">
                                    ${response.Sex}
                                </div>
                            </div>
                        </div>
                  `;
        // this will only fire for the therapist details
        if (response.Average_Rating) {
          data += `
                      <div class="eachDetail">
                        <h4 class="detailName">Average Rating</h4>
                        <div class="textEditArea">
                            <div class="detailValue">
                                ${response.Average_Rating}
                            </div>
                        </div>
                      </div>

                      <div class="eachDetail">
                        <h4 class="detailName">Attending to</h4>
                        <div class="textEditArea">
                            <div class="detailValue">
                                ${response.Clients_Count} Client(s)
                            </div>
                        </div>
                      </div>

                    `;
        }

        data += `</div>`;

        infoPanel.innerHTML = data;
      } else {
        showToastMsg(this.responseText);
      }
    }
  };
  xhr.send();
}

function ratingModalInfo(roomId) {
  let modalInfo = document.getElementById("ratingEquivalentText");
  modalInfo.dataset.roomId = roomId;
}

function caseFileModalInfo(roomId) {
  let modalInfo = document.getElementById("caseFileSubmitBtn");
  modalInfo.dataset.roomId = roomId;
}

function showRatingText(msg, starId) {
  let textBox = document.getElementById("ratingEquivalentText");
  let stars = document.getElementById("stars").children;

  textBox.textContent = msg;

  // the length will only be 1 when the person has already given a rating and the stars removed
  if (stars.length == 1) {
    return;
  }

  for (let index = stars.length - 1; index >= 0; index--) {
    const element = stars[index];

    if (index <= starId) {
      element.classList.remove("bi-star");
      element.classList.add("active-star", "bi-star-fill");
    } else {
      element.classList.remove("active-star", "bi-star-fill");
      element.classList.add("bi-star");
    }
  }
}

function rate(rating) {
  let roomId = document.getElementById("ratingEquivalentText").dataset.roomId;
  let textBox = document.getElementById("ratingEquivalentText");

  let starSection = document.getElementById("ratingStars");
  let commentSection = document.getElementById("ratingComment");
  let commentBtn = document.getElementById("commentSubmitBtn");
  let ratingCancelBtn = document.getElementById("ratingCancelBtn");

  ratingCancelBtn.innerHTML = "Processing...";

  let xhr = new XMLHttpRequest();
  xhr.open("PUT", getRelativeURLSection() + "ratetherapist", true);
  xhr.setRequestHeader("content-type", "application/json");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        textBox.innerHTML = "";

        commentBtn.dataset.ratingId = JSON.parse(this.responseText);

        starSection.classList.add("hide");
        commentSection.classList.remove("hide");
      } else if (this.status === 429) {
        showToastMsg(
          "Sorry we are unable to process your request. you have to wait at least 1 hour before rating this therapist again"
        );
      } else if (this.status === 400) {
        showToastMsg(
          "Sorry we are unable to process your request as it may have been malformed"
        );
      } else {
        showToastMsg(
          "Sorry we are unable to process your request at this time"
        );
      }

      ratingCancelBtn.innerHTML = "Cancel";
    }
  };
  const data = {
    roomId: roomId,
    rating: rating,
  };
  xhr.send(JSON.stringify(data));
}

function addRatingComment() {
  let starsContainer = document.getElementById("stars");
  let commentBtn = document.getElementById("commentSubmitBtn");
  let comment = document.getElementById("ratingCommentText").value.trim();
  let modalCloseBtn = document.getElementById("ratingCancelBtn");
  let ratingQuestion = document.getElementById('ratingHeader');

  let starSection = document.getElementById("ratingStars");
  let commentSection = document.getElementById("ratingComment");

  let ratingDocsId = commentBtn.dataset.ratingId;

  // if you dont leave a rating there is no need to run an AJAX request the code ends here.
  if (!comment) {
    commentSection.classList.add("hide");
    starSection.classList.remove("hide");
    starsContainer.innerHTML = `
      <h5 class="ratingSuccess">Thank you for your feedback.</h5>
      <small>You will be able to leave another feedback in one hour.</small>
    `;
    ratingQuestion.classList.add('hide');
    modalCloseBtn.innerText = "Close";
    return true; // just returning true doesn't really matter
  }

  commentBtn.innerHTML = "Processing...";
  let xhr = new XMLHttpRequest();
  xhr.open("PUT", getRelativeURLSection() + `updateRating`, true);
  xhr.setRequestHeader("content-type", "application/json");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        commentSection.classList.add("hide");
        starSection.classList.remove("hide");
        starsContainer.innerHTML = `
          <h5 class="ratingSuccess">Thank you for your feedback.</h5>
          <small>You will be able to leave another feedback in one hour.</small>
        `;
        ratingQuestion.classList.add('hide');
        starsContainer.onmouseleave = null; // removes the eventlistener after it has finished
        modalCloseBtn.innerText = "Close";
      } else if (this.status === 400) {
        showToastMsg(
          "Sorry we are unable to process your request as it may have been malformed"
        );
      } else {
        showToastMsg(
          "Sorry we are unable to process your request at this time"
        );
      }

      commentBtn.innerHTML = "Leave a comment";
    }
  };
  let data = {
    docsId: ratingDocsId,
    comment: comment,
  };
  xhr.send(JSON.stringify(data));
}

function dismissReport() {

  let dismissBtn = document.getElementById('dimissReportBtn');
  let closeBtn = document.getElementById('reportInfoCloseBtn');
  let userId = dismissBtn.dataset.uid;

  let clientRow = document.getElementById("client-" + userId);
  let reportInfo = document.getElementById("reportInfo-" + userId);

  dismissBtn.disabled = true;
  dismissBtn.textContent = "Dismissing case...";

  let xhr = new XMLHttpRequest();
  xhr.open("put", "/a/toggleDisabledStatus", true);
  xhr.setRequestHeader("content-type", "application/json");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        clientRow.removeChild(reportInfo);
        showToastMsg("You have successfully dismissed this case");

        closeBtn.click();
      } else {
        showToastMsg("Oops! Something went wrong, kindly try again");
      }

      dismissBtn.disabled = false;
      dismissBtn.textContent = "Dismiss case";
    }
  };
  const data = {
    userId: userId,
    newValue: false,
    user: 'client',
  };
  xhr.send(JSON.stringify(data));

}

function toggleDisabledStatus(userId, newValue, typeOfUser) {
  let clientRow = document.getElementById("client-" + userId);
  let reportInfo;

  if (clientRow) {
    reportInfo = document.getElementById("reportInfo-" + userId);
  }

  fieldInstance = document.getElementById("disable" + userId);
  const parent = fieldInstance.parentNode;
  parent.innerHTML = '<i class="preloader spinner-border"></i>';

  let xhr = new XMLHttpRequest();
  xhr.open("put", "/a/toggleDisabledStatus", true);
  xhr.setRequestHeader("content-type", "application/json");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        if (this.responseText === "false") {
          parent.innerHTML = `<td><i id="disable${userId}" title="Disable this user" class="adminIcon fas fa-ban" onclick="toggleDisabledStatus(\'${userId}\', true, \'${typeOfUser}\')"></i></td>`;
          showToastMsg("This user has been re-enabled successfully");
        } else {
          parent.innerHTML = `<td><i id="disable${userId}" title="Re-enable this user" class="adminIcon fas fa-ban disabled" onclick="toggleDisabledStatus(\'${userId}\', false, \'${typeOfUser}\')"></i></td>`;
          showToastMsg("This user has been disabled successfully");

          if (clientRow) {
            clientRow.removeChild(reportInfo);
          }
        }
      } else {
        // if i was trying to enable the user and it fails i need to update the ui to show where you where before
        if (newValue === "false") {
          parent.innerHTML = `<td><i id="disable${userId}" title="Re-enable this user" class="adminIcon fas fa-ban disabled" onclick="toggleDisabledStatus(\'${userId}\', false, \'${typeOfUser}\')"></i></td>`;
          showToastMsg("Sorry, that operation failed kindly try again.");
        } else {
          parent.innerHTML = `<td><i id="disable${userId}" title="Disable this user" class="adminIcon fas fa-ban" onclick="toggleDisabledStatus(\'${userId}\', true, \'${typeOfUser}\')"></i></td>`;
          showToastMsg("Sorry, that operation failed kindly try again.");
        }
      }
    }
  };
  const data = {
    userId: userId,
    newValue: newValue,
    user: typeOfUser,
  };

  xhr.send(JSON.stringify(data));
}

function prepareToDeleteUser(userId, typeOfUser) {
  let btn = document.getElementById("deleteUserBtn");

  btn.dataset.userId = userId;
  btn.dataset.typeOfUser = typeOfUser;
}

function deleteUser() {
  let btn = document.getElementById("deleteUserBtn"); // this is the button from th modal

  let userId = btn.dataset.userId;
  let typeOfUser = btn.dataset.typeOfUser;

  let preloader = document.getElementById("preloader-" + userId);
  let deleteBtn = document.getElementById("deleteBtn-" + userId); // this is the btn from the table

  let modalCloseBtn = document.getElementById("deleteUserCloseBtn");

  let parent, fieldInstance;
  if (typeOfUser === "therapist") {
    parent = document.getElementById("therapistSection");
    fieldInstance = document.getElementById("therapist-" + userId);
  } else {
    parent = document.getElementById("clientSection");
    fieldInstance = document.getElementById("client-" + userId);
  }

  deleteBtn.classList.add("hide");
  preloader.classList.remove("hide");

  let xhr = new XMLHttpRequest();
  xhr.open("delete", "/a/deleteUser", true);
  xhr.setRequestHeader("content-type", "application/json");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        showToastMsg("The user account has been deleted successfully");
        parent.removeChild(fieldInstance);
      } else {
        showToastMsg("Sorry, that operation failed kindly try again.");

        preloader.classList.add("hide");
        deleteBtn.classList.remove("hide");
      }

      modalCloseBtn.click();
    }
  };
  let data = {
    userId: userId,
    user: typeOfUser,
  };
  xhr.send(JSON.stringify(data));
}

function getReport(userId, fieldInstance) {
  let reportModalBtn = document.getElementById("reportModalBtn");

  fieldInstance.classList.remove("fas", "fa-exclamation-circle");
  fieldInstance.classList.add("preloader", "spinner-border");

  let xhr = new XMLHttpRequest();
  xhr.open("get", `/a/getreport/${userId}`, true);
  xhr.setRequestHeader("content-type", "application/json");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        let response = JSON.parse(this.responseText);

        // setting the info in the modal
        document.getElementById("inReportTId1").innerText =
          response.therapistEmail;
        document.getElementById("inReportTId2").innerText =
          response.therapistEmail;
        document.getElementById("inReportCId").innerText = response.clientEmail;
        document.getElementById("inReportCat").innerText = response.category;
        document.getElementById("inReportComment").innerText = response.comment;

        // setting userId in the modal btn
        document.getElementById('dimissReportBtn').dataset.uid = userId;

        reportModalBtn.click();
      } else {
        showToastMsg(
          "Sorry, this report information could not be retrived try again later."
        );
      }

      fieldInstance.classList.remove("preloader", "spinner-border");
      fieldInstance.classList.add("fas", "fa-exclamation-circle");
    }
  };
  xhr.send();
}

function submitCaseFile() {
  let roomId = document.getElementById("caseFileSubmitBtn").dataset.roomId;
  let modalCloseBtn = document.getElementById("caseFileCancelBtn");
  let caseFileForm = document.getElementById("caseFIleForm");

  let xhr = new XMLHttpRequest();
  xhr.open("POST", getRelativeURLSection() + "addCaseFile", true);
  xhr.setRequestHeader("content-type", "application/json");
  xhr.onreadystatechange = function () {
    if (this.readyState) {
      if (this.status === 200) {
        caseFileForm.reset();
        modalCloseBtn.click();

        showToastMsg("Thank you, your request has been processed");
      } else if (this.status === 429) {
        showToastMsg(
          "Sorry we are unable to process your request. you have made too many requests"
        );
      } else if (this.status === 400) {
        showToastMsg(
          "Sorry we are unable to process your request as it may have been malformed"
        );
      } else {
        showToastMsg(
          "Sorry we are unable to process your request at this time"
        );
      }
    }
  };
  let data = {
    RoomId: roomId,
    Observation: caseFileForm.elements["observation"].value,
    Instruments: caseFileForm.elements["instruments"].value,
    Recommendation: caseFileForm.elements["recommendation"].value,
    Conclusion: caseFileForm.elements["conclusion"].value,
  };
  xhr.send(JSON.stringify(data));

  return false;
}

function showPassword(elementInstance) {
  const parent = elementInstance.parentNode;

  if (parent.children.length === 3) {
    // the parent contains just 3 elements 0 - the input, 1 - the showBtn, 2 - the hideBtn
    parent.children[0].setAttribute('type', 'text');
    parent.children[1].classList.add('hide');
    parent.children[2].classList.remove('hide');  
  } else if (parent.children.length === 4) {
    // the parent contains just 4 elements 1 - the input, 2 - the showBtn, 3 - the hideBtn
    parent.children[1].setAttribute('type', 'text');
    parent.children[2].classList.add('hide');
    parent.children[3].classList.remove('hide');  
  }

}

function hidePassword(elementInstance) {
  const parent = elementInstance.parentNode;

  if (parent.children.length === 3) {
    // the parent contains just 3 elements 0 - the input, 1 - the showBtn, 2 - the hideBtn
    parent.children[0].setAttribute('type', 'password');
    parent.children[1].classList.remove('hide');
    parent.children[2].classList.add('hide');
  } else if (parent.children.length === 4) {
    // the parent contains just 4 elements 1 - the input, 2 - the showBtn, 3 - the hideBtn
    parent.children[1].setAttribute('type', 'password');
    parent.children[2].classList.remove('hide');
    parent.children[3].classList.add('hide');
  }
  
}

function beginPageEdit(contentName, index=null) {

  // holds the element containing the content to be edited
  const contentBox = document.getElementById("content4"+contentName+index);
  let originalValue = contentBox.textContent;

  // places cursor at the end of the text for ease in editing
  function placeCursorAtDivEnd(elementInstance) {
    const selection = window.getSelection();  
    const range = document.createRange();  

    selection.removeAllRanges();  
    range.selectNodeContents(elementInstance);  
    range.collapse(false);  
    selection.addRange(range);  
    elementInstance.focus();
  }

  // pauses the slider movement if the slider is being edited
  if (/Carousel/.test(contentName)) {
    $('.owl-carousel').trigger('stop.owl.autoplay');
  }

  // get data
  const pageToEdit = contentBox.dataset.pTE;

  // will only be available for complex pages like index
  const pathToDBChange = contentBox.dataset.pTDBC;

  // holds the controllers for editing
  const editBtn = document.getElementById('pen4'+contentName+index);
  const saveEditBtn = document.getElementById('saveEdit4'+contentName+index);
  const closeEditBtn = document.getElementById('closeEdit4'+contentName+index);
  const preloader = document.getElementById('editPreloader4'+contentName+index);

  // toggle the controls
  editBtn.classList.add('hide');
  saveEditBtn.classList.remove('hide');
  closeEditBtn.classList.remove('hide');

  // attach custom data-set to the elements which will be used to check the events later to prevent adding multiple listeners
  if (saveEditBtn.dataset.hasClickEvent === undefined) {
    saveEditBtn.onclick = function () {

      const newValue = contentBox.textContent.trim();

      if (newValue === '') {
        return showToastMsg("Sorry, the new value cannot be empty");
      }

      // set preloader
      saveEditBtn.classList.add('hide');
      closeEditBtn.classList.add('hide');
      contentBox.setAttribute('contenteditable', false);
      preloader.classList.remove('hide');

      let xhr = new XMLHttpRequest();
      xhr.open('PUT', `/updatePages/${pageToEdit}`, true);
      xhr.setRequestHeader('content-type', 'application/json');
      xhr.onreadystatechange = function () {
        if (this.readyState === 4) {
          if (this.status === 200) {
            contentBox.textContent = this.responseText;
            originalValue = this.responseText;

            // toggle the controls, when adding the preloader the other buttons have already been toggled
            preloader.classList.add('hide');
            editBtn.classList.remove('hide');

            showToastMsg("Hurray! Page edit was successfully saved.");
            
          } else {
            
            preloader.classList.add('hide');
            saveEditBtn.classList.remove('hide');
            closeEditBtn.classList.remove('hide');

            showToastMsg(this.responseText);
          }

          // resumes the slider movement after edit
          if (/Carousel/.test(contentName)) {
            $('.owl-carousel').trigger('play.owl.autoplay');
          }
        }
      }
      let data;
      if (pathToDBChange) {
        data = {
          newValue,
          pathToDBChange
        }
      } else {
        data = {
          newValue,
          affectedField: contentName,
          index
        }
      }
      xhr.send(JSON.stringify(data));

    }
    saveEditBtn.dataset.hasClickEvent = true;

  }

  if (closeEditBtn.dataset.hasClickEvent === undefined) {

    closeEditBtn.onclick = function () {
      // toggle the controls
      saveEditBtn.classList.add('hide');
      closeEditBtn.classList.add('hide');
      editBtn.classList.remove('hide');

      contentBox.setAttribute('contenteditable', false);
      // resets it to the original value if the user doesn't save
      contentBox.textContent = originalValue;
    }  

    closeEditBtn.dataset.hasClickEvent = true;

  }
  
  // make box editable
  contentBox.setAttribute('contenteditable', true);
  placeCursorAtDivEnd(contentBox);
}

function changepwd() {
  const boxId = 5;
  const oldPwd = document.getElementById('oldpwd');
  const verifyBtn = document.getElementById('verifyBtn');

  // for password changeDiv
  const newPasswordDiv = document.getElementById('newpwd');
  const newPassword = document.getElementById('newPasswordInput');
  const confirmPassword = document.getElementById('confirmPasswordInput');

  // for admin security question
  const sQuestionDiv = document.getElementById("securityQuestion") || null;
  const sQuestionLabel = document.getElementById("sQuestion") || null;
  const sQuestionBtn = document.getElementById("sQuestionBtn") || null;
  const sQuestionInput = document.getElementById("sQuestionInput") || null;
  let hasAnsweredSecurityQuestion = false;

  const changePwdBtn = document.getElementById('changePwdBtn');

  verifyBtn.textContent = "Verifying...";
  verifyBtn.style.opacity = .7;

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/users/checkpwd', true);
  xhr.setRequestHeader('content-type', 'application/json');
  xhr.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) {

        // clear the input
        oldPwd.value = '';

        // checks if this is the admin's page
        if (sQuestionDiv != null) {
          
          sQuestionLabel.textContent = this.responseText + "?";
          sQuestionDiv.classList.remove('hide');

          sQuestionBtn.onclick = function () {
            let answer = sQuestionInput.value
              .trim()
              .toLowerCase();

            if (answer == "") {
              return displayErrorMsg("An answer has to be provided", boxId);
            }

            sQuestionBtn.textContent = "Checking...";
            sQuestionBtn.style.opacity = .7;

            let xhr = new XMLHttpRequest();
            xhr.open("POST", "/users/checksquestion", true);
            xhr.setRequestHeader("content-type", "application/json");
            xhr.onreadystatechange = function () {
              if (this.status == 200) {
                // for the admin this option becomes enabled after he has passed the security question
                // as a form os security so you can't by pass this a global variable in this function prevents the next set of AJAX requests
                newPasswordDiv.classList.remove('hide');

                hasAnsweredSecurityQuestion = true;
              } else {
                displayErrorMsg(this.responseText, boxId);
              }

              sQuestionBtn.textContent = "Check Answer";
              sQuestionBtn.style.opacity = 1;
            }
            xhr.send(JSON.stringify({answer}));
          }


        } else {

          // this part remains hidden so the event listeners below are added but it doesn't matter
          newPasswordDiv.classList.remove('hide');
        }
        
        let validationTimer;

        confirmPassword.onkeyup = function () {

          if (validationTimer) {
            clearTimeout(validationTimer);
          }
          
          validationTimer = setTimeout(() => {
            if (newPassword.value.length < 8) {
              changePwdBtn.setAttribute('disabled', true);
  
              return displayErrorMsg("New password must be at least 8 characters in length", boxId);
            }
  
            // possibly check for strength

            if (newPassword.value !== confirmPassword.value) {
              changePwdBtn.setAttribute('disabled', true);
  
              return displayErrorMsg("Password mismatch error", boxId);
            }
  
            // if it passes all the test enable button
            changePwdBtn.removeAttribute('disabled');
          }, 1500);
          
        }

        changePwdBtn.onclick = function () {
          // recheck everything to confirm
          if (newPassword.value.length < 8) {
            changePwdBtn.setAttribute('disabled', true);
  
            return displayErrorMsg("New password must be at least 8 characters in length", boxId);
          }
    
          if (newPassword.value !== confirmPassword.value) {
            changePwdBtn.setAttribute('disabled', true);
  
            return displayErrorMsg("Password mismatch error", boxId);
          }

          changePwdBtn.textContent = "Changing Password...";
          changePwdBtn.style.opacity = .7;

          // if your not an admin it passes else it prevents the request
          if (sQuestionDiv == null || (sQuestionDiv && hasAnsweredSecurityQuestion)) {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/users/changepwd', true);
            xhr.setRequestHeader('content-type', 'application/json');
            xhr.onreadystatechange = function () {
              if (this.readyState === 4) {
                if (this.status === 200) {
                  // clear the inputs
                  newPassword.value = '';
                  confirmPassword.value = '';

                  displaySuccessMsg("Password change was successful😁", boxId)
                } else {
                  displayErrorMsg(this.responseText, boxId);
                }

                changePwdBtn.textContent = "Change Password";
                changePwdBtn.style.opacity = 1;
              }
            }
            xhr.send(JSON.stringify({newPwd: newPassword.value}))
          } else {

          }
          
        }

      } else {
        displayErrorMsg(this.responseText, boxId);
      }

      verifyBtn.textContent = "Verify";
      verifyBtn.style.opacity = 1;

    }
  }
  xhr.send(JSON.stringify({oldPwd: oldPwd.value}))
}

function switchPasswordPortal() {
  
  const portalBtn = document.getElementById('pwdportalswitch');
  const current = portalBtn.dataset.current;

  const resetDiv = document.getElementById('resetpwdcontent');
  const forgotDiv = document.getElementById('forgotpwdcontent');
  
  if (current.toLowerCase() == "forgot your password?") {
    portalBtn.textContent = "Reset your password";
    portalBtn.dataset.current = "Reset your password";


    resetDiv.classList.add('hide');
    forgotDiv.classList.remove('hide');

  } else if (current.toLowerCase() == "reset your password") {
    portalBtn.textContent = "Forgot your password?";
    portalBtn.dataset.current = "Forgot your password?";

    forgotDiv.classList.add('hide');
    resetDiv.classList.remove('hide');

  }
}

function sendFPwd() {
  const boxId = 6;

  const verifyAndSendBtn = document.getElementById('sendFPwdBtn');
  const resetEmail = document.getElementById('fpwdemail')
    .value
    .toLowerCase()
    .trim();
  const enterTokenDiv = document.getElementById('resetPwdTokenDiv');

  const tokenBtn = document.getElementById('verifyTokenFPwdBtn');

  const newPwdDiv = document.getElementById('newpwd-F');
  const newPassword = document.getElementById('newPasswordInput-F');
  const confirmPassword = document.getElementById('confirmPasswordInput-F');
  const changePwdBtn = document.getElementById('changePwdBtn-F');

  let buEmailRegex = /(\d{4}@student.babcock.edu.ng|@babcock.edu.ng)$/i;
  
  if (resetEmail == "" || buEmailRegex.test(resetEmail) == false) {
    return displayErrorMsg("Invalid Email Address", boxId);
  }

  verifyAndSendBtn.textContent = "Checking email...";
  verifyAndSendBtn.style.opacity = .7;

  let xhr = new XMLHttpRequest();
  xhr.open("POST", '/users/checkemail', true);
  xhr.setRequestHeader("content-type", "application/json");
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        
        enterTokenDiv.classList.remove('hide');
        tokenBtn.onclick = function () {
          let token = document.getElementById('fpwdtoken').value;

          if (token == '') {
            return displayErrorMsg("Invalid token");
          }

          let xhr = new XMLHttpRequest();
          xhr.open("POST", '/checkVerificationToken', true);
          xhr.setRequestHeader("content-type", "application/json");
          xhr.onreadystatechange = function () {
            if (this.readyState === 4) {
              if (this.status === 200) {

                newPwdDiv.classList.remove('hide');
                
                let validationTimer;

                confirmPassword.onkeyup = function () {

                  if (validationTimer) {
                    clearTimeout(validationTimer);
                  }
                  
                  validationTimer = setTimeout(() => {
                    if (newPassword.value.length < 8) {
                      changePwdBtn.setAttribute('disabled', true);
          
                      return displayErrorMsg("New password must be at least 8 characters in length", boxId);
                    }
          
                    // possibly check for strength

                    if (newPassword.value !== confirmPassword.value) {
                      changePwdBtn.setAttribute('disabled', true);
          
                      return displayErrorMsg("Password mismatch error", boxId);
                    }
          
                    // if it passes all the test enable button
                    changePwdBtn.removeAttribute('disabled');
                  }, 1500);
                  
                }

                changePwdBtn.onclick = function () {
                  // recheck everything to confirm
                  if (newPassword.value.length < 8) {
                    changePwdBtn.setAttribute('disabled', true);
          
                    return displayErrorMsg("New password must be at least 8 characters in length", boxId);
                  }
            
                  if (newPassword.value !== confirmPassword.value) {
                    changePwdBtn.setAttribute('disabled', true);
          
                    return displayErrorMsg("Password mismatch error", boxId);
                  }

                  changePwdBtn.textContent = "Changing Password...";
                  changePwdBtn.style.opacity = .7;

                  const xhr = new XMLHttpRequest();
                  xhr.open('POST', '/users/changepwd', true);
                  xhr.setRequestHeader('content-type', 'application/json');
                  xhr.onreadystatechange = function () {
                    if (this.readyState === 4) {
                      if (this.status === 200) {
                        // clear the inputs
                        newPassword.value = '';
                        confirmPassword.value = '';

                        displaySuccessMsg("Password change was successful😁", boxId)
                      } else {
                        displayErrorMsg(this.responseText, boxId);
                      }

                      changePwdBtn.textContent = "Change Password";
                      changePwdBtn.style.opacity = 1;
                    }
                  }
                  // this authToken is sent along automatically as a kind of validator so you dont just forge request and reset 
                  // someone's account lol
                  xhr.send(JSON.stringify({
                    newPwd: newPassword.value,
                    authToken: token,
                    reqEmail: resetEmail
                  }))
                }

              } else {
                return displayErrorMsg(this.responseText, boxId);
              }
            }
          }
          xhr.send(JSON.stringify({
            token,
            email: resetEmail
          }));
        }

      } else {
        displayErrorMsg(this.responseText, boxId);
      }

      verifyAndSendBtn.textContent = "Verify & Send reset token";
      verifyAndSendBtn.style.opacity = 1;

    }
  }
  xhr.send(JSON.stringify({
    resetEmail,
    websiteUrl: location.origin 
  }));

}

function RejectModalInfo(roomId) {
  const modalConfirmBtn = document.getElementById('rejectRequestBtn');
  modalConfirmBtn.dataset.roomId = roomId;
}

function rejectRequest() {
  const modalConfirmBtn = document.getElementById('rejectRequestBtn');
  const modalCloseBtn = document.getElementById('rejectRequestCloseBtn');
  const contactsList = document.getElementById('contacts-list');
  const chatBoxList = document.getElementById('chatBox');

  const roomId = modalConfirmBtn.dataset.roomId;

  const targetContact = document.getElementById('eachContact-'+roomId);
  const targetContactChatBox = document.getElementById('room-'+roomId);

  const optionalComment = document.getElementById("rejectRequestText").value.trim() || null;
  // clear it
  modalConfirmBtn.dataset.roomId = "";

  modalConfirmBtn.textContent = "Processing...";
  modalConfirmBtn.style.opacity = .7;

  let xhr = new XMLHttpRequest();
  xhr.open("POST", getRelativeURLSection() + "/rejectjoinroomrequest", true);
  xhr.setRequestHeader('content-type', 'application/json');
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        showToastMsg("The operation was successful");

        contactsList.removeChild(targetContact);
        chatBoxList.removeChild(targetContactChatBox);
        // click the first contact
        contactsList.children.length > 0 ? contactsList.children[0].click() : null;
      } else {
        showToastMsg(this.responseText);
      }

      modalCloseBtn.click();
    }
  }
  xhr.send(JSON.stringify({ roomId, optionalComment }))
}

function acceptRequest(roomId) {
  const acceptBtn = document.getElementById("acceptbtn-"+roomId);
  const recentChat = document.getElementById("recentChats-"+roomId);
  const chatBox = document.getElementById("chatsIn-"+roomId);
  const sendMessageBox = document.getElementById("sndMsg-"+roomId);

  acceptBtn.textContent = "Processing...";
  acceptBtn.opacity = .7;

  const xhr = new XMLHttpRequest();
  xhr.open("POST", getRelativeURLSection() + "/acceptjoinroomrequest");
  xhr.setRequestHeader('content-type', 'application/JSON');
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {

        const response = JSON.parse(this.responseText);

        showToastMsg(response.message);

        // update view temporarily pending the next page reload
        // TODO: try and integrate sockets into the entire app so new views can be loaded cleanly
        // or better still move to angular 😂😂
        recentChat.textContent = "New request made to join room";
        chatBox.innerHTML = `
          <div class="systemMessage">
            <div style='width: 100%; font-style: italic; background-color: #3697ff !important;' class="messageSection">
              <h4 style="color: white !important;" class="actualMsg">
                ${response.chat}
              </h4>
              <div class="dateandseen">
                <h4 style="color: white !important;" class="msgDate">
                  ${response.chatDate}
                </h4>
              </div>
            </div>
          </div>
        `;

        sendMessageBox.innerHTML = `
          <div class="input-group mb-3">
            <div onkeydown="modHeight('${roomId}')" id="msgIn-${roomId}" role="textbox" contenteditable="true" dir="ltr" class="form-control msgbox" 
              aria-multiline="true" aria-required="true" placeholder="Recipient's username" aria-label="Recipient's username"
              aria-describedby="basic-addon2"></div>
            <div class="input-group-append">
              <button name="${roomId}, ${response.userId}" class="msgbtn input-group-text" id="basic-addon2">send</button>
            </div>
          </div>
        `;

      } else {
        showToastMsg(this.responseText);

        acceptBtn.textContent = "Accept";
        acceptBtn.opacity = 1;
      }
    }
  }
  xhr.send(JSON.stringify({
    roomId
  }))
}
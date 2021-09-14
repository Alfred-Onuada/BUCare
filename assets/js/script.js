// this creates global functions even thou they are defined inside another function
var displayRoom, leaveChat, leaveChatModal;

// there may be several pages that needs sockets so this function will be called on the body.onload from the html
function init(userId) {

    const socket = io();

    socket.on('ack_rooms', (status) => {

        function scrollToTop(id = null) {
            if (id) {
                var chatFeed = document.querySelector('#chatsIn-' + id);

                chatFeed.scrollTop = chatFeed.scrollHeight;

            } else {
                var chatFeeds = document.getElementsByClassName('chatsFeed');

                [].forEach.call(chatFeeds, function(chatFeed) {
                    chatFeed.scrollTop = chatFeed.scrollHeight;
                })
            }
        }

        function seenAllInRoom(userId, roomId) {
            socket.emit('seen_all_in_room', userId, roomId);
        }

        // has to be written this way so i have access to the socket object
        displayRoom = (roomId) => {

            var roomChats = document.getElementById('room-' + roomId);

            var allRooms = document.getElementsByClassName('chats');

            for (let index = 0; index < allRooms.length; index++) {
                const element = allRooms[index];
                element.classList.add('hide');
            }

            roomChats.classList.remove('hide');

            scrollToTop(roomId);

            removeDot(roomId);

            seenAllInRoom(userId, roomId);
        }

        function removeDot(roomId) {
            var dot = document.querySelector('#dot4-' + roomId);
            dot.classList.add('hide');
        }

        function convertDate() {
            const d = new Date()
            var hour = d.getHours();
            var min = d.getMinutes();
            var timeOfDay = hour <= 11 ? 'am' : 'pm';
            // append additional zero when needed
            hour = hour < 10 ? '0' + hour : hour;
            min = min < 10 ? '0' + min : min;
            hour = hour % 12;

            var date = hour + ':' + min + ' ' + timeOfDay;

            return date;
        }

        function createIncomingMsg(data) {

            var chats = document.getElementById("chatsIn-" + data.RoomId);

            var parent = document.createElement('div');
            parent.classList.add('incoming');

            var child = document.createElement('div');
            child.classList.add('messageSection');

            var msgH4 = document.createElement('h4');
            msgH4.classList.add('actualMsg');
            msgH4.innerHTML = data.Message;

            var dateH4 = document.createElement('h4');
            dateH4.classList.add('msgDate');
            dateH4.innerHTML = convertDate();

            child.appendChild(msgH4);
            child.appendChild(dateH4);
            parent.appendChild(child);

            chats.appendChild(parent);

        }

        function createOutgoingMsg(data) {

            var chats = document.getElementById("chatsIn-" + data.RoomId);

            var parent = document.createElement('div');
            parent.classList.add('outgoing');

            var child = document.createElement('div');
            child.classList.add('messageSection2');

            var msgH4 = document.createElement('h4');
            msgH4.classList.add('actualMsg');
            msgH4.innerHTML = data.Message;

            var dateandseen = document.createElement('div');
            dateandseen.classList.add('dateandseen');

            var dateH4 = document.createElement('h4');
            dateH4.classList.add('msgDate');
            dateH4.innerHTML = convertDate();

            var icon = document.createElement('i');
            icon.classList.add('seenicon', 'bi', 'bi-check2', 'outgoingIn' + data.RoomId)

            dateandseen.appendChild(dateH4);
            dateandseen.appendChild(icon);

            child.appendChild(msgH4);
            child.appendChild(dateandseen);
            parent.appendChild(child);

            chats.appendChild(parent);

            // this is for when it is an outgoing message to know when it has been delivered
            socket.on('delivered', function() {
                updateChatToDelievered(icon);
            })

        }

        function createNotification(data) {
            // This function updates the ui to show the new message in the contact feeds when a new message arrives
            var recentChats = document.querySelector('#recentChats-' + data.RoomId);
            var dot = document.getElementById('dot4-' + data.RoomId)

            recentChats.innerHTML = data.Message;
            dot.classList.remove('hide');

        }

        function updateContactFeed(data) {
            // This function updates the ui to show the new message in the contact feeds
            var recentChats = document.querySelector('#recentChats-' + data.RoomId);

            recentChats.innerHTML = data.Message;
        }

        function updateChatToDelievered(chat) {
            chat.classList.remove('bi-check2');
            chat.classList.add('bi-check2-all');
        }

        function deliverAll(userId) {
            socket.emit('deliver_all', userId);
        }

        leaveChatModal = (roomId) => {
            document.querySelector('#leaveChatBtn').name = roomId;
        }
        
        leaveChat = () => {
        
            var btn = document.querySelector('#leaveChatBtn');
            var closeBtn = document.querySelector('#leaveChatCloseBtn');
            
            var roomId = btn.name;
            
            btn.innerHTML = "Leaving Conversation...";
        
            var xhr = new XMLHttpRequest();
            xhr.open('PUT', '/leaveRoom', true);
            xhr.setRequestHeader("Content-type", "application/JSON");
            xhr.onreadystatechange = function () {
                if (this.status == 200 && this.readyState == 4) {

                    // i dont need the user's ID because what so ever socket emits this event beacause the sockets are handled by separate controllers it invariably
                    // tells me who he/she is
                    socket.emit('left_room', roomId);

                    btn.innerHTML = "Success";
                    // update the ui of the room
                    document.querySelector('#sndMsg-'+roomId).innerHTML = `
                        <center>
                            <div class="inactive-room">
                                <h4 class="inactive-room-text">sorry, your no longer a participant in this room</h4>
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
            }
            data = { 'RoomId': roomId }
            xhr.send(JSON.stringify(data));
        }

        // this function is called once the user opens the chat room page, it changes all the pending messages to delievered
        deliverAll(userId);

        if (status == 'success') {

            var btn = document.getElementsByClassName('msgbtn');

            for (let index = 0; index < btn.length; index++) {
                const content = btn[index];

                const data = content.name.split(', ');

                const room = data[0];
                const speaker = data[1];

                content.onclick = function() {

                    // check if i can access the message above

                    var msg = document.getElementById("msgIn-" + room).textContent.trim();

                    if (msg != '') {

                        const data2 = { Message: msg, RoomId: room, SpokesPerson: speaker }; // cant assign to a constant variable
                        socket.emit('chat_message', data2);

                        createOutgoingMsg(data2);
                        updateContactFeed(data2);
                        scrollToTop(data2.RoomId);
                    }

                    document.getElementById("msgIn-" + room).textContent = '';

                }

            }

            // this is for when it is an incoming message to tell the server it has been delivered
            socket.on('msg', function(data) {

                createIncomingMsg(data);

                createNotification(data);

                data.status = "delivered";
                socket.emit("message_status", data);
            })

            socket.on('delivered_all', roomId => {
                const icons = document.getElementsByClassName('outgoingIn' + roomId);

                // temporary conversion of htmlcollection to array
                [].forEach.call(icons, function(icon) {
                    if (icon.classList.contains('bi-check2')) {
                        icon.classList.remove('bi-check2');
                        icon.classList.add('bi-check2-all');
                    }
                })
            })

            socket.on('seen_all_completed', roomId => {
                const icons = document.getElementsByClassName('outgoingIn' + roomId);

                // temporary conversion of htmlcollection to array
                [].forEach.call(icons, function(icon) {
                    if (icon.classList.contains('seen') == false) {
                        icon.classList.add('seen');
                    }
                })
            })

            // fires when either participant leaves a conversation
            socket.on('disbanded_room', roomId => {
                document.querySelector('#sndMsg-'+roomId).innerHTML = `
                    <center>
                        <div class="inactive-room">
                            <h4 class="inactive-room-text">sorry, your no longer a participant in this room</h4>
                        </div>
                    </center>
                `;
            })

        } else {
            // find a better solution to this
            location.reload();
        }

        // scrolls all chats to the latest automatically
        scrollToTop();

    })

}

function removeErrorMsg(boxId) {

    var errorContainer = document.querySelector('#errorBox' + boxId);

    errorContainer.classList.add('hide');
    errorContainer.classList.remove('shake');
    errorContainer.innerHTML = '';

}

function removeSuccessMsg(boxId) {

    var errorContainer = document.querySelector('#successBox' + boxId);

    errorContainer.classList.add('hide');
    errorContainer.classList.remove('shake');
    errorContainer.innerHTML = '';

}

function displayErrorMsg(msg, boxId=null) {

    if (boxId) {
        var errorContainer = document.querySelector('#errorBox' + boxId);
    
        errorContainer.classList.remove('hide');
        errorContainer.classList.add('shake');
        errorContainer.innerHTML = msg;
    
        setTimeout(() => {
            removeErrorMsg(boxId);
        }, 3500);
    } else {

        if (msg) {

            var errorContainer = document.querySelector('#errorContainer');
            var errorText = document.querySelector('#errorText');

            errorContainer.classList.remove('hide');
            errorText.innerHTML = msg;
            errorContainer.classList.add('shake');

            setTimeout(() => {
                errorText.innerHTML = '';
                errorContainer.classList.remove('shake');
                errorContainer.classList.add('hide');
            }, 4000);
        }

    }

}

function displaySuccessMsg(msg, boxId) {

    var errorContainer = document.querySelector('#successBox' + boxId);

    errorContainer.classList.remove('hide');
    errorContainer.classList.add('shake');
    errorContainer.innerHTML = msg;

    setTimeout(() => {
        removeSuccessMsg(boxId);
    }, 3500);

}

function registerFunc() {

    const boxId = 1;

    var registerForm = document.querySelector('#registerForm');
    var submitBtn = document.querySelector('#registerSubmitBtn');

    submitBtn.innerHTML = "Creating Profile...";
    submitBtn.style.opacity = ".7";

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/users/register', true);
    xhr.setRequestHeader("Content-type", "application/JSON");
    xhr.onreadystatechange = function() {
        if (this.readyState == 4) {
            switch (this.status) {
                case 200:

                    displaySuccessMsg("Registration Successful", boxId)
                    setTimeout(() => {
                        window.open('rooms', '_self');
                    }, 3600);

                    registerForm.reset();

                    break;

                case 400:

                    displayErrorMsg(this.responseText, boxId);

                    break;

                case 500:

                    displayErrorMsg('Sorry, something went wrong');

                    break;

                default:

                    displayErrorMsg('Sorry, something went wrong');

                    break;
            }

            submitBtn.innerHTML = "Create Profile";
            submitBtn.style.opacity = "1";

        }
    }
    var data = {
        Username: registerForm.elements['Username'].value,
        Email: registerForm.elements['Email'].value,
        Telephone: registerForm.elements['Telephone'].value,
        Password: registerForm.elements['Password'].value,
        Age: registerForm.elements['Age'].value,
        Case: registerForm.elements['Case'].value,
        Assigned_Therapist: registerForm.elements['Assigned_Therapist'].value
    };
    xhr.send(JSON.stringify(data));

    return false;

}


function loginFunc() {

    const boxId = 2;

    var loginForm = document.querySelector('#loginForm');
    var submitBtn = document.querySelector('#loginSubmitBtn');

    submitBtn.innerHTML = "Validating...";
    submitBtn.style.opacity = ".7";

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/users/login', true);
    xhr.setRequestHeader("Content-type", "application/JSON");
    xhr.onreadystatechange = function() {
        if (this.readyState == 4) {
            switch (this.status) {
                case 200:

                    displaySuccessMsg("Logged In Successfully", boxId)
                    setTimeout(() => {
                        window.open('rooms', '_self');
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

                    displayErrorMsg('Sorry, something went wrong');

                    break;
            }

            submitBtn.innerHTML = "Login";
            submitBtn.style.opacity = "1";

        }
    }
    var data = { 'Email': loginForm.elements['Email'].value, 'Password': loginForm.elements['Password'].value };
    xhr.send(JSON.stringify(data));

    return false;

}

function logout() {

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'users/logout', true);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            window.open('index', '_self');
        }
    }
    xhr.send();

}

// inserts the client id to the report modal
function reportClient(cId) {

    var clientEmail = document.querySelector('#cEmail' + cId).textContent;
    var reportForm = document.querySelector('#reportForm');

    reportForm.elements['clientEmail'].value = clientEmail;

}

function reportFunc(TherapistId) {

    const boxId = 3;

    var reportForm = document.querySelector('#reportForm');
    var modalClose = document.querySelector('#reportModal');

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/t/report', true);
    xhr.setRequestHeader('content-type', 'application/json');
    xhr.onreadystatechange = function() {
        if (this.readyState == 4) {

            switch (this.status) {
                case 200:

                    displaySuccessMsg("Report has been filed.", boxId);

                    // lol, this window.btn is a variable i exposed onclick of the actuall button
                    window.btn.innerHTML = "pending...";
                    window.btn.disabled = true;
                    setTimeout(() => {
                        modalClose.click()
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
    }
    var data = {
        TherapistId: TherapistId,
        clientEmail: reportForm.elements['clientEmail'].value,
        Case: reportForm.elements['reason'].value,
        Case_Description: reportForm.elements['description'].value
    };
    xhr.send(JSON.stringify(data));

    return false;

}

function regTherapistFunc() {

    const boxId = 4;

    var registerForm = document.querySelector('#regTherapistForm');
    var submitBtn = document.querySelector('#regTherapistSubmitBtn');

    var modalClose = document.querySelector('#regTherapistModal');

    submitBtn.innerHTML = "Adding Therapist...";
    submitBtn.style.opacity = ".7";

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/a/register', true);
    xhr.setRequestHeader("Content-type", "application/JSON");
    xhr.onreadystatechange = function() {
        if (this.readyState == 4) {
            switch (this.status) {
                case 200:

                    displaySuccessMsg("New therapist added succesfully", boxId)
                    setTimeout(() => {
                        modalClose.click();
                    }, 3600);

                    registerForm.reset();

                    break;

                case 400:

                    displayErrorMsg(this.responseText, boxId);

                    break;

                case 500:

                    displayErrorMsg('Sorry, something went wrong');

                    break;

                default:

                    displayErrorMsg('Sorry, something went wrong');

                    break;
            }

            submitBtn.innerHTML = "Add Therapist";
            submitBtn.style.opacity = "1";

        }
    }
    var data = {
        First_Name: registerForm.elements['First_Name'].value,
        Last_Name: registerForm.elements['Last_Name'].value,
        Email: registerForm.elements['Email'].value,
        Telephone: registerForm.elements['Telephone'].value,
        Password: registerForm.elements['Password'].value,
        Sex: registerForm.elements['Sex'].value,
        Specialization: registerForm.elements['Specialization'].value
    };
    xhr.send(JSON.stringify(data));

    return false;

}

function modHeight(id) {

    var chatsFeed = document.querySelector('#chatsIn-' + id);
    var msgBox = document.querySelector('#msgIn-' + id);

    if (msgBox.clientHeight > 36) {
        chatsFeed.style.height = '479px';
    } else {
        chatsFeed.style.height = '500px';
    }

}

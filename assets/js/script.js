// there may be several pages that needs sockets so this function will be called on the body.onload from the html
function init() {
    
    const socket = io();

    socket.on('ack_rooms', (status) => {

        function createMsg(data) {

            var chats = document.getElementById("chatsIn-"+data.RoomId);
    
            var item = document.createElement('li');
            item.textContent = data.Message;
            chats.appendChild(item);

        }

        if (status == 'success') {

            var btn = document.getElementsByClassName('msgbtn');

            for (let index = 0; index < btn.length; index++) {
                const content = btn[index];

                const data = content.name.split(', ');
                    
                const room = data[0];
                const speaker = data[1];

                content.onclick = function() {

                    // check if i can access the message above

                    var msg = document.getElementById("msgIn-"+room).value.trim();

                    if (msg != '') {

                        const data2 = {Message: msg, RoomId: room, SpokesPerson: speaker}; // cant assign to a constant variable
                        socket.emit('chat_message', data2);

                        createMsg(data2);
                    }

                    document.getElementById("msgIn-"+room).value = '';

                }

            }

            socket.on('msg', function (data) {

                createMsg(data);
                
                data.status = "delivered";
                socket.emit("message_status", data);
            })

        } else {
            // find a better solution to this
            location.reload();
        }

    })

}

function removeErrorMsg(boxId) {
    
    var errorContainer = document.querySelector('#errorBox'+boxId);

    errorContainer.classList.add('hide');
    errorContainer.classList.remove('shake');
    errorContainer.innerHTML = '';

}

function removeSuccessMsg(boxId) {
    
    var errorContainer = document.querySelector('#successBox'+boxId);

    errorContainer.classList.add('hide');
    errorContainer.classList.remove('shake');
    errorContainer.innerHTML = '';

}

function displayErrorMsg(msg, boxId) {
    
    var errorContainer = document.querySelector('#errorBox'+boxId);

    errorContainer.classList.remove('hide');
    errorContainer.classList.add('shake');
    errorContainer.innerHTML = msg;

    setTimeout(() => {
        removeErrorMsg(boxId);
    }, 3500);

}

function displaySuccessMsg(msg, boxId) {
    
    var errorContainer = document.querySelector('#successBox'+boxId);

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
    xhr.onreadystatechange = function () {
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
    xhr.onreadystatechange = function () {
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
    var data = {'Email': loginForm.elements['Email'].value, 'Password': loginForm.elements['Password'].value};
    xhr.send(JSON.stringify(data));

    return false;

}

function logout() {
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'users/logout', true);
    xhr.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            window.open('index', '_self');
        }
    }
    xhr.send();

}

// inserts the client id to the report modal
function reportClient(cId) {
    
    var clientEmail = document.querySelector('#cEmail'+cId).textContent;
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
    xhr.onreadystatechange = function () {
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
    xhr.onreadystatechange = function () {
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
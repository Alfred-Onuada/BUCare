
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
                        socket.emit('chat message', data2);

                        createMsg(data2);
                    }

                    document.getElementById("msgIn-"+room).value = '';

                }

            }

            socket.on('msg', function (data) {

                createMsg(data);
                
                data.status = "delivered";
                socket.emit("message status", data);
            })

        } else {
            // find a better solution to this
            location.reload();
        }

    })

}

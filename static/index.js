// TODO
// attach file to msg (or something? . . . )
// make it look good

document.addEventListener('DOMContentLoaded', () => {

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    var displayName = localStorage.getItem('displayName');
    var currChannel = localStorage.getItem('currChannel');
    if (!currChannel) {
        currChannel = "Welcome!";
        localStorage.setItem("currChannel", currChannel);
    }

    // When connected, configure event handlers
    socket.on('connect', () => {
        socket.emit('join', currChannel);
        document.querySelector('#displayName').value = displayName;
        
        enableSendButton();

        document.querySelector('#displayName').onkeyup = () => {
            localStorage.setItem('displayName', document.querySelector('#displayName').value);
            enableSendButton();
        };
        
        document.querySelector('#sendText').onkeyup = () => {
            enableSendButton();
        };

        document.querySelector('#newChannelButton').onclick = () => {
            const newChan = prompt("New Channel Name?");
            if (newChan) {
                let currOptions = getChannelList(document.querySelector("#changeChannel"));

                if (!currOptions.includes(newChan)) {
                    socket.emit('newChannel', {'channelName': newChan});
                    currChannel = newChan;
                    localStorage.setItem("currChannel", newChan);
                    socket.emit('setChannel', {'channelName': newChan});
                } else {
                    window.alert(`Channel name ${newChan} already in use.`)
                }
            } else {
                window.alert("You must supply a channel name.")
            }
        };
        
        document.querySelector('#changeChannel').onchange = () => {
            const newChannelName = document.querySelector('#changeChannel').value;
            console.log(`set channel to: ${newChannelName}`);
            localStorage.setItem("currChannel", newChannelName);
            currChannel = newChannelName;
            socket.emit('setChannel', {'channelName': newChannelName});
        };
        
        document.querySelector('#sendTextButton').onclick = () => {
            let newText = document.querySelector('#sendText').value;
            document.querySelector('#sendText').value = "";
            enableSendButton();
            let newMsg = {"chan": currChannel,
                          "text": newText, 
                          "from": document.querySelector('#displayName').value
                         }
            console.log(`send message: ${newMsg}`);
            socket.emit('sendMsg', newMsg);
        };
        
        // would like to be clear on how to do this with arrow functions. . . 
        document.querySelector('#sendText').addEventListener("keyup", function (event) {
            event.preventDefault();
            if (event.keyCode === 13) {
                // Trigger the button element with a click
                document.querySelector('#sendTextButton').click();
            }
        });
        
        // when someone uploads a file, we do the upload and then send a message with
        // the URL.  It would be nice if we could do it all in a single HTTP transaction,
        // but I don't know how.
        document.getElementById("filename").onchange = () => {
            let filename = document.getElementById("filename").files[0].name;
            document.getElementById("upload").submit();
            let newMsg = {"chan": currChannel,
              "text": "file <a href='" + "uploads/" + filename +"'> " + filename + "</a> uploaded.", 
              "from": document.querySelector('#displayName').value
             }
            console.log(`send message: ${newMsg}`);
            socket.emit('sendMsg', newMsg);
        };

    });
    
    // When we join the chat server, it sends us a list of current channels, and the last 100 msgs
    // on our current channel
    socket.on('welcome', data => {
        console.log(`welcome received, data is ${data}`);
        for (let nxt = 0; nxt < data.length - 1; nxt++) {
            addSelectOptionUnique(document.querySelector("#changeChannel"), data[nxt]); 
        };
        setSelectedChannel(document.querySelector("#changeChannel"), currChannel);
        msgList = data[data.length - 1];
        setChatText(msgList);

    });

    // When a new message is received
    socket.on('new msg', data => {
        console.log(`date=${data}`)
        
        if (data["chan"] == currChannel) {
            //document.querySelector('#chatText').value += data["text"] + "\n"; 
            chatText = document.querySelector('#chatText');
            chatText.innerHTML = chatText.innerHTML + data["text"] + " <span class='dateformat'>" + data["from"] + " " + data["time"] + "</span><br />";  
            chatText.scrollTop = chatText.scrollHeight - chatText.clientHeight;
        }
    });
    
    // When a new channel is created, add it to the option list if we don't already have it
    // this allows the server to recreate a channel if a client joins with a remembered channel
    // name that the server no longer knows because it's been restarted.
    socket.on('channel added', data => {
        addSelectOptionUnique(document.querySelector("#changeChannel"), data); 
        setSelectedChannel(document.querySelector("#changeChannel"), currChannel);
    });

    // when the channel is changed, the server sends the saved messages for the new channel
    socket.on('channel changed', data => {
        console.log("changed channel msg received");
        setChatText(data);
    });
    
    // Enable 'send' msg' button only if there is a display name present in the input field
    function enableSendButton() {
        if (document.querySelector('#displayName').value.length > 0  && document.querySelector('#sendText').value.length > 0)
            document.querySelector('#sendTextButton').disabled = false;
        else
            document.querySelector('#sendTextButton').disabled = true;
    }
    
    // will add newOption to selectControl if it isn't there already
    function addSelectOptionUnique(selectControl, newOption) {
      let currOptions = getChannelList(selectControl);

      if (!currOptions.includes(newOption)) {
         let newChannel = document.createElement('option');
         newChannel.textContent = newOption;
         selectControl.appendChild(newChannel);
      };
    }
    
    function getChannelList(selectControl) {
        let optionsList = selectControl.getElementsByTagName("option");
        let currOptions = [];
        for (let nxt = 0; nxt < optionsList.length; nxt++) {
            currOptions.push(optionsList[nxt].textContent);
        }; 
        return currOptions;
    }
    
    function setSelectedChannel(selectControl, selectedItem) {
        let optionsList = selectControl.getElementsByTagName("option");
        for (var nxt = 0; nxt < optionsList.length; nxt++) {
             if (optionsList[nxt].textContent == selectedItem) {
                 optionsList[nxt].selected = true;
             } else {
                 optionsList[nxt].selected = false;
             }
        }
    }
    
    function setChatText(msgList) {
        let textLines = "";
        for (let nxt = 0; nxt < msgList.length; nxt++) {
            textLines += msgList[nxt].text + " <span class='dateformat'>" + msgList[nxt].from + " " + msgList[nxt].time + "</span><br />"; 
        }
        let chatText = document.querySelector('#chatText')
        chatText.innerHTML = textLines;
        chatText.scrollTop = chatText.scrollHeight - chatText.clientHeight;
        console.log("updated textArea.value")
    }
    
});

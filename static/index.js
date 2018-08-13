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
        enableNewChannelButton();

        document.querySelector('#displayName').onkeyup = () => {
            localStorage.setItem('displayName', document.querySelector('#displayName').value);
            enableSendButton();
        };
        
        document.querySelector('#sendText').onkeyup = () => {
            enableSendButton();
        };

        document.querySelector('#newChannelName').onkeyup = () => {
            enableNewChannelButton();
        };

        document.querySelector('#newChannelButton').onclick = () => {
                const channelName = document.querySelector('#newChannelName').value;
                console.log(`new channel: ${channelName}`);
                socket.emit('newChannel', {'channelName': channelName});
        };
        
        document.querySelector('#changeChannel').onclick = () => {
                const newChannelName = document.querySelector('#changeChannel').value;
                console.log(`set channel to: ${newChannelName}`);
                localStorage.setItem("currChannel", newChannelName);
                socket.emit('setChannel', {'channelName': newChannelName});
        };
        
        document.querySelector('#sendTextButton').onclick = () => {
                let newText = document.querySelector('#sendText').value;
                let newMsg = {"chan": currChannel,
                              "text": newText, 
                              "from": document.querySelector('#displayName').value
                             }
                console.log(`send message: ${newMsg}`);
                socket.emit('sendMsg', newMsg);
        };

    });
    
    // When we join the chat server, it sends us a list of current channels, and the last 100 msgs
    // on our current channel
    // TODO: select current channel. . . 
    // TODO: display messages for current channel
    socket.on('welcome', data => {
        console.log(`welcome received, data is ${data}`);
        for (let nxt = 0; nxt < data.length - 1; nxt++) {
            addSelectOptionUnique(document.querySelector("#changeChannel"), data[nxt]); 
        };
        msgList = data[data.length - 1];
        let chatText = "";
        for (let nxt = 0; nxt < msgList.length; nxt++) {
                console.log("add line " + msgList[nxt]);
                chatText += msgList[nxt]["text"];
                chatText += "\n";
        }
        document.querySelector('#chatText').value = chatText;

    });

    // When a new message is received
    socket.on('new msg', data => {
        // TODO - append to display if msg is part of current channel
        console.log(data)
        
        if (data["chan"] === currChannel) {
            document.querySelector('#chatText').value += data["text"] + "\n";    
        }
    });
    
    // When a new channel is created, add it to the option list if we don't already have it
    // this allows the server to recreate a channel if a client joins with a remembered channel
    // name that the server no longer knows because it's been restarted.
    socket.on('channel added', data => {
        addSelectOptionUnique(document.querySelector("#changeChannel"), data); 
        /*
        let newChannel = document.createElement('option');
        console.log(`add new channel ${data}`)
        newChannel.textContent = data;
        document.querySelector('#changeChannel').appendChild(newChannel);
        */
    });

    // TODO: common code to display list of messages, used for join and also chanaged channel
    socket.on('channel changed', data => {
        let textArea = document.querySelector('#chatText');
        console.log(`changed channel msg received: ${data}`);
        //channels = {"Welcome!": [{"text":"Welcome to FlackChat!", "from":"admin", "time":""}, ]}
        let chatText = "";
        for (let nxt = 0; nxt < data.length; nxt++) {
            console.log("add line " + data[nxt].text);
            chatText += data[nxt].text;
            chatText += "\n";
        }
        textArea.value = chatText;
    });
    
    // Enable 'send' msg' button only if there is a display name present in the input field
    function enableSendButton() {
        if (document.querySelector('#displayName').value.length > 0  && document.querySelector('#sendText').value.length > 0)
            document.querySelector('#sendTextButton').disabled = false;
        else
            document.querySelector('#sendTextButton').disabled = true;
    }

    function enableNewChannelButton() {
        if (document.querySelector('#newChannelName').value.length > 0)
            document.querySelector('#newChannelButton').disabled = false;
        else
            document.querySelector('#newChannelButton').disabled = true;
    }
    
    // will add newOption to selectControl if it isn't there already
    function addSelectOptionUnique(selectControl, newOption) {
      let optionsList = selectControl.getElementsByTagName("option");
      let currOptions = [];
      for (let nxt = 0; nxt < optionsList.length; nxt++) {
        currOptions.push(optionsList[nxt].textContent);
      };

      if (!currOptions.includes(newOption)) {
         let newChannel = document.createElement('option');
         newChannel.textContent = newOption;
         selectControl.appendChild(newChannel);
      };
    }        
});

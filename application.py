import os
import requests
from datetime import datetime

from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

def timeStamp():
    return "{:%m/%d/%y %X}".format(datetime.now())

channels = { "Welcome!":  [{"text":"Welcome to FlackChat!", "from":"admin", "time": timeStamp()}]}

@app.route("/")
def index():
    return render_template("index.html")

# client sends 'join' when it starts up -- joins with channel name saved in browser, defaults to Welcome!
# server responds with 'welcome', with a list of channels, and a list of the messages for the channel that the
# client joined, sent to joining client only
@socketio.on("join")
def join(joinChan):
    # What if client joins with non-existent channel name? (as in case
    # when server restarts but browser remembers old name) My solution is to make a new
    # channel, and tell other clients that there's a new channel
    ret = []
    if joinChan not in channels:
        channels[joinChan] = []
        emit("channel added", joinChan, broadcast=True)
    
    # make list of channels
    for nxt in channels:
        ret.append(nxt);
    # add messages for the channel the user joined on
    ret.append(channels[joinChan])
    print(f"all channel info {channels}")
    print(f"client joined channel {joinChan}")
    print(f"sending {ret} to client")
    emit("welcome", ret, broadcast=False)    
        

@socketio.on("newChannel")
# client sends 'newChannel' when it creates a channel.  This routine is also used when server needs
# to recreate a channel that a client thinks is there.  Broadcasts 'channel added' with new
# channel name to all clients
def newChannel(data):
    newName = data["channelName"]
    print(f"newChannel: {newName}")
    if newName in channels:
        # TODO - return error if name in use (shouldn't happen tho. . . )
    	print(f"name {newName} already in use")
    else:
    	channels[newName] = []
    	emit("channel added", newName, broadcast=True)

# client sends 'setChannel' when channel is set
# server responds with 'channel changed', and the current messages on that channel, only to the client
# that changed channels
@socketio.on("setChannel")
def setChannel(data):
    newName = data["channelName"]
    print(f"setChannel: {newName}")
    if newName not in channels:
        # create channel if it doesn't exist -- for instance, if server restarted but client still in chat
        print(f"name {newName} doesn't exist")
        newChannel(data)
    else:
        print(f"sending {channels[newName]} to client")
        emit("channel changed", channels[newName], broadcast=False)

# client sends 'sendMsg' with channel, text, sender name, server adds timestamp
# and broadcasts 'new msg' to all clients.  It's up to the client to discard messages on channels that
# it isn't interested in
@socketio.on("sendMsg")
def sendMsg(data):
    now = timeStamp()
    print(f"current state of channels: {channels}")
    print(f"client sent us data: {data}")
    thisChannel = data["chan"]
    thisMsg = data["text"]
    data["time"] = now
 
    if thisChannel not in channels:
        # create channel if it doesn't exist -- for instance, if server restarted but client still in chat
        print(f"name {thisChannel} doesn't exist")
        newChannel(thisChannel)
    channels[thisChannel].append({"text": thisMsg, "from" : data["from"], "time" : now})

    # TODO: add time stamp to msg
    # TODO: limit to 100 msgs
    while len(channels[thisChannel]) > 5:
        #print("exceeded max # of messages per channel, deleting " + channels[thisChannel][0])
        channels[thisChannel] = channels[thisChannel][1:]
    print(f"about to broadcast, new state of channels: {channels}")
    emit("new msg", data, broadcast=True)
    



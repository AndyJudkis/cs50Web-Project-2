import os
import requests

from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

channels = { "Welcome!":  [{"text":"Welcome to FlackChat!", "from":"admin", "time":""}]}

@app.route("/")
def index():
    return render_template("index.html")

@socketio.on("join")
def join(data): 
    # What if client joins with non-existent channel name? (as in case
    # when server restarts but browser remembers old name) My solution is to make a new
    # channel, and tell other clients that there's a new channel
    ret = []
    if data not in channels:
        channels[data] = []
        emit("channel added", data, broadcast=True)
    
    # make list of channels
    for nxt in channels:
        ret.append(nxt);
    # add messages for the channel the user joined on
    ret.append(channels[data])
    print(f"client joined channel {data}")
    print(f"returning: {ret}")
    emit("welcome", ret, broadcast=False)    
        

@socketio.on("newChannel")
def newChannel(data):
    newName = data["channelName"]
    print(f"newChannel: {newName}")
    if newName in channels:
        # TODO - return error if name in use (shouldn't happen tho. . . )
    	print(f"name {newName} already in use")
    else:
    	channels[newName] = []
    	emit("channel added", newName, broadcast=True)

@socketio.on("setChannel")
def setChannel(data):
    newName = data["channelName"]
    print(f"setChannel: {newName}")
    print(channels[newName])
    if newName not in channels:
        # TODO - return error if channel doesn't exist
        # or better to just create it?
    	print(f"name {newName} doesn't exist")
    else:
    	emit("channel changed", channels[newName], broadcast=False)
        
@socketio.on("sendMsg")
def sendMsg(data):
    thisChannel = data["chan"]
    thisMsg = data["text"]
    # TODO: add time stamp to msg
    # TODO: limit to 100 msgs
    channels[thisChannel].append({"text": thisMsg, "from" : data["from"], "date" : ""})
    print(channels[thisChannel])
    while len(channels[thisChannel]) > 5:
        #print("exceeded max # of messages per channel, deleting " + channels[thisChannel][0])
        channels[thisChannel] = channels[thisChannel][1:]
    emit("new msg", data, broadcast=True)
    



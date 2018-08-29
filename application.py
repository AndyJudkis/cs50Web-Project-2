import os
import requests
from datetime import datetime

from flask import Flask, jsonify, render_template, request, flash, redirect, url_for
from flask_socketio import SocketIO, emit

from werkzeug.utils import secure_filename

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = set(['txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif'])

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
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

    # TODO: limit to 100 msgs
    while len(channels[thisChannel]) > 100:
        #print("exceeded max # of messages per channel, deleting " + channels[thisChannel][0])
        channels[thisChannel] = channels[thisChannel][1:]
    print(f"about to broadcast, new state of channels: {channels}")
    emit("new msg", data, broadcast=True)
    

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    
# accept a file upload here
# code comes from http://flask.pocoo.org/docs/1.0/patterns/fileuploads/
@app.route('/upload', methods=['POST'])
def upload_file():
    print("method=" + request.method)
    if request.method == 'POST':
        # check if the post request has the file part
        if 'file' not in request.files:
            print('No file part')
            return "No filename specified"
        file = request.files['file']
        # if user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            print('No selected file')
            return "No filename specified"
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            print("save it as " + filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            data = {"text":"uploaded <a href=" + filename + ">" + filename + "</a>", "chan" : "foo", "from" : "test", "time":"whenever"}
            # this next line is a kluge -- it would be nice to just emit a new message to all the clients about
            # the newly uploaded file, but I couldn't figure out how to collect the username and channel info 
            # along witht the filename.  Flask apparently requires you to return -something- so I did this.
            # after the file successfully uploads, the client sends a message with all the info, that is broadcast
            return "file " + filename + ' uploaded successfully. <a href="/"> Return to AndyChat </a>'
        
# serve an uploaded file here
@app.route('/<path:path>', methods=['GET'])
def static_file(path):
    print("static file, path=" + path)
    return app.send_static_file(path)
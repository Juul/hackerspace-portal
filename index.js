
var $ = require('jquery-browserify');

navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

var server = null;
var pc = null; // peerconnection

var settings = {
    serverURL: 'ws://localhost:3000/',
    room: 'hackerspaces',
    iceServers: [
        "stun:stun.l.google.com:19302"
    ]
};

var localStream = null;

function fail(err) {
    console.error(err);
//    $('body').html("Error:" + err);
}

function showStream(element, stream) {
    var createSrc = window.URL ? 
        window.URL.createObjectURL : 
        function(stream) {
            return stream;
        };

    var v = $(element)[0];
    v.src = createSrc(stream);
    v.play(); 
}

function beginStreaming() {

    if(!navigator.getUserMedia) {
        return fail("Your browser does not support getUserMedia");
    }
    
    navigator.getUserMedia({
        audio: true,
        video: true
    }, function(stream) {
        console.log("got local stream");
        showStream('#localVideo', stream);
        remoteConnect(stream);
    }, function(err) {
        fail(err);
    });

}

function remoteConnect(localStream) {
    pc = new RTCPeerConnection({
        iceServers: [{urls: settings.iceServers}]
    });

    pc.onicecandidate = function(e) {
        if(e.candidate == null) {
            return;
        }
        server.send(JSON.stringify({
            'ice': e.candidate
        }));
    };

    // called when we get a remote stream
    pc.onaddstream = function(e) {
        console.log("got remote stream");
        showStream('#remoteVideo', e.stream);
    };

    pc.addStream(localStream);
}

function gotDescription(desc) {
    
    console.log('got description');
    
    pc.setLocalDescription(desc, function () {
        
        console.log("sent SDP message");
        server.send(JSON.stringify({
            'sdp': desc
        }));
        
    }, function(err) {
        return fail(err)
    });
}

function initiateStream() {
    pc.createOffer(gotDescription, function(err) {
        return fail(err);
    });
}

function gotMessage(o) {
    if(!pc) {
        return console.error("got message before peerconnection was up: ", o);
    }

    var msg = JSON.parse(o.data);

    if(msg.sdp) {
        console.log("got SDP message");
        pc.setRemoteDescription(new RTCSessionDescription(msg.sdp), function() {
            pc.createAnswer(gotDescription, function(err) {
                return fail(err);
            });
        }, function(err) {
            return fail(err);
        });
    } else if(msg.ice) {
        console.log("got ICE candidate");
        pc.addIceCandidate(new RTCIceCandidate(msg.ice));
    }
}

function init() {

    server = new WebSocket(settings.serverURL);
    server.onmessage = gotMessage;
    server.onopen = function() {
        console.log("websocket connection established!");
    };

    beginStreaming();

    $('#startButton').click(initiateStream);

}

$(document).ready(init);

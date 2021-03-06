


$(document).ready(function() {

  var peer = new Peer({
    // Set API key for cloud server (you don't need this if you're running your
    // own.
    // key: 'x7fwx2kavpy6tj4i',

    debug: 3, // Set highest debug level (log everything!).
    host: "localhost",
    path: "/peerServer",
    port: 9000,

    // Set a logging function:
    logFunction: function() {
      //Where does the arguments call from?

      var copy = Array.prototype.slice.call(arguments).join(' ');
      $('.log').append(copy + '<br>');

      // console.log("arguments: ",arguments);
      if(arguments[0]=="Invalid server message"){
          // console.log(JSON.parse(arguments[1]));
      }

      if(arguments.length > 2){
        try{
            if(arguments[2].type === 'REQUEST'){
              connectToPeer(arguments[2].src);
            }else if(arguments[2].type === 'LEADER'){
              initiateLeader();
            }
        }catch(e){
          console.log(arguments);
        }

      }
    }
  });

  var connectedPeers = {},
      clientId = "",
      isLeader = false;



  // Show this peer's ID.
  peer.on('open', function(id){
    console.log("id: ",id);
    $('#pid').text(id);
    clientId = id;
    contactServer('url', JSON.stringify({type:'URL',url:window.location.href, id:id}));
  });

  // Await connections from others
  peer.on('connection', connect);

  peer.on('error', function(err) {
    console.log(err);
  })

  peer.on('url', function(url){
    console.log("peer getting url");
  });

  ////////////////// helper functions //////////////////
  function initiateLeader(){
    console.log("I AM A LEADER!");
    isLeader = true;
  }
  function contactServer(type, message){
    //message should be a valid stringified JSON object
    //._socket is the webServerSocket peer is connected to
    peer.socket._socket.send(message);

    //** Native WebSocket DOES NOT have a function called emit
    //unlike a lot of socket libraries (socket.io)
    //Only available in send(), which is automatically typed to 'message'
    // peer.socket._socket.emit(type, message);
  };

  function connectToPeer(requestedPeer){
    if (!connectedPeers[requestedPeer]) {
      // Create a connection
      var c = peer.connect(requestedPeer, {
        label: 'data',
        serialization: 'none',
        metadata: {message: 'new connection!'}
      });
      c.on('open', function() {
        connect(c);
      });
      c.on('error', function(err) { alert(err); });
    }
    connectedPeers[requestedPeer] = 1;
  }


  // Connect to a peer
  $('#connect').click(function() {
    var requestedPeer = $('#rid').val();
    connectToPeer(requestedPeer);

  });

  // Close a connection.
  $('#close').click(function() {
    eachActiveConnection(function(c) {
      c.close();
    });
  });

  $('#send').submit(function(e) {
    e.preventDefault();
    // For each active connection, send the message.
    var msg = $('#text').val();
    $('#received').append('<p class="you">You :  ' + msg + '</p>');
    eachActiveConnection(function(c, $c) {
      if (c.label === 'data') {
        c.send(msg);
      }
    });
    $('#text').val('');
    $('#text').focus();
  });

  // Handle a connection object.
  // this method every time a message from a connection came
  function connect(c) {
    console.log("into connect");
    // Handle a chat connection.
    if (c.label === 'data') {
      // console.log(connectedPeers);
      c.on('data', function(data) {
        $('#received').append('<p>'+c.peer+' :  ' + data + '</p>');
        if(isLeader){
          eachActiveConnection(function(c, $c) {
            if (c.label === 'data') {
              c.send(data);
            }
          });
        }
          c.on('close', function() {
            $('#received').append('<p>----'+c.peer+' disconnected -----</p>');
            // alert(c.peer + ' has left the chat.');
            delete connectedPeers[c.peer];
            return;
          });
      });
    }
    connectedPeers[c.peer] = 1;
  }

  // Goes through each active peer and calls FN on its connections.
  function eachActiveConnection(fn) {
  var checkedIds = {};
    for(pid in connectedPeers){
      if (!checkedIds[pid]) {
        var conns = peer.connections[pid];
        for (var i = 0, ii = conns.length; i < ii; i += 1) {
          var conn = conns[i];
          fn(conn, $(this));
        }
      }
      checkedIds[pid] = 1;
    }

  }

  // Show browser version
  $('#browsers').text(navigator.userAgent);
});

// Make sure things clean up properly.

window.onunload = window.onbeforeunload = function(e) {
  if (!!peer && !peer.destroyed) {
    peer.destroy();
  }
};

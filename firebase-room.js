(function() {
    const WORKER_HOST = 'cozy-room.sda-company-00c.workers.dev';
    const APP_TOKEN = 'CozyPixelStudyRoomSecret2026!';

    function addTokenToUrl(url) {
        try {
            var u = new URL(url, location.href);
            u.searchParams.set('x-app-token', APP_TOKEN);
            return u.toString();
        } catch(e) { return url; }
    }

    function addTokenToHeaders(headers) {
        if (!headers) return {};
        if (headers instanceof Headers) {
            headers.set('X-App-Token', APP_TOKEN);
        } else if (typeof headers === 'object') {
            headers['X-App-Token'] = APP_TOKEN;
        }
        return headers;
    }

    var origFetch = window.fetch;
    window.fetch = function(resource, init) {
        if (typeof resource === 'string' && resource.indexOf(WORKER_HOST) !== -1) {
            init = init || {};
            init.headers = addTokenToHeaders(init.headers || {});
            resource = addTokenToUrl(resource);
        }
        return origFetch.call(this, resource, init);
    };

    var OrigWS = window.WebSocket;
    function PatchedWS(url, protocols) {
        if (typeof url === 'string' && url.indexOf(WORKER_HOST) !== -1) {
            url = addTokenToUrl(url);
        }
        if (protocols !== undefined) {
            return new OrigWS(url, protocols);
        }
        return new OrigWS(url);
    }
    PatchedWS.CONNECTING = OrigWS.CONNECTING;
    PatchedWS.OPEN = OrigWS.OPEN;
    PatchedWS.CLOSING = OrigWS.CLOSING;
    PatchedWS.CLOSED = OrigWS.CLOSED;
    PatchedWS.prototype = OrigWS.prototype;
    window.WebSocket = PatchedWS;

    var OrigXHR = window.XMLHttpRequest;
    var origOpen = OrigXHR.prototype.open;
    var origSend = OrigXHR.prototype.send;
    OrigXHR.prototype.open = function(method, url) {
        this._mpUrl = url;
        if (typeof url === 'string' && url.indexOf(WORKER_HOST) !== -1) {
            arguments[1] = addTokenToUrl(url);
        }
        return origOpen.apply(this, arguments);
    };
    OrigXHR.prototype.send = function() {
        if (this._mpUrl && this._mpUrl.indexOf(WORKER_HOST) !== -1) {
            this.setRequestHeader('X-App-Token', APP_TOKEN);
        }
        return origSend.apply(this, arguments);
    };
})();

(function(){var FIREBASE_CONFIG={apiKey:"AIzaSyBTVfM8iow9Mqp49yB_esahJcGt5cRiNYo",authDomain:"cozy-room-8ebb7.firebaseapp.com",databaseURL:"https://cozy-room.sda-company-00c.workers.dev",projectId:"cozy-room-8ebb7",storageBucket:"cozy-room-8ebb7.firebasestorage.app",messagingSenderId:"128763332110",appId:"1:128763332110:web:f0b6dda08396f41ab89e5f"};
function waitForFirebase(cb){if(typeof firebase!=='undefined'&&firebase.apps!==undefined){cb();}else{setTimeout(function(){waitForFirebase(cb);},100);}}
function sanitizeKey(s){return String(s).replace(/[.#$\[\]/]/g,'_');}
waitForFirebase(function(){if(!firebase.apps.length){firebase.initializeApp(FIREBASE_CONFIG);}var db=firebase.database();var currentRoomId=null;var isMultiplayer=false;var isHost=false;var emptyRoomTimer=null;
window.isInMultiplayer=function(){return isMultiplayer;};window.getCurrentRoomId=function(){return currentRoomId;};window.getIsHost=function(){return isHost;};window.getRoomMeta=async function(roomId){var snap=await db.ref('rooms/'+roomId+'/meta').get();return snap.exists()?snap.val():null;};window.setIsHost=function(val){isHost=val;};window.rejoinRoom=async function(roomId,userName,isHostUser){currentRoomId=roomId;isMultiplayer=true;isHost=!!isHostUser;await joinRoomInternal(roomId,sanitizeKey(userName),isHostUser);};
function generateRoomId(){return Math.random().toString(36).substr(2,6).toUpperCase();}
window.hostRoom=async function(userName,password,maxMembers,allowBots){var safeName=sanitizeKey(userName);var roomId=generateRoomId();await db.ref('rooms/'+roomId).set({meta:{host:safeName,password:password,createdAt:Date.now(),maxMembers:maxMembers||10,allowBots:allowBots||false,emptyAt:0},members:{},messages:{}});currentRoomId=roomId;isMultiplayer=true;isHost=true;await joinRoomInternal(roomId,safeName,true);return roomId;};
window.joinRoom=async function(roomId,password,userName){var safeName=sanitizeKey(userName);var snap=await db.ref('rooms/'+roomId+'/meta').get();if(!snap.exists()){throw new Error('Room not found!');}var meta=snap.val();if(meta.password!==password){throw new Error('Wrong password!');}var membersSnap=await db.ref('rooms/'+roomId+'/members').get();var memberCount=membersSnap.exists()?Object.keys(membersSnap.val()).length:0;if(memberCount>=(meta.maxMembers||10)){throw new Error('Room is full!');}currentRoomId=roomId;isMultiplayer=true;isHost=false;await joinRoomInternal(roomId,safeName,false);return meta;};
async function joinRoomInternal(roomId,userName,isHostUser){var saved;try{saved=JSON.parse(localStorage.getItem('cozy_mp_session'))||{};}catch(e){saved={};}var prevTime=saved[roomId]?saved[roomId].timeSpent||0:0;var memberRef=db.ref('rooms/'+roomId+'/members/'+userName);await memberRef.set({status:'Studying',timeSpent:prevTime,lastSeen:Date.now(),isHost:isHostUser});memberRef.onDisconnect().remove();listenToRoom(roomId,userName);listenToBots(roomId);startEmptyRoomCheck(roomId);}
function startEmptyRoomCheck(roomId){if(emptyRoomTimer)clearInterval(emptyRoomTimer);emptyRoomTimer=setInterval(async function(){var snap=await db.ref('rooms/'+roomId+'/members').get();if(!snap.exists()||Object.keys(snap.val()).length===0){var metaSnap=await db.ref('rooms/'+roomId+'/meta').get();if(!metaSnap.exists())return;var meta=metaSnap.val();var emptyAt=meta.emptyAt||0;if(emptyAt===0){await db.ref('rooms/'+roomId+'/meta/emptyAt').set(Date.now());}else if(Date.now()-emptyAt>30*60*1000){await db.ref('rooms/'+roomId).remove();clearInterval(emptyRoomTimer);}}else{await db.ref('rooms/'+roomId+'/meta/emptyAt').set(0);}},180000);}
function listenToRoom(roomId,myUserName){db.ref('rooms/'+roomId+'/members').off();db.ref('rooms/'+roomId+'/members').on('value',function(snap){var members=snap.val()||{};if(window.onMultiplayerMembersUpdate)window.onMultiplayerMembersUpdate(members,myUserName);});db.ref('rooms/'+roomId+'/messages').off();db.ref('rooms/'+roomId+'/messages').orderByKey().limitToLast(30).on('child_added',function(snap){if(window.onMultiplayerMessageAdded)window.onMultiplayerMessageAdded(snap.key,snap.val());});db.ref('rooms/'+roomId+'/meta').off();db.ref('rooms/'+roomId+'/meta').on('value',function(snap){if(!snap.exists()&&window.onRoomDeleted)window.onRoomDeleted();});}
window.syncMyStatus=async function(userName,status,timeSpent){if(!currentRoomId)return;await db.ref('rooms/'+currentRoomId+'/members/'+userName).update({status:status,timeSpent:timeSpent,lastSeen:Date.now()});var saved;try{saved=JSON.parse(localStorage.getItem('cozy_mp_session'))||{};}catch(e){saved={};}saved[currentRoomId]={timeSpent:timeSpent,lastSeen:Date.now()};localStorage.setItem('cozy_mp_session',JSON.stringify(saved));};
window.sendRoomMessage=async function(text,type){if(!currentRoomId)return null;var ref=await db.ref('rooms/'+currentRoomId+'/messages').push({text:text,type:type,time:Date.now()});try{var snap=await db.ref('rooms/'+currentRoomId+'/messages').orderByKey().limitToLast(100).get();if(snap.exists()){var keys=Object.keys(snap.val());if(keys.length>50){var toRemove=keys.slice(0,keys.length-50);var updates={};toRemove.forEach(function(k){updates[k]=null;});await db.ref('rooms/'+currentRoomId+'/messages').update(updates);}}}catch(e){}return ref.key;};
window.leaveRoomGracefully=async function(userName,deleteRoom){if(!currentRoomId)return;db.ref('rooms/'+currentRoomId+'/members').off();db.ref('rooms/'+currentRoomId+'/messages').off();db.ref('rooms/'+currentRoomId+'/meta').off();db.ref('rooms/'+currentRoomId+'/bots').off();if(deleteRoom){await db.ref('rooms/'+currentRoomId).remove();}else{await db.ref('rooms/'+currentRoomId+'/members/'+userName).remove();}if(emptyRoomTimer)clearInterval(emptyRoomTimer);currentRoomId=null;isMultiplayer=false;isHost=false;};
window.syncBotState=async function(bots){if(!currentRoomId)return;await db.ref('rooms/'+currentRoomId+'/bots').set(bots);};
window.getActiveRooms=async function(roomIds){var promises=roomIds.map(async function(id){try{var snaps=await Promise.all([db.ref('rooms/'+id+'/meta').get(),db.ref('rooms/'+id+'/members').get()]);var metaSnap=snaps[0],membersSnap=snaps[1];if(!metaSnap.exists())return null;var meta=metaSnap.val();var memberCount=membersSnap.exists()?Object.keys(membersSnap.val()).length:0;return{id:id,host:meta.host,memberCount:memberCount};}catch(e){return null;}});var results=await Promise.all(promises);return results.filter(Boolean);};
function listenToBots(roomId){db.ref('rooms/'+roomId+'/bots').off();db.ref('rooms/'+roomId+'/bots').on('value',function(snap){var bots=snap.val()||{};if(window.onMultiplayerBotsUpdate)window.onMultiplayerBotsUpdate(bots);});}
});})();

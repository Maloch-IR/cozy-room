(function(){
    var SUPABASE_URL="https://vazeuvagvmetjjkyealo.supabase.co";
    var SUPABASE_ANON_KEY="sb_publishable_Ql2I-Fi3E64F6CgpfdxKKg_8nJ8N8NI";
    var supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

    var currentRoomId=null;
    var isHost=false;
    var isMultiplayer=false;
    var messageSubscription=null;
    var membersSubscription=null;
    var botsSubscription=null;
    var roomSubscription=null;
    var presenceChannel=null;

    function sanitizeKey(s){return String(s).replace(/[.#$\[\]/]/g,'_');}
    function generateRoomId(){return Math.random().toString(36).substr(2,6).toUpperCase();}

    window.isInMultiplayer=function(){return isMultiplayer;};
    window.getCurrentRoomId=function(){return currentRoomId;};
    window.getIsHost=function(){return isHost;};
    window.setIsHost=function(val){isHost=!!val;};

    window.getRoomMeta=async function(roomId){
        var result=await supabase.from('rooms').select('*').eq('id',roomId).maybeSingle();
        var room=result.data;
        var error=result.error;
        if(error||!room)return null;
        return{host:room.host_name,maxMembers:room.max_members||10,allowBots:room.allow_bots||false,password:room.password,theme:room.theme,emptyAt:room.empty_at||0};
    };

    window.hostRoom=async function(userName,password,maxMembers,allowBots){
        var safeName=sanitizeKey(userName);
        var roomId=generateRoomId();
        var theme=document.getElementById('theme-color')?document.getElementById('theme-color').value:'cyan';
        var result=await supabase.from('rooms').insert([{id:roomId,host_name:safeName,password:password||'',theme:theme,max_members:maxMembers||10,allow_bots:allowBots||false}]);
        if(result.error)throw new Error('Failed to create room');
        currentRoomId=roomId;
        isMultiplayer=true;
        isHost=true;
        await joinRoomInternal(roomId,safeName,true);
        return roomId;
    };

    window.joinRoom=async function(roomId,password,userName){
        var safeName=sanitizeKey(userName);
        var result=await supabase.from('rooms').select('*').eq('id',roomId).maybeSingle();
        var room=result.data;
        var error=result.error;
        if(error||!room)throw new Error('Room not found!');
        if(room.password&&room.password!==password)throw new Error('Wrong password!');
        var membersResult=await supabase.from('room_members').select('id').eq('room_id',roomId);
        var memberCount=membersResult.data?membersResult.data.length:0;
        if(memberCount>=(room.max_members||10))throw new Error('Room is full!');
        currentRoomId=roomId;
        isMultiplayer=true;
        isHost=false;
        await joinRoomInternal(roomId,safeName,false);
        return{host:room.host_name,maxMembers:room.max_members||10,allowBots:room.allow_bots||false};
    };

    window.rejoinRoom=async function(roomId,userName,isHostUser){
        currentRoomId=roomId;
        isMultiplayer=true;
        isHost=!!isHostUser;
        await joinRoomInternal(roomId,sanitizeKey(userName),isHostUser);
    };

    async function joinRoomInternal(roomId,userName,isHostUser){
        var saved;
        try{saved=JSON.parse(localStorage.getItem('cozy_mp_session'))||{};}catch(e){saved={};}
        var prevTime=saved[roomId]?saved[roomId].timeSpent||0:0;
        await supabase.from('room_members').upsert([{
            room_id:roomId,
            user_name:userName,
            status:'Studying',
            time_spent:prevTime,
            is_host:!!isHostUser
        }],{onConflict:'room_id,user_name'});

        initRoomRealtime(roomId);
    }

    function initRoomRealtime(roomId){
        cleanupSubscriptions();

        messageSubscription=supabase
            .channel('room_messages_'+roomId)
            .on('postgres_changes',{event:'INSERT',filter:'room_id=eq.'+roomId,schema:'public',table:'room_messages'},function(payload){
                var newMsg=payload.new;
                var key=newMsg.id;
                if(typeof window.onMultiplayerMessageAdded==='function'){
                    window.onMultiplayerMessageAdded(key,{text:newMsg.message,type:newMsg.msg_type||'system-msg'});
                }
            })
            .subscribe();

        membersSubscription=supabase
            .channel('room_members_'+roomId)
            .on('postgres_changes',{event:'*',filter:'room_id=eq.'+roomId,schema:'public',table:'room_members'},async function(){
                var membersResult=await supabase.from('room_members').select('*').eq('room_id',roomId);
                if(!membersResult.data)return;
                var membersObj={};
                membersResult.data.forEach(function(m){
                    membersObj[m.user_name]={
                        status:m.status||'Studying',
                        timeSpent:m.time_spent||0,
                        lastSeen:m.last_seen,
                        isHost:m.is_host||false
                    };
                });
                if(typeof window.onMultiplayerMembersUpdate==='function'){
                    var myUserName=null;
                    try{myUserName=JSON.parse(localStorage.getItem('cozy_session')).userName;}catch(e){}
                    window.onMultiplayerMembersUpdate(membersObj,myUserName);
                }
            })
            .subscribe();

        botsSubscription=supabase
            .channel('room_bots_'+roomId)
            .on('postgres_changes',{event:'*',filter:'room_id=eq.'+roomId,schema:'public',table:'room_bots'},async function(){
                var botsResult=await supabase.from('room_bots').select('*').eq('room_id',roomId);
                if(!botsResult.data)return;
                var botsObj={};
                botsResult.data.forEach(function(b){
                    botsObj[b.bot_name]={
                        status:b.status||'Studying',
                        timeSpent:b.time_spent||0,
                        energy:b.energy||80,
                        coffeeWaiting:b.coffee_waiting||false,
                        color:b.color||'#aaa'
                    };
                });
                if(typeof window.onMultiplayerBotsUpdate==='function'){
                    window.onMultiplayerBotsUpdate(botsObj);
                }
            })
            .subscribe();

        roomSubscription=supabase
            .channel('room_delete_'+roomId)
            .on('postgres_changes',{event:'DELETE',filter:'id=eq.'+roomId,schema:'public',table:'rooms'},function(){
                if(typeof window.onRoomDeleted==='function'){
                    window.onRoomDeleted();
                }
            })
            .subscribe();

        presenceChannel=supabase.channel('room_presence_'+roomId);
        presenceChannel.on('presence',{event:'sync'},function(){
            var state=presenceChannel.presenceState();
            var membersObj={};
            for(var key in state){
                var presences=state[key];
                for(var i=0;i<presences.length;i++){
                    var p=presences[i];
                    membersObj[p.user_name]={
                        status:p.status||'Studying',
                        timeSpent:p.timeSpent||0,
                        isHost:p.isHost||false
                    };
                }
            }
            if(typeof window.onMultiplayerMembersUpdate==='function'){
                var myUserName=null;
                try{myUserName=JSON.parse(localStorage.getItem('cozy_session')).userName;}catch(e){}
                window.onMultiplayerMembersUpdate(membersObj,myUserName);
            }
        });
        presenceChannel.subscribe(function(status){
            if(status==='SUBSCRIBED'){
                var saved;
                try{saved=JSON.parse(localStorage.getItem('cozy_mp_session'))||{};}catch(e){saved={};}
                var prevTime=saved[roomId]?saved[roomId].timeSpent||0:0;
                presenceChannel.track({
                    user_name:userName,
                    status:'Studying',
                    timeSpent:prevTime,
                    isHost:!!isHostUser
                });
            }
        });
    }

    function cleanupSubscriptions(){
        if(messageSubscription){supabase.removeChannel(messageSubscription);messageSubscription=null;}
        if(membersSubscription){supabase.removeChannel(membersSubscription);membersSubscription=null;}
        if(botsSubscription){supabase.removeChannel(botsSubscription);botsSubscription=null;}
        if(roomSubscription){supabase.removeChannel(roomSubscription);roomSubscription=null;}
        if(presenceChannel){supabase.removeChannel(presenceChannel);presenceChannel=null;}
    }

    window.syncMyStatus=async function(userName,status,timeSpent){
        if(!currentRoomId)return;
        await supabase.from('room_members').update({
            status:status,
            time_spent:Math.floor(timeSpent)
        }).eq('room_id',currentRoomId).eq('user_name',userName);
        if(presenceChannel){
            presenceChannel.track({
                user_name:userName,
                status:status,
                timeSpent:Math.floor(timeSpent),
                isHost:isHost
            });
        }
        var saved;
        try{saved=JSON.parse(localStorage.getItem('cozy_mp_session'))||{};}catch(e){saved={};}
        saved[currentRoomId]={timeSpent:timeSpent,lastSeen:Date.now()};
        localStorage.setItem('cozy_mp_session',JSON.stringify(saved));
    };

    window.sendRoomMessage=async function(text,type){
        if(!currentRoomId)return null;
        var result=await supabase.from('room_messages').insert([{
            room_id:currentRoomId,
            user_name:window.myName||'system',
            message:text,
            msg_type:type||'system-msg'
        }]).select();
        if(result.error)return null;
        var msgId=result.data[0].id;
        try{
            var countResult=await supabase.from('room_messages').select('id',{count:'exact',head:true}).eq('room_id',currentRoomId);
            var count=countResult.count||0;
            if(count>50){
                var oldResult=await supabase.from('room_messages').select('id').eq('room_id',currentRoomId).order('created_at',{ascending:true}).limit(count-50);
                if(oldResult.data&&oldResult.data.length>0){
                    var oldIds=oldResult.data.map(function(r){return r.id;});
                    await supabase.from('room_messages').delete().in('id',oldIds);
                }
            }
        }catch(e){}
        return msgId;
    };

    window.syncBotState=async function(bots){
        if(!currentRoomId)return;
        var rows=[];
        for(var name in bots){
            var b=bots[name];
            rows.push({
                room_id:currentRoomId,
                bot_name:name,
                status:b.status||'Studying',
                time_spent:Math.floor(b.timeSpent||0),
                energy:b.energy||80,
                coffee_waiting:b.coffeeWaiting||false,
                color:b.color||'#aaa'
            });
        }
        if(rows.length===0){
            await supabase.from('room_bots').delete().eq('room_id',currentRoomId);
            return;
        }
        await supabase.from('room_bots').upsert(rows,{onConflict:'room_id,bot_name'});
    };

    window.deleteAllMessages=async function(roomId){
        if(!roomId)return;
        var roomResult=await supabase.from('rooms').select('host_name').eq('id',roomId).maybeSingle();
        if(!roomResult.data||roomResult.data.host_name!==window.myName)return;
        await supabase.from('room_messages').delete().eq('room_id',roomId);
    };

    window.getActiveRooms=async function(roomIds){
        var results=[];
        for(var i=0;i<roomIds.length;i++){
            try{
                var roomResult=await supabase.from('rooms').select('*').eq('id',roomIds[i]).maybeSingle();
                var room=roomResult.data;
                if(!room)continue;
                var membersResult=await supabase.from('room_members').select('id',{count:'exact',head:true}).eq('room_id',roomIds[i]);
                var memberCount=membersResult.count||0;
                results.push({id:roomIds[i],host:room.host_name,memberCount:memberCount});
            }catch(e){}
        }
        return results;
    };

    window.leaveRoomGracefully=async function(userName,deleteRoom){
        if(!currentRoomId)return;
        cleanupSubscriptions();
        if(deleteRoom){
            var roomResult=await supabase.from('rooms').select('host_name').eq('id',currentRoomId).maybeSingle();
            if(roomResult.data&&roomResult.data.host_name===userName){
                await supabase.from('rooms').delete().eq('id',currentRoomId);
            }
        }else{
            await supabase.from('room_members').delete().eq('room_id',currentRoomId).eq('user_name',userName);
        }
        currentRoomId=null;
        isMultiplayer=false;
        isHost=false;
    };
})();

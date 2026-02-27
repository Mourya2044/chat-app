import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { useSocket } from '../../contexts/SocketContext';
import Avatar  from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { chatrooms, conversations, activeChat, openChat, onlineUsers, loadChatrooms, loadConversations } = useChat();
  const { connected } = useSocket();
  const [tab, setTab] = useState('dms');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const { data } = await axios.get(`/api/users/search?q=${q}`);
      setSearchResults(data.users);
    } catch (err) {
      console.error("Search failed", err);
    }
  };

  const startDM = async (partnerId) => {
    try {
      const { data } = await axios.post('/api/conversations', { partnerId });
      await loadConversations();
      const partner = searchResults.find(u => u.id === partnerId);
      openChat({ type: 'dm', id: data.conversation.id, data: partner });
      setSearchQuery('');
      setSearchResults([]);
      setTab('dms');
    } catch (err) {
      toast.error('Failed to start conversation');
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/chatrooms', { name: newRoomName, description: newRoomDesc });
      await loadChatrooms();
      setShowNewRoom(false);
      setNewRoomName('');
      setNewRoomDesc('');
      toast.success('Chatroom created! 🎉');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create chatroom');
    }
  };

  return (
    <div className="w-72 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="font-bold text-foreground">ChatPulse</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} title={connected ? 'Connected' : 'Disconnected'} />
        </div>
      </div>

      {/* Tabs Container - Now wraps both List and Content */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <div className="p-3 shrink-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dms" className="text-xs">DMs</TabsTrigger>
            <TabsTrigger value="chatrooms" className="text-xs">Rooms</TabsTrigger>
          </TabsList>
        </div>

        {/* Chatrooms Tab Content */}
        <TabsContent value="chatrooms" className="flex-1 overflow-y-auto px-2 mt-0 focus-visible:outline-none">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channels</span>
            <Button 
              size="icon"
              variant="ghost"
              onClick={() => setShowNewRoom(!showNewRoom)}
              className="h-5 w-5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </div>

          {showNewRoom && (
            <form onSubmit={createRoom} className="mb-2 p-3 bg-muted rounded-lg space-y-2 mx-1">
              <Input 
                size="sm" 
                placeholder="Room name" 
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)} 
                required 
                className="text-sm h-9"
              />
              <Input 
                size="sm" 
                placeholder="Description (optional)"
                value={newRoomDesc} 
                onChange={e => setNewRoomDesc(e.target.value)} 
                className="text-sm h-9"
              />
              <div className="flex gap-2">
                <Button type="submit" variant="default" size="sm" className="flex-1 h-8 text-xs">Create</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewRoom(false)} className="h-8 text-xs">Cancel</Button>
              </div>
            </form>
          )}

          {chatrooms.map(room => (
            <button key={room.id} onClick={() => openChat({ type: 'chatroom', id: room.id, data: room })}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md mb-0.5 transition-colors text-left
                ${activeChat?.id === room.id ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <span className="text-lg">#</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{room.name}</p>
                {room.description && <p className="text-xs text-muted-foreground truncate">{room.description}</p>}
              </div>
              <Badge variant="outline" className="text-xs">{room.member_count}</Badge>
            </button>
          ))}
        </TabsContent>

        {/* DMs Tab Content */}
        <TabsContent value="dms" className="flex-1 overflow-y-auto px-2 mt-0 focus-visible:outline-none">
          <div className="px-2 mb-2">
            <div className="relative">
              <Input 
                className="text-sm pr-8 h-9" 
                placeholder="Find or start a DM..."
                value={searchQuery} 
                onChange={e => handleSearch(e.target.value)} 
              />
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground px-2 mb-1">Search results</p>
              {searchResults.map(u => (
                <button key={u.id} onClick={() => startDM(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-md text-left">
                  <Avatar username={u.username} avatarUrl={u.avatar_url} size="sm"
                    showOnline isOnline={onlineUsers.has(u.id) || u.is_online} />
                  <span className="text-sm text-foreground">{u.username}</span>
                </button>
              ))}
            </div>
          )}

          {conversations.map(conv => (
            <button key={conv.id} onClick={() => openChat({ type: 'dm', id: conv.id, data: conv })}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md mb-0.5 transition-colors text-left
                ${activeChat?.id === conv.id ? 'bg-primary/20 text-foreground' : 'hover:bg-muted'}`}>
              <Avatar username={conv.partner_username} avatarUrl={conv.partner_avatar} size="sm"
                showOnline isOnline={onlineUsers.has(conv.partner_id) || conv.partner_online} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{conv.partner_username}</p>
                {conv.last_message && (
                  <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                )}
              </div>
            </button>
          ))}

          {conversations.length === 0 && searchQuery.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-8 text-center">
              Search for a user above to start a DM
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* User footer */}
      <div className="p-3 border-t border-border flex items-center gap-3 shrink-0">
        <Avatar username={user?.username} avatarUrl={user?.avatar_url} size="sm"
          showOnline isOnline />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{user?.username}</p>
          <p className="text-xs text-green-400">Online</p>
        </div>
        <Button 
          onClick={logout} 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          title="Logout">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
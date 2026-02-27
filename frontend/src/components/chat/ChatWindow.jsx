import { useEffect, useRef, useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import Avatar  from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ScrollArea } from '../ui/scroll-area';

export default function ChatWindow() {
  const { activeChat, messages, typingUsers, members, onlineUsers, pendingMessage,
          confirmSensitiveMessage, cancelSensitiveMessage } = useChat();
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground">Welcome to ChatPulse</h3>
          <p className="text-muted-foreground mt-1">Select a channel or DM to start chatting</p>
        </div>
      </div>
    );
  }

  const isRoom = activeChat.type === 'chatroom';
  const chatName = isRoom ? activeChat.data?.name : activeChat.data?.partner_username;
  const chatDesc = isRoom ? activeChat.data?.description : null;
  const typingNames = Object.values(typingUsers).filter(n => n !== user?.username);

  // Group consecutive messages from same sender
  const groupedMessages = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const showAvatar = !prev || prev.sender_id !== msg.sender_id ||
      (new Date(msg.created_at) - new Date(prev.created_at)) > 5 * 60 * 1000;
    return { ...msg, showAvatar };
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          {isRoom ? (
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <span className="text-primary font-bold">#</span>
            </div>
          ) : (
            <Avatar username={chatName} avatarUrl={activeChat.data?.partner_avatar} size="sm"
              showOnline isOnline={onlineUsers.has(activeChat.data?.partner_id) || activeChat.data?.partner_online} />
          )}
          <div>
            <h2 className="font-semibold text-foreground">{chatName}</h2>
            {chatDesc && <p className="text-xs text-muted-foreground">{chatDesc}</p>}
            {!isRoom && (
              <p className="text-xs text-muted-foreground">
                {onlineUsers.has(activeChat.data?.partner_id) ? 'Online' : 'Offline'}
              </p>
            )}
          </div>
        </div>

        {isRoom && (
          <Button 
            onClick={() => setShowMembers(!showMembers)}
            variant={showMembers ? "default" : "ghost"}
            size="sm"
            className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {members.length}
          </Button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 bg-background">
          <div className="py-4">
            {groupedMessages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                showAvatar={msg.showAvatar}
                chatroomId={isRoom ? activeChat.id : undefined}
                conversationId={!isRoom ? activeChat.id : undefined}
              />
            ))}

            {/* Typing indicator */}
            {typingNames.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 animate-fade-in">
                <div className="w-8" />
                <div className="flex items-center gap-2 bg-muted rounded-2xl rounded-bl-sm px-4 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse-dot"
                        style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Members panel */}
        {showMembers && isRoom && (
          <ScrollArea className="w-56 bg-card border-l border-border">
            <div className="p-3 border-b border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Members — {members.length}
              </h3>
            </div>
            <div className="p-2 space-y-0.5">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted">
                  <Avatar username={m.username} avatarUrl={m.avatar_url} size="xs"
                    showOnline isOnline={onlineUsers.has(m.id) || m.is_online} />
                  <span className="text-sm text-foreground truncate">{m.username}</span>
                  {m.role === 'admin' && <span className="ml-auto text-xs text-amber-400">Admin</span>}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Sensitive message confirmation */}
      {pendingMessage && (
        <div className="mx-4 mb-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-300 mb-2">
            ⚠️ This message might contain sensitive info (OTP, password, card number). Send to group anyway?
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={confirmSensitiveMessage} 
              variant="default"
              size="sm" 
              className="bg-amber-600 hover:bg-amber-700 text-xs h-8">
              Yes, send it
            </Button>
            <Button 
              onClick={cancelSensitiveMessage} 
              variant="ghost" 
              size="sm"
              className="text-xs h-8">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <MessageInput replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
    </div>
  );
}

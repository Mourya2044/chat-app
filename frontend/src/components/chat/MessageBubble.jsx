import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar  from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

export default function MessageBubble({ message, showAvatar, chatroomId, conversationId }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const isOwn = message.sender_id === user?.id;
  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true });

  const handleDelete = () => {
    socket?.emit('message:delete', { messageId: message.id, chatroomId, conversationId });
  };

  const handleEdit = () => {
    if (editText.trim() && editText !== message.content) {
      socket?.emit('message:edit', { messageId: message.id, content: editText.trim(), chatroomId, conversationId });
    }
    setEditing(false);
  };

  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{message.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 group px-4 py-1 hover:bg-surface-800/30 ${isOwn ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>

      {/* Avatar */}
      <div className="w-8 flex-shrink-0 mt-1">
        {showAvatar && !isOwn && (
          <Avatar username={message.sender_username} avatarUrl={message.sender_avatar} size="sm" />
        )}
      </div>

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
        {/* Sender name */}
        {showAvatar && !isOwn && (
          <span className="text-xs font-semibold text-primary mb-1">{message.sender_username}</span>
        )}

        {/* Reply context */}
        {message.reply_content && (
          <div className={`mb-1 px-3 py-1 rounded-md border-l-2 border-primary bg-muted/50 text-xs text-muted-foreground max-w-xs`}>
            <span className="font-medium text-primary">{message.reply_sender}: </span>
            {message.reply_content.slice(0, 80)}{message.reply_content.length > 80 ? '...' : ''}
          </div>
        )}

        {/* Message content */}
        {editing ? (
          <div className="flex gap-2 items-end w-full max-w-sm">
            <Input 
              value={editText} 
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setEditing(false); }}
              className="text-sm flex-1 h-9" 
              autoFocus 
            />
            <Button onClick={handleEdit} variant="default" size="sm" className="h-8 text-xs">Save</Button>
            <Button onClick={() => setEditing(false)} variant="ghost" size="sm" className="h-8 text-xs">Cancel</Button>
          </div>
        ) : (
          <div className={`relative ${isOwn ? 'message-bubble-own' : 'message-bubble-other'}`}>
            {message.is_deleted ? (
              <span className="italic text-muted-foreground text-sm">Message deleted</span>
            ) : message.message_type === 'image' ? (
              <img src={message.file_url} alt={message.file_name || 'Image'}
                className="max-w-xs rounded-lg cursor-pointer"
                onClick={() => window.open(message.file_url, '_blank')} />
            ) : message.message_type === 'video' ? (
              <video src={message.file_url} controls className="max-w-xs rounded-lg" />
            ) : message.message_type === 'file' ? (
              <a href={message.file_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm hover:underline">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {message.file_name || 'Download file'}
              </a>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}

            {/* Sensitive flag */}
            {message.flagged_sensitive && (
              <span className="absolute -top-1 -right-1 text-xs">⚠️</span>
            )}
          </div>
        )}

        {/* Timestamp & edited */}
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {message.is_edited && <span className="text-xs text-muted-foreground">(edited)</span>}
        </div>
      </div>

      {/* Action buttons */}
      {showActions && !message.is_deleted && !editing && (
        <div className={`flex items-start gap-1 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          {isOwn && message.message_type === 'text' && (
            <Button 
              onClick={() => setEditing(true)}
              variant="ghost"
              size="icon"
              className="h-6 w-6">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Button>
          )}
          {isOwn && (
            <Button 
              onClick={handleDelete}
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-red-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

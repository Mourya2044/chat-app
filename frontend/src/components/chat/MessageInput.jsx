import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useChat } from '../../contexts/ChatContext';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

export default function MessageInput({ onReply, replyTo, onCancelReply }) {
  const { sendMessage, emitTyping, activeChat } = useChat();
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const typingRef = useRef(false);
  const typingTimer = useRef(null);

  const handleTyping = () => {
    if (!typingRef.current) {
      typingRef.current = true;
      emitTyping(true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingRef.current = false;
      emitTyping(false);
    }, 1500);
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    sendMessage({
      content: trimmed,
      messageType: 'text',
      replyToId: replyTo?.id,
    });

    setText('');
    emitTyping(false);
    typingRef.current = false;
    clearTimeout(typingTimer.current);
    if (onCancelReply) onCancelReply();
  }, [text, sendMessage, emitTyping, replyTo, onCancelReply]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      sendMessage({
        content: null,
        messageType: data.messageType,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (!activeChat) return null;

  return (
    <div className="p-4 border-t border-border bg-card">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-muted rounded-md border-l-2 border-primary">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-primary">{replyTo.sender_username}</span>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <Button 
            onClick={onCancelReply} 
            variant="ghost"
            size="icon"
            className="h-6 w-6">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File upload */}
        <Button 
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0">
          {uploading ? (
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </Button>
        <input ref={fileRef} type="file" className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileUpload} />

        {/* Text input */}
        <Textarea
          className="flex-1 max-h-32 resize-none"
          placeholder={`Message ${activeChat.type === 'chatroom' ? '#' + activeChat.data?.name : activeChat.data?.partner_username}...`}
          value={text}
          onChange={e => { setText(e.target.value); handleTyping(); }}
          onKeyDown={handleKeyDown}
          rows={1}
          style={{ height: 'auto', minHeight: '42px' }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
          }}
        />

        {/* Send button */}
        <Button 
          onClick={handleSend} 
          disabled={!text.trim()}
          variant="default"
          size="icon"
          className="h-10 w-10 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

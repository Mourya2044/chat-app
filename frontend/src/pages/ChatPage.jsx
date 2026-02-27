import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';

export default function ChatPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}

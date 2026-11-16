import ChatEntrance from '@/components/ChatEntrance';

export default function ChatTemplate({ children }: { children: React.ReactNode }) {
  return <ChatEntrance>{children}</ChatEntrance>;
}

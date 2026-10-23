import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatRoom } from "@/components/chat-room";
import { SetupNotice } from "@/components/setup-notice";

type ChatPageProps = { params: Promise<{ matchId: string }> };

export default async function ChatPage({ params }: ChatPageProps) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <section className="chat-wrap"><SetupNotice /></section>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { matchId } = await params;
  return <div className="chat-wrap"><ChatRoom matchId={matchId} userId={user.id} /></div>;
}

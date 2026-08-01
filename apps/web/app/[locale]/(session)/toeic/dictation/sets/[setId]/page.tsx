import { ToeicDictationSessionView } from "@/app/views/toeic-listening/ToeicDictationSessionView";

type Props = { params: Promise<{ setId: string }> };

export default async function ToeicDictationSessionPage({ params }: Props) {
  const { setId } = await params;
  return <ToeicDictationSessionView setId={Number(setId)} />;
}
